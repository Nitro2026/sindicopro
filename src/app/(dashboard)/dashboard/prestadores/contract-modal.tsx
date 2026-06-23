'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { toast } from 'sonner'

const schema = z.object({
  description: z.string().min(2, 'Descrição obrigatória'),
  start_date: z.string().min(1, 'Data de início obrigatória'),
  end_date: z.string().optional(),
  value: z.number().positive('Valor deve ser positivo'),
  readjustment_index: z.string().optional(),
  // Mantém como string para evitar problema de coerção no zodResolver
  readjustment_month: z.string().optional(),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface Props {
  providerId: string
  providerName: string
  condoId: string
  onClose: () => void
  onSuccess: () => void
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export function ContractModal({ providerId, providerName, condoId, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.from('provider_contracts').insert({
      provider_id: providerId,
      condo_id: condoId,
      description: data.description,
      start_date: data.start_date,
      end_date: data.end_date || null,
      value: data.value,
      readjustment_index: data.readjustment_index || null,
      // Converte string para número aqui, em vez de no schema
      readjustment_month: data.readjustment_month ? parseInt(data.readjustment_month) : null,
      notes: data.notes || null,
      status: 'active',
    })

    if (error) {
      toast.error(`Erro ao criar contrato: ${error.message}`)
      setLoading(false)
      return
    }
    toast.success('Contrato criado!')
    onSuccess()
  }

  const inputClass = "w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition"
  const labelClass = "block text-xs font-medium text-slate-400 mb-1.5"

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="font-semibold text-white">Novo Contrato</h2>
            <p className="text-slate-400 text-xs mt-0.5">{providerName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className={labelClass}>Descrição do Contrato *</label>
            <input {...register('description')} placeholder="Ex: Contrato de limpeza mensal" className={inputClass} />
            {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Início *</label>
              <input {...register('start_date')} type="date" className={inputClass} />
              {errors.start_date && <p className="text-red-400 text-xs mt-1">{errors.start_date.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Término</label>
              <input {...register('end_date')} type="date" className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Valor Mensal (R$) *</label>
            <input
              {...register('value', { valueAsNumber: true })}
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              className={inputClass}
            />
            {errors.value && <p className="text-red-400 text-xs mt-1">{errors.value.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Índice de Reajuste</label>
              <input {...register('readjustment_index')} placeholder="IGPM, IPCA..." className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Mês do Reajuste</label>
              <select {...register('readjustment_month')} className={`${inputClass} appearance-none`}>
                <option value="">Nenhum</option>
                {MONTHS.map((m, i) => (
                  <option key={i} value={String(i + 1)}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Observações</label>
            <textarea {...register('notes')} rows={2} className={`${inputClass} resize-none`} />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-sm transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-medium rounded-lg text-sm transition"
            >
              {loading ? 'Criando...' : 'Criar Contrato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
