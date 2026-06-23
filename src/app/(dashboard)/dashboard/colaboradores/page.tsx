'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import { Users, Plus, Shield, Trash2, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { InviteModal } from './invite-modal'

const PROFILE_LABELS: Record<string, string> = {
  financial: 'Financeiro',
  councilor: 'Conselheiro',
  janitor: 'Zelador',
  concierge: 'Portaria',
  custom: 'Personalizado',
}

const MODULE_LABELS: Record<string, string> = {
  financial: 'Financeiro',
  providers: 'Prestadores',
  collaborators: 'Colaboradores',
  audit: 'Auditoria',
  reports: 'Relatórios',
  condominiums: 'Condomínios',
}

export default function ColaboradoresPage() {
  const { selectedCondo } = useAppStore()
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<Record<string, any[]>>({})

  const loadCollaborators = useCallback(async () => {
    if (!selectedCondo) return
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('user_condominiums')
      .select('*, profiles(full_name, email, avatar_url)')
      .eq('condo_id', selectedCondo.id)
      .not('accepted_at', 'is', null)
    setCollaborators(data ?? [])
    setLoading(false)
  }, [selectedCondo])

  useEffect(() => { loadCollaborators() }, [loadCollaborators])

  async function loadPermissions(userId: string) {
    if (!selectedCondo) return
    const supabase = createClient()
    const { data } = await supabase
      .from('permissions')
      .select('*')
      .eq('user_id', userId)
      .eq('condo_id', selectedCondo.id)
    setPermissions(prev => ({ ...prev, [userId]: data ?? [] }))
    setExpandedUser(userId)
  }

  async function togglePermission(userId: string, module: string, action: 'can_view' | 'can_create' | 'can_edit' | 'can_delete', value: boolean) {
    if (!selectedCondo) return
    const supabase = createClient()
    const existing = permissions[userId]?.find((p: any) => p.module === module)

    const updatePayload: Record<'can_view' | 'can_create' | 'can_edit' | 'can_delete', boolean> = {
      can_view: existing?.can_view ?? false,
      can_create: existing?.can_create ?? false,
      can_edit: existing?.can_edit ?? false,
      can_delete: existing?.can_delete ?? false,
    }
    updatePayload[action] = value

    if (existing) {
      await supabase.from('permissions').update(updatePayload).eq('id', existing.id)
    } else {
      await supabase.from('permissions').insert({
        user_id: userId,
        condo_id: selectedCondo.id,
        module: module as 'financial' | 'providers' | 'collaborators' | 'audit' | 'reports' | 'condominiums',
        ...updatePayload,
      })
    }
    loadPermissions(userId)
  }

  async function removeCollaborator(userId: string) {
    if (!selectedCondo) return
    const supabase = createClient()
    await supabase.from('user_condominiums').delete().eq('user_id', userId).eq('condo_id', selectedCondo.id)
    await supabase.from('permissions').delete().eq('user_id', userId).eq('condo_id', selectedCondo.id)
    toast.success('Colaborador removido')
    loadCollaborators()
  }

  if (!selectedCondo) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <p className="text-slate-400">Selecione um condomínio</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Colaboradores</h1>
          <p className="text-slate-400 text-sm mt-0.5">{selectedCondo.name}</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Convidar</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : collaborators.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <Users className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">Nenhum colaborador neste condomínio</p>
          <button onClick={() => setShowInvite(true)} className="mt-3 text-blue-400 text-sm hover:text-blue-300">
            Convidar primeiro colaborador
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {collaborators.map((collab) => {
            const profile = collab.profiles
            const isExpanded = expandedUser === collab.user_id
            const userPerms = permissions[collab.user_id] ?? []

            return (
              <div key={collab.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-medium text-white">
                      {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">{profile?.full_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span className="text-xs text-slate-500">{profile?.email}</span>
                        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                          {PROFILE_LABELS[collab.profile_type]}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => isExpanded ? setExpandedUser(null) : loadPermissions(collab.user_id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      {isExpanded ? 'Fechar' : 'Permissões'}
                    </button>
                    <button
                      onClick={() => removeCollaborator(collab.user_id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-800 p-4">
                    <p className="text-xs text-slate-400 mb-3 font-medium">Permissões por módulo</p>
                    <div className="space-y-2">
                      {Object.entries(MODULE_LABELS).map(([module, label]) => {
                        const perm = userPerms.find(p => p.module === module)
                        return (
                          <div key={module} className="flex flex-col sm:flex-row sm:items-center gap-2 py-2 px-3 rounded-lg bg-slate-800/50">
                            <span className="text-sm text-slate-300 sm:w-28 shrink-0">{label}</span>
                            <div className="flex items-center flex-wrap gap-3">
                              {[
                                ['can_view', 'Ver'],
                                ['can_create', 'Criar'],
                                ['can_edit', 'Editar'],
                                ['can_delete', 'Excluir'],
                              ].map(([action, actionLabel]) => (
                                <label key={action} className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={perm?.[action] ?? false}
                                    onChange={(e) => togglePermission(collab.user_id, module, action as any, e.target.checked)}
                                    className="w-3.5 h-3.5 accent-blue-500"
                                  />
                                  <span className="text-xs text-slate-400">{actionLabel}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showInvite && selectedCondo && (
        <InviteModal
          condoId={selectedCondo.id}
          onClose={() => setShowInvite(false)}
          onSuccess={() => { setShowInvite(false); loadCollaborators() }}
        />
      )}
    </div>
  )
}
