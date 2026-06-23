'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Search } from 'lucide-react'
import { toast } from 'sonner'

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  cnpj: z.string().optional(),
  type_of_service: z.string().min(2, 'Tipo de serviço obrigatório'),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'blocked']),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface Props { provider?: any | null; onClose: () => void; onSuccess: () => void }

export function ProviderModal({ provider, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [searchingCnpj, setSearchingCnpj] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: provider?.name ?? '',
      cnpj: provider?.cnpj ?? '',
      type_of_service: provider?.type_of_service ?? '',
      phone: provider?.phone ?? '',
      email: provider?.email ?? '',
      status: provider?.status ?? 'active',
      notes: provider?.notes ?? '',
    },
  })

  const cnpj = watch('cnpj')

  async function searchCnpj() {
    if (!cnpj) return
    const clean = cnpj.replace(/\D/g, '')
    if (clean.length !== 14) { toast.error('CNPJ inválido'); return }

    setSearchingCnpj(true)
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`)
      if (!res.ok) { toast.error('CNPJ não encontrado'); return }
      const data = await res.json()
      setValue('name', data.razao_social ?? '')
      setValue('phone', data.ddd_telefone_1 ? `(${data.ddd_telefone_1}) ${data.telefone_1}` : '')
      setValue('email', data.email ?? '')
      toast.success('Dados preenchidos pela Receita Federal')
    } catch {
      toast.error('Erro ao consultar CNPJ')
    } finally {
      setSearchingCnpj(false)
    }
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const updateFields = {
      name: data.name,
      cnpj: data.cnpj || null,
      type_of_service: data.type_of_service,
      phone: data.phone || null,
      email: data.email || null,
      status: data.status,
      notes: data.notes || null,
    }

    if (provider) {
      const { error } = await supabase.from('service_providers').update(updateFields).eq('id', provider.id)
      if (error) { toast.error('Erro ao atualizar'); setLoading(false); return }
      toast.success('Prestador atualizado!')
    } else {
      const { error } = await supabase.from('service_providers').insert({ ...updateFields, owner_id: user!.id })
      if (error) { toast.error('Erro ao cadastrar'); setLoading(false); return }
      toast.success('Prestador cadastrado!')
    }
    onSuccess()
  }

  const inputClass = "w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition"
  const labelClass = "block text-xs font-medium text-slate-400 mb-1.5"

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="font-semibold text-white">{provider ? 'Editar Prestador' : 'Novo Prestador'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className={labelClass}>CNPJ</label>
            <div className="flex gap-2">
              <input {...register('cnpj')} placeholder="00.000.000/0001-00" className={inputClass} />
              <button
                type="button"
                onClick={searchCnpj}
                disabled={searchingCnpj}
                className="px-3 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition shrink-0"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">Clique na lupa para buscar dados na Receita Federal</p>
          </div>

          <div>
            <label className={labelClass}>Nome / Razão Social *</label>
            <input {...register('name')} placeholder="Empresa de Limpeza LTDA" className={inputClass} />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Tipo de Serviço *</label>
            <input {...register('type_of_service')} placeholder="Limpeza, Segurança, Manutenção..." className={inputClass} />
            {errors.type_of_service && <p className="text-red-400 text-xs mt-1">{errors.type_of_service.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Telefone</label>
              <input {...register('phone')} placeholder="(11) 99999-0000" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>E-mail</label>
              <input {...register('email')} type="email" placeholder="email@empresa.com" className={inputClass} />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <select {...register('status')} className={`${inputClass} appearance-none`}>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="blocked">Bloqueado</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Observações</label>
            <textarea {...register('notes')} rows={2} className={`${inputClass} resize-none`} placeholder="Notas adicionais..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-sm transition">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-medium rounded-lg text-sm transition">
              {loading ? 'Salvando...' : provider ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
