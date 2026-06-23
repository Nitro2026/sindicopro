'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import {
  BarChart3, Download, TrendingDown, TrendingUp,
  PieChart as PieIcon, Calendar, FileText
} from 'lucide-react'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#8b5cf6', '#f97316', '#14b8a6', '#eab308']

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function RelatoriosPage() {
  const { selectedCondo } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(6)
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [providerData, setProviderData] = useState<any[]>([])
  const [totals, setTotals] = useState({ paid: 0, pending: 0, overdue: 0 })

  const loadData = useCallback(async () => {
    if (!selectedCondo) return
    setLoading(true)
    const supabase = createClient()

    const fromDate = format(startOfMonth(subMonths(new Date(), period - 1)), 'yyyy-MM-dd')

    const [{ data: accounts }, { data: contracts }] = await Promise.all([
      supabase
        .from('accounts')
        .select('*, account_categories(name, color), service_providers(name)')
        .eq('condo_id', selectedCondo.id)
        .gte('due_date', fromDate)
        .order('due_date'),
      supabase
        .from('provider_contracts')
        .select('*, service_providers(name)')
        .eq('condo_id', selectedCondo.id)
        .eq('status', 'active'),
    ])

    if (!accounts) { setLoading(false); return }

    // Totais gerais
    setTotals({
      paid: accounts.filter(a => a.status === 'paid').reduce((s, a) => s + Number(a.amount), 0),
      pending: accounts.filter(a => a.status === 'pending').reduce((s, a) => s + Number(a.amount), 0),
      overdue: accounts.filter(a => a.status === 'overdue').reduce((s, a) => s + Number(a.amount), 0),
    })

    // Fluxo mensal
    const monthly: Record<string, { month: string; pago: number; pendente: number; vencido: number }> = {}
    for (let i = period - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i)
      const key = format(date, 'yyyy-MM')
      monthly[key] = { month: format(date, 'MMM/yy', { locale: ptBR }), pago: 0, pendente: 0, vencido: 0 }
    }

    accounts.forEach(a => {
      const key = a.due_date.slice(0, 7)
      if (monthly[key]) {
        if (a.status === 'paid') monthly[key].pago += Number(a.amount)
        else if (a.status === 'pending') monthly[key].pendente += Number(a.amount)
        else if (a.status === 'overdue') monthly[key].vencido += Number(a.amount)
      }
    })
    setMonthlyData(Object.values(monthly))

    // Por categoria
    const catMap: Record<string, { name: string; total: number; color: string }> = {}
    accounts.forEach((a: any) => {
      const cat = a.account_categories as { name: string; color: string | null } | null
      if (cat && a.category_id) {
        const key = a.category_id as string
        if (!catMap[key]) catMap[key] = { name: cat.name, total: 0, color: cat.color ?? '#6366f1' }
        catMap[key].total += Number(a.amount)
      }
    })
    setCategoryData(Object.values(catMap).sort((a, b) => b.total - a.total))

    // Por prestador: soma contas pagas/pendentes + valor mensal dos contratos ativos
    const provMap: Record<string, { name: string; contrato: number; pago: number }> = {}

    // 1. Contratos ativos — valor mensal do contrato
    ;(contracts ?? []).forEach((c: any) => {
      const prov = c.service_providers as { name: string } | null
      if (prov && c.provider_id) {
        const key = c.provider_id as string
        if (!provMap[key]) provMap[key] = { name: prov.name, contrato: 0, pago: 0 }
        provMap[key].contrato += Number(c.value)
      }
    })

    // 2. Contas lançadas no período vinculadas ao prestador
    accounts.forEach((a: any) => {
      const prov = a.service_providers as { name: string } | null
      if (prov && a.provider_id) {
        const key = a.provider_id as string
        if (!provMap[key]) provMap[key] = { name: prov.name, contrato: 0, pago: 0 }
        if (a.status === 'paid' || a.status === 'pending') {
          provMap[key].pago += Number(a.amount)
        }
      }
    })

    setProviderData(
      Object.values(provMap)
        .map(p => ({ name: p.name, contrato: p.contrato, pago: p.pago, total: p.contrato + p.pago }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8)
    )

    setLoading(false)
  }, [selectedCondo, period])

  useEffect(() => { loadData() }, [loadData])

  async function exportBalancete() {
    if (!selectedCondo) return
    const supabase = createClient()
    const fromDate = format(startOfMonth(subMonths(new Date(), period - 1)), 'yyyy-MM-dd')
    const { data } = await supabase
      .from('accounts')
      .select('*, account_categories(name), service_providers(name)')
      .eq('condo_id', selectedCondo.id)
      .gte('due_date', fromDate)
      .order('due_date')

    if (!data) return

    const csv = [
      ['Data Vencimento', 'Descrição', 'Categoria', 'Prestador', 'Valor', 'Status', 'Data Pagamento'].join(';'),
      ...(data as any[]).map(a => [
        a.due_date,
        a.description,
        (a.account_categories as any)?.name ?? '',
        (a.service_providers as any)?.name ?? '',
        Number(a.amount).toFixed(2).replace('.', ','),
        a.status === 'paid' ? 'Pago' : a.status === 'pending' ? 'Pendente' : a.status === 'overdue' ? 'Vencido' : 'Cancelado',
        a.paid_date ?? '',
      ].join(';'))
    ].join('\n')

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `balancete-${selectedCondo.name}-${format(new Date(), 'yyyy-MM')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!selectedCondo) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <p className="text-slate-400">Selecione um condomínio</p>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs">
          <p className="text-slate-300 mb-1">{label}</p>
          {payload.map((p: any) => (
            <p key={p.name} style={{ color: p.color }}>
              {p.name}: {formatCurrency(p.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-start justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Relatórios</h1>
          <p className="text-slate-400 text-sm mt-0.5">{selectedCondo.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            {[3, 6, 12].map(m => (
              <button
                key={m}
                onClick={() => setPeriod(m)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  period === m ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
          <button
            onClick={exportBalancete}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs rounded-lg transition"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPIs do período */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Pago', value: totals.paid, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
              { label: 'A Pagar', value: totals.pending, icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
              { label: 'Vencido', value: totals.overdue, icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className={`rounded-xl border p-5 ${bg}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <p className="text-slate-400 text-sm">{label}</p>
                </div>
                <p className={`text-2xl font-bold ${color}`}>{formatCurrency(value)}</p>
              </div>
            ))}
          </div>

          {/* Gráfico de fluxo mensal */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <h2 className="font-semibold text-white text-sm">Fluxo Financeiro Mensal</h2>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Bar dataKey="pago" name="Pago" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="pendente" name="Pendente" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="vencido" name="Vencido" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Despesas por categoria — largura total, pizza + legenda lado a lado */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-6">
              <PieIcon className="w-4 h-4 text-purple-400" />
              <h2 className="font-semibold text-white text-sm">Despesas por Categoria</h2>
            </div>
            {categoryData.length === 0 ? (
              <p className="text-slate-600 text-sm text-center py-10">Sem dados de categoria</p>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-full sm:w-64 shrink-0">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={categoryData.slice(0, 8)}
                        dataKey="total"
                        nameKey="name"
                        cx="50%" cy="50%"
                        innerRadius={55} outerRadius={90}
                        paddingAngle={2}
                      >
                        {categoryData.slice(0, 8).map((entry, i) => (
                          <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} contentStyle={{ background: '#1e293b', border: '1px solid #334155', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {categoryData.slice(0, 8).map((c, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: c.color || CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-xs text-slate-300 truncate">{c.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-white shrink-0">{formatCurrency(c.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dois gráficos separados: Contratos Ativos | Contas Lançadas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Gráfico 1 — Contratos Ativos */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-sm bg-orange-400 inline-block shrink-0" />
                <h2 className="font-semibold text-white text-sm">Contratos Ativos</h2>
              </div>
              <p className="text-xs text-slate-500 mb-5 ml-5">Valor mensal por prestador</p>

              {providerData.filter(p => p.contrato > 0).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BarChart3 className="w-8 h-8 text-slate-700 mb-3" />
                  <p className="text-slate-600 text-sm">Nenhum contrato ativo</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={Math.max(180, providerData.filter(p => p.contrato > 0).length * 48)}>
                    <BarChart
                      data={providerData.filter(p => p.contrato > 0)}
                      layout="vertical"
                      margin={{ left: 4, right: 20, top: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                      <XAxis
                        type="number"
                        tickFormatter={v => `R$${Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}k` : Number(v)}`}
                        tick={{ fill: '#64748b', fontSize: 10 }}
                      />
                      <YAxis type="category" dataKey="name" width={110} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip
                        formatter={(v: unknown) => [formatCurrency(Number(v)), 'Valor do Contrato']}
                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', fontSize: 12, borderRadius: 8 }}
                      />
                      <Bar dataKey="contrato" fill="#f97316" radius={[0, 5, 5, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-1.5">
                    {providerData.filter(p => p.contrato > 0).map((p, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-orange-500/5 border border-orange-500/10">
                        <span className="text-xs text-slate-300 truncate">{p.name}</span>
                        <span className="text-xs font-bold text-orange-400 shrink-0 ml-2">{formatCurrency(p.contrato)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Gráfico 2 — Contas Lançadas */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-sm bg-indigo-400 inline-block shrink-0" />
                <h2 className="font-semibold text-white text-sm">Contas Lançadas</h2>
              </div>
              <p className="text-xs text-slate-500 mb-5 ml-5">Total por prestador no período</p>

              {providerData.filter(p => p.pago > 0).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BarChart3 className="w-8 h-8 text-slate-700 mb-3" />
                  <p className="text-slate-600 text-sm">Nenhuma conta lançada para prestadores</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={Math.max(180, providerData.filter(p => p.pago > 0).length * 48)}>
                    <BarChart
                      data={providerData.filter(p => p.pago > 0)}
                      layout="vertical"
                      margin={{ left: 4, right: 20, top: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                      <XAxis
                        type="number"
                        tickFormatter={v => `R$${Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}k` : Number(v)}`}
                        tick={{ fill: '#64748b', fontSize: 10 }}
                      />
                      <YAxis type="category" dataKey="name" width={110} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip
                        formatter={(v: unknown) => [formatCurrency(Number(v)), 'Contas Lançadas']}
                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', fontSize: 12, borderRadius: 8 }}
                      />
                      <Bar dataKey="pago" fill="#6366f1" radius={[0, 5, 5, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-1.5">
                    {providerData.filter(p => p.pago > 0).map((p, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                        <span className="text-xs text-slate-300 truncate">{p.name}</span>
                        <span className="text-xs font-bold text-indigo-400 shrink-0 ml-2">{formatCurrency(p.pago)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
