'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const PROFILE_DEFAULTS: Record<string, Record<string, Record<string, boolean>>> = {
  financial: {
    financial: { view: true, create: true, edit: true, delete: false },
    providers: { view: true, create: false, edit: false, delete: false },
    reports: { view: true, create: false, edit: false, delete: false },
    audit: { view: false, create: false, edit: false, delete: false },
    collaborators: { view: false, create: false, edit: false, delete: false },
    condominiums: { view: true, create: false, edit: false, delete: false },
  },
  councilor: {
    financial: { view: true, create: false, edit: false, delete: false },
    providers: { view: true, create: false, edit: false, delete: false },
    reports: { view: true, create: false, edit: false, delete: false },
    audit: { view: true, create: false, edit: false, delete: false },
    collaborators: { view: false, create: false, edit: false, delete: false },
    condominiums: { view: true, create: false, edit: false, delete: false },
  },
  janitor: {
    financial: { view: false, create: false, edit: false, delete: false },
    providers: { view: true, create: false, edit: false, delete: false },
    reports: { view: false, create: false, edit: false, delete: false },
    audit: { view: false, create: false, edit: false, delete: false },
    collaborators: { view: false, create: false, edit: false, delete: false },
    condominiums: { view: true, create: false, edit: false, delete: false },
  },
  concierge: {
    financial: { view: false, create: false, edit: false, delete: false },
    providers: { view: true, create: false, edit: false, delete: false },
    reports: { view: false, create: false, edit: false, delete: false },
    audit: { view: false, create: false, edit: false, delete: false },
    collaborators: { view: false, create: false, edit: false, delete: false },
    condominiums: { view: false, create: false, edit: false, delete: false },
  },
  custom: {
    financial: { view: false, create: false, edit: false, delete: false },
    providers: { view: false, create: false, edit: false, delete: false },
    reports: { view: false, create: false, edit: false, delete: false },
    audit: { view: false, create: false, edit: false, delete: false },
    collaborators: { view: false, create: false, edit: false, delete: false },
    condominiums: { view: false, create: false, edit: false, delete: false },
  },
}

const MODULE_LABELS: Record<string, string> = {
  financial: 'Financeiro', providers: 'Prestadores',
  collaborators: 'Colaboradores', audit: 'Auditoria',
  reports: 'Relatórios', condominiums: 'Condomínios',
}

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  profile_type: z.enum(['financial', 'councilor', 'janitor', 'concierge', 'custom']),
})
type FormData = z.infer<typeof schema>

interface Props { condoId: string; onClose: () => void; onSuccess: () => void }

export function InviteModal({ condoId, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [perms, setPerms] = useState(PROFILE_DEFAULTS.financial)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { profile_type: 'financial' },
  })

  const profileType = watch('profile_type')

  function handleProfileChange(type: string) {
    setValue('profile_type', type as any)
    setPerms(PROFILE_DEFAULTS[type] ?? PROFILE_DEFAULTS.custom)
  }

  function togglePerm(module: string, action: string, value: boolean) {
    setPerms(prev => ({ ...prev, [module]: { ...prev[module], [action]: value } }))
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { error } = await supabase.from('invitations').insert({
      condo_id: condoId,
      email: data.email,
      profile_type: data.profile_type,
      permissions: perms,
      token,
      invited_by: user!.id,
      expires_at: expiresAt,
    })

    if (error) { toast.error('Erro ao criar convite'); setLoading(false); return }

    const inviteLink = `${window.location.origin}/invite/${token}`
    await navigator.clipboard.writeText(inviteLink).catch(() => {})
    toast.success('Convite criado! Link copiado para a área de transferência.')
    onSuccess()
  }

  const inputClass = "w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition"

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="font-semibold text-white">Convidar Colaborador</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">E-mail do colaborador *</label>
            <input {...register('email')} type="email" placeholder="colaborador@email.com" className={inputClass} />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Perfil de acesso</label>
            <div className="grid grid-cols-5 gap-2">
              {[['financial', 'Financeiro'], ['councilor', 'Conselheiro'], ['janitor', 'Zelador'], ['concierge', 'Portaria'], ['custom', 'Custom']].map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleProfileChange(v)}
                  className={`py-2 rounded-lg text-xs font-medium transition ${
                    profileType === v ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">Permissões detalhadas</p>
            <div className="space-y-1.5">
              {Object.entries(MODULE_LABELS).map(([module, label]) => (
                <div key={module} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-slate-800/50">
                  <span className="text-xs text-slate-300 w-24 shrink-0">{label}</span>
                  <div className="flex items-center gap-3">
                    {['view', 'create', 'edit', 'delete'].map((action) => (
                      <label key={action} className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={perms[module]?.[action] ?? false}
                          onChange={(e) => togglePerm(module, action, e.target.checked)}
                          className="w-3 h-3 accent-blue-500"
                        />
                        <span className="text-xs text-slate-500 capitalize">{action === 'view' ? 'Ver' : action === 'create' ? 'Criar' : action === 'edit' ? 'Editar' : 'Excluir'}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-sm transition">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-medium rounded-lg text-sm transition">
              {loading ? 'Criando...' : 'Gerar Link de Convite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
