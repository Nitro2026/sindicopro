import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Building2, MapPin, Hash, ArrowLeft, DollarSign,
  Wrench, Users, ShieldCheck, FileText, Edit
} from 'lucide-react'

export default async function CondominioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: condo }, { data: accounts }, { data: providers }, { data: collaborators }] = await Promise.all([
    supabase.from('condominiums').select('*').eq('id', id).single(),
    supabase.from('accounts').select('id, status, amount').eq('condo_id', id),
    supabase.from('provider_contracts').select('id, status').eq('condo_id', id),
    supabase.from('user_condominiums').select('id').eq('condo_id', id).not('accepted_at', 'is', null),
  ])

  if (!condo) notFound()

  const totalPending = accounts?.filter(a => a.status === 'pending').reduce((s, a) => s + Number(a.amount), 0) ?? 0
  const totalOverdue = accounts?.filter(a => a.status === 'overdue').reduce((s, a) => s + Number(a.amount), 0) ?? 0
  const totalPaid = accounts?.filter(a => a.status === 'paid').reduce((s, a) => s + Number(a.amount), 0) ?? 0
  const activeContracts = providers?.filter(p => p.status === 'active').length ?? 0

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const stats = [
    { label: 'A Pagar', value: formatCurrency(totalPending), color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: DollarSign },
    { label: 'Vencido', value: formatCurrency(totalOverdue), color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: DollarSign },
    { label: 'Pago (total)', value: formatCurrency(totalPaid), color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', icon: DollarSign },
    { label: 'Contratos Ativos', value: String(activeContracts), color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: FileText },
    { label: 'Colaboradores', value: String(collaborators?.length ?? 0), color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', icon: Users },
  ]

  const quickLinks = [
    { href: `/dashboard/financeiro`, icon: DollarSign, label: 'Financeiro', desc: 'Contas a pagar e pagas' },
    { href: `/dashboard/prestadores`, icon: Wrench, label: 'Prestadores', desc: 'Contratos e fornecedores' },
    { href: `/dashboard/colaboradores`, icon: Users, label: 'Colaboradores', desc: 'Equipe e permissões' },
    { href: `/dashboard/auditoria`, icon: ShieldCheck, label: 'Auditoria', desc: 'Trilha de ações' },
    { href: `/dashboard/relatorios`, icon: FileText, label: 'Relatórios', desc: 'Gráficos e exportação' },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/condominios" className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{condo.name}</h1>
          <p className="text-slate-400 text-sm mt-0.5">Visão geral do condomínio</p>
        </div>
        <Link
          href={`/dashboard/condominios/${id}/editar`}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm rounded-lg transition shrink-0"
        >
          <Edit className="w-4 h-4" />
          <span className="hidden sm:inline">Editar</span>
        </Link>
      </div>

      {/* Dados do condomínio */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <h2 className="text-lg font-semibold text-white">{condo.name}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${
                condo.active
                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                  : 'bg-slate-700 text-slate-400 border-slate-600'
              }`}>
                {condo.active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm text-slate-400">
              {(condo.address || condo.city) && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {[condo.address, condo.city, condo.state].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 shrink-0" />
                <span>{condo.units_count} unidades</span>
              </div>
              {condo.cnpj && (
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-slate-800 px-2 py-0.5 rounded font-mono border border-slate-700">{condo.cnpj}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {stats.map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg}`}>
            <Icon className={`w-4 h-4 ${color} mb-2`} />
            <p className="text-slate-400 text-xs">{label}</p>
            <p className={`font-bold mt-0.5 text-sm ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Atalhos para módulos */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3">Módulos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickLinks.map(({ href, icon: Icon, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-blue-500/40 hover:bg-slate-800/60 transition group"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-800 group-hover:bg-blue-600/20 border border-slate-700 group-hover:border-blue-500/30 flex items-center justify-center shrink-0 transition">
                <Icon className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
