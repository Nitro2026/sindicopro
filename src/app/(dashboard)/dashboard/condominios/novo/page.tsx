'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const schema = z.object({
  name: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
  cnpj: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  units_count: z.number().min(1, 'Informe ao menos 1 unidade'),
})

type FormData = z.infer<typeof schema>

export default function NovoCondominioPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { units_count: 1 },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast.error('Usuário não autenticado')
      setLoading(false)
      return
    }

    // Garante que o perfil existe (caso o trigger não tenha criado automaticamente)
    await supabase.from('profiles').upsert({
      id: user.id,
      full_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Síndico',
      email: user.email ?? '',
      role: 'owner',
    }, { onConflict: 'id', ignoreDuplicates: true })

    const { data: condo, error } = await supabase
      .from('condominiums')
      .insert({
        owner_id: user.id,
        name: data.name,
        cnpj: data.cnpj || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        units_count: data.units_count,
      })
      .select()
      .single()

    if (error) {
      toast.error(`Erro: ${error.message}`)
      setLoading(false)
      return
    }

    // Cria categorias padrão (ignora erro silenciosamente se função não existir)
    try {
      await supabase.rpc('create_default_categories', { p_condo_id: condo.id })
    } catch {
      // função pode não existir ainda
    }

    toast.success('Condomínio criado com sucesso!')
    router.push('/dashboard/condominios')
    router.refresh()
  }

  const inputClass = "w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition"
  const labelClass = "block text-sm font-medium text-slate-300 mb-1.5"

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/condominios" className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Novo Condomínio</h1>
          <p className="text-slate-400 text-sm">Preencha os dados do condomínio</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 space-y-5">
        <div>
          <label className={labelClass}>Nome do Condomínio *</label>
          <input {...register('name')} placeholder="Condomínio Residencial..." className={inputClass} />
          {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>CNPJ</label>
            <input {...register('cnpj')} placeholder="00.000.000/0001-00" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Nº de Unidades *</label>
            <input {...register('units_count', { valueAsNumber: true })} type="number" min={1} className={inputClass} />
            {errors.units_count && <p className="text-red-400 text-xs mt-1">{errors.units_count.message}</p>}
          </div>
        </div>

        <div>
          <label className={labelClass}>Endereço</label>
          <input {...register('address')} placeholder="Rua, número, bairro" className={inputClass} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Cidade</label>
            <input {...register('city')} placeholder="São Paulo" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Estado</label>
            <input {...register('state')} placeholder="SP" maxLength={2} className={inputClass} />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link href="/dashboard/condominios" className="flex-1 text-center py-2.5 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-sm transition">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-medium rounded-lg text-sm transition"
          >
            {loading ? 'Criando...' : 'Criar Condomínio'}
          </button>
        </div>
      </form>
    </div>
  )
}
