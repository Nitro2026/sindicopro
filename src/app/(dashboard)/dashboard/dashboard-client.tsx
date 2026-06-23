'use client'

import Link from 'next/link'
import { Building2, DollarSign, AlertTriangle, FileWarning, TrendingUp, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Props {
  condos: any[]
  pendingAccounts: any[]
  expiringContracts: any[]
  userId: string
}

function KPICard({ title, value, sub, icon: Icon, color }: {
  title: string; value: string | number; sub?: string; icon: any; color: string
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  )
}

export function DashboardClient({ condos, pendingAccounts, expiringContracts }: Props) {
  const overdueAccounts = pendingAccounts.filter(a => a.status === 'overdue')
  const totalPendingValue = pendingAccounts.reduce((sum, a) => sum + Number(a.amount), 0)

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const formatDate = (d: string) => format(new Date(d + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5 hidden sm:block">Visão consolidada de todos os condomínios</p>
        </div>
        <Link
          href="/dashboard/condominios/novo"
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Condomínio</span>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          title="Condomínios"
          value={condos.length}
          sub="ativos"
          icon={Building2}
          color="bg-blue-600"
        />
        <KPICard
          title="Contas Pendentes"
          value={pendingAccounts.length}
          sub={formatCurrency(totalPendingValue)}
          icon={DollarSign}
          color="bg-amber-500"
        />
        <KPICard
          title="Contas Vencidas"
          value={overdueAccounts.length}
          sub="requerem atenção"
          icon={AlertTriangle}
          color="bg-red-500"
        />
        <KPICard
          title="Contratos Vencendo"
          value={expiringContracts.length}
          sub="próximos 30 dias"
          icon={FileWarning}
          color="bg-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Condomínios */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-slate-800">
            <h2 className="font-semibold text-white text-sm">Seus Condomínios</h2>
            <Link href="/dashboard/condominios" className="text-xs text-blue-400 hover:text-blue-300">Ver todos</Link>
          </div>
          <div className="divide-y divide-slate-800">
            {condos.length === 0 ? (
              <div className="p-8 text-center">
                <Building2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Nenhum condomínio cadastrado</p>
                <Link href="/dashboard/condominios/novo" className="text-blue-400 text-sm hover:text-blue-300 mt-1 inline-block">
                  Adicionar condomínio
                </Link>
              </div>
            ) : condos.slice(0, 6).map((condo) => (
              <Link
                key={condo.id}
                href={`/dashboard/condominios/${condo.id}`}
                className="flex items-center gap-3 p-4 hover:bg-slate-800/50 transition"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{condo.name}</p>
                  <p className="text-xs text-slate-500">{condo.units_count} unidades · {condo.city || 'Cidade não informada'}</p>
                </div>
                <TrendingUp className="w-4 h-4 text-slate-600" />
              </Link>
            ))}
          </div>
        </div>

        {/* Alertas */}
        <div className="space-y-4">
          {/* Contas vencidas */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <h2 className="font-semibold text-white text-sm">Contas Vencidas</h2>
              </div>
              <Link href="/dashboard/financeiro" className="text-xs text-blue-400 hover:text-blue-300">Ver todas</Link>
            </div>
            <div className="divide-y divide-slate-800 max-h-48 overflow-y-auto">
              {overdueAccounts.length === 0 ? (
                <p className="p-4 text-slate-500 text-sm text-center">Nenhuma conta vencida</p>
              ) : overdueAccounts.slice(0, 5).map((acc) => (
                <div key={acc.id} className="flex items-center justify-between p-3">
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{acc.description}</p>
                    <p className="text-xs text-slate-500">{acc.condominiums?.name} · Venc. {formatDate(acc.due_date)}</p>
                  </div>
                  <span className="text-sm font-medium text-red-400 shrink-0 ml-2">
                    {formatCurrency(Number(acc.amount))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Contratos a vencer */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileWarning className="w-4 h-4 text-amber-400" />
                <h2 className="font-semibold text-white text-sm">Contratos Vencendo em 30 dias</h2>
              </div>
            </div>
            <div className="divide-y divide-slate-800 max-h-48 overflow-y-auto">
              {expiringContracts.length === 0 ? (
                <p className="p-4 text-slate-500 text-sm text-center">Nenhum contrato vencendo</p>
              ) : expiringContracts.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3">
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{c.service_providers?.name}</p>
                    <p className="text-xs text-slate-500">{c.condominiums?.name} · Venc. {formatDate(c.end_date)}</p>
                  </div>
                  <span className="text-sm font-medium text-amber-400 shrink-0 ml-2">
                    {formatCurrency(Number(c.value))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
