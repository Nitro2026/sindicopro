'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function InvitePage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function acceptInvite() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push(`/login?redirect=/invite/${token}`)
        return
      }

      const { data: invite, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error || !invite) {
        setStatus('error')
        setMessage('Convite inválido ou expirado.')
        return
      }

      const { error: ucError } = await supabase.from('user_condominiums').upsert({
        user_id: user.id,
        condo_id: invite.condo_id,
        profile_type: invite.profile_type,
        invited_by: invite.invited_by,
        accepted_at: new Date().toISOString(),
      })

      if (ucError) {
        setStatus('error')
        setMessage('Erro ao aceitar convite. Tente novamente.')
        return
      }

      const perms = invite.permissions as Record<string, Record<string, boolean>>
      const validModules = ['financial', 'providers', 'collaborators', 'audit', 'reports', 'condominiums'] as const
      type Module = typeof validModules[number]

      for (const [module, actions] of Object.entries(perms)) {
        if (!validModules.includes(module as Module)) continue
        await supabase.from('permissions').upsert({
          user_id: user.id,
          condo_id: invite.condo_id,
          module: module as Module,
          can_view: actions.view ?? false,
          can_create: actions.create ?? false,
          can_edit: actions.edit ?? false,
          can_delete: actions.delete ?? false,
        })
      }

      await supabase.from('invitations').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)

      setStatus('success')
      setTimeout(() => router.push('/dashboard'), 2000)
    }

    acceptInvite()
  }, [token, router])

  return (
    <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8 shadow-xl text-center">
      {status === 'loading' && (
        <>
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-300">Processando convite...</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-white font-medium">Convite aceito!</p>
          <p className="text-slate-400 text-sm mt-1">Redirecionando para o dashboard...</p>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-red-400 font-medium">{message}</p>
        </>
      )}
    </div>
  )
}
