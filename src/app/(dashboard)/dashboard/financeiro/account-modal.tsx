'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Upload } from 'lucide-react'
import { toast } from 'sonner'
import type { Account, AccountCategory, ServiceProvider } from '@/types/database.types'

const schema = z.object({
  description: z.string().min(2, 'Descrição obrigatória'),
  amount: z.number().positive('Valor deve ser positivo'),
  due_date: z.string().min(1, 'Data de vencimento obrigatória'),
  category_id: z.string().optional(),
  provider_id: z.string().optional(),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']),
  is_recurring: z.boolean(),
  recurrence_rule: z.enum(['monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual']).optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  condoId: string
  account?: any | null
  onClose: () => void
  onSuccess: () => void
}

const RECURRENCE_LABELS = {
  monthly: 'Mensal', bimonthly: 'Bimestral', quarterly: 'Trimestral',
  semiannual: 'Semestral', annual: 'Anual',
}

export function AccountModal({ condoId, account, onClose, onSuccess }: Props) {
  const [categories, setCategories] = useState<AccountCategory[]>([])
  const [providers, setProviders] = useState<ServiceProvider[]>([])
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: account?.description ?? '',
      amount: account?.amount ?? '',
      due_date: account?.due_date ?? '',
      category_id: account?.category_id ?? '',
      provider_id: account?.provider_id ?? '',
      status: account?.status ?? 'pending',
      is_recurring: account?.is_recurring ?? false,
      recurrence_rule: account?.recurrence_rule ?? undefined,
      notes: account?.notes ?? '',
    },
  })

  const isRecurring = watch('is_recurring')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [catRes, provRes] = await Promise.all([
        supabase.from('account_categories').select('*').eq('condo_id', condoId).eq('type', 'expense').order('name'),
        supabase.from('service_providers').select('*').eq('status', 'active').order('name'),
      ])
      setCategories(catRes.data ?? [])
      setProviders(provRes.data ?? [])
    }
    load()
  }, [condoId])

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const commonFields = {
      description: data.description,
      amount: data.amount,
      due_date: data.due_date,
      status: data.status,
      is_recurring: data.is_recurring,
      category_id: data.category_id || null,
      provider_id: data.provider_id || null,
      recurrence_rule: isRecurring ? data.recurrence_rule : null,
      notes: data.notes || null,
    }

    if (account) {
      const { error } = await supabase.from('accounts').update(commonFields).eq('id', account.id)
      if (error) { toast.error('Erro ao atualizar conta'); setLoading(false); return }
      toast.success('Conta atualizada!')
    } else {
      const { error } = await supabase.from('accounts').insert({
        ...commonFields,
        condo_id: condoId,
        created_by: user!.id,
      })
      if (error) { toast.error('Erro ao criar conta'); setLoading(false); return }
      toast.success('Conta lançada!')
    }

    onSuccess()
  }

  const selectClass = "w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition appearance-none"
  const inputClass = "w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition"
  const labelClass = "block text-xs font-medium text-slate-400 mb-1.5"

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="font-semibold text-white">{account ? 'Editar Conta' : 'Nova Conta'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className={labelClass}>Descrição *</label>
            <input {...register('description')} placeholder="Ex: Conta de energia" className={inputClass} />
            {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Valor (R$) *</label>
              <input {...register('amount', { valueAsNumber: true })} type="number" step="0.01" placeholder="0,00" className={inputClass} />
              {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Vencimento *</label>
              <input {...register('due_date')} type="date" className={inputClass} />
              {errors.due_date && <p className="text-red-400 text-xs mt-1">{errors.due_date.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Categoria</label>
              <select {...register('category_id')} className={selectClass}>
                <option value="">Sem categoria</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Prestador</label>
              <select {...register('provider_id')} className={selectClass}>
                <option value="">Sem prestador</option>
                {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <select {...register('status')} className={selectClass}>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="overdue">Vencido</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <div className="flex items-center gap-3 py-1">
            <input {...register('is_recurring')} type="checkbox" id="is_recurring" className="w-4 h-4 accent-blue-500" />
            <label htmlFor="is_recurring" className="text-sm text-slate-300 cursor-pointer">Conta fixa / recorrente</label>
          </div>

          {isRecurring && (
            <div>
              <label className={labelClass}>Recorrência</label>
              <select {...register('recurrence_rule')} className={selectClass}>
                <option value="">Selecione...</option>
                {Object.entries(RECURRENCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className={labelClass}>Observações</label>
            <textarea {...register('notes')} rows={2} placeholder="Informações adicionais..." className={`${inputClass} resize-none`} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-sm transition">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-medium rounded-lg text-sm transition">
              {loading ? 'Salvando...' : account ? 'Salvar' : 'Lançar Conta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
