import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [condosRes, accountsRes, contractsRes] = await Promise.all([
    supabase.from('condominiums').select('*').eq('active', true).order('name'),
    supabase.from('accounts').select('*, condominiums(name)').in('status', ['pending', 'overdue']).order('due_date'),
    supabase.from('provider_contracts').select('*, service_providers(name), condominiums(name)')
      .eq('status', 'active')
      .not('end_date', 'is', null)
      .lte('end_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('end_date'),
  ])

  return (
    <DashboardClient
      condos={condosRes.data ?? []}
      pendingAccounts={accountsRes.data ?? []}
      expiringContracts={contractsRes.data ?? []}
      userId={user?.id ?? ''}
    />
  )
}
