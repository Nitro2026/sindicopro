'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  DollarSign, Calendar, Target, Zap, Users, Printer,
  Info, ArrowRight, Clock,
} from 'lucide-react'
import { format, addMonths, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtShort = (v: number) => {
  if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(1)}k`
  return `R$${v.toFixed(0)}`
}

interface ProjectionPoint {
  mes: string
  saldo: number
  meta: number
  receita: number
  despesa: number
}

export default function ProjecaoPage() {
  const { selectedCondo } = useAppStore()

  // Dados carregados
  const [units, setUnits] = useState(0)
  const [fixedCosts, setFixedCosts] = useState(0)
  const [avgVarCosts, setAvgVarCosts] = useState(0)
  const [loading, setLoading] = useState(true)

  // Inputs do usuário
  const [saldoAtual, setSaldoAtual] = useState('')
  const [taxaMensal, setTaxaMensal] = useState('')
  const [taxaExtra, setTaxaExtra] = useState('')
  const [metaReserva, setMetaReserva] = useState('')
  const [mesesProjecao, setMesesProjecao] = useState(12)
  const [presentation, setPresentation] = useState(false)

  const loadData = useCallback(async () => {
    if (!selectedCondo) return
    setLoading(true)
    const supabase = createClient()

    const from3 = format(startOfMonth(subMonths(new Date(), 3)), 'yyyy-MM-dd')

    const [{ data: condo }, { data: contracts }, { data: accounts }] = await Promise.all([
      supabase.from('condominiums').select('units_count').eq('id', selectedCondo.id).single(),
      supabase.from('provider_contracts').select('value').eq('condo_id', selectedCondo.id).eq('status', 'active'),
      supabase.from('accounts').select('amount, status').eq('condo_id', selectedCondo.id).gte('due_date', from3),
    ])

    const u = condo?.units_count ?? 0
    setUnits(u)

    const fixed = (contracts ?? []).reduce((s: number, c: any) => s + Number(c.value), 0)
    setFixedCosts(fixed)

    const varTotal = (accounts ?? [])
      .filter((a: any) => a.status !== 'cancelled')
      .reduce((s: number, a: any) => s + Number(a.amount), 0)
    setAvgVarCosts(Math.round(varTotal / 3))

    setLoading(false)
  }, [selectedCondo])

  useEffect(() => { loadData() }, [loadData])

  // Cálculos principais
  const calc = useMemo(() => {
    const saldo = parseFloat(saldoAtual.replace(',', '.')) || 0
    const taxa = parseFloat(taxaMensal.replace(',', '.')) || 0
    const extra = parseFloat(taxaExtra.replace(',', '.')) || 0
    const meta = parseFloat(metaReserva.replace(',', '.')) || 0

    const totalExpenses = fixedCosts + avgVarCosts
    const totalIncome = (taxa + extra) * units
    const fluxoMensal = totalIncome - totalExpenses
    const extraNecessaria = fluxoMensal < 0 && units > 0 ? Math.ceil(-fluxoMensal / units) : 0

    // Projeção mês a mês
    const pontos: ProjectionPoint[] = []
    let balance = saldo
    let mesesParaSair = -1
    let mesesParaMeta = -1

    for (let i = 0; i <= mesesProjecao; i++) {
      const date = addMonths(new Date(), i)
      const label = format(date, "MMM/yy", { locale: ptBR })

      if (i > 0) balance += fluxoMensal

      pontos.push({
        mes: label,
        saldo: Math.round(balance),
        meta: meta,
        receita: Math.round(totalIncome),
        despesa: Math.round(totalExpenses),
      })

      if (mesesParaSair === -1 && i > 0 && balance >= 0 && saldo < 0) mesesParaSair = i
      if (mesesParaMeta === -1 && i > 0 && balance >= meta && meta > 0) mesesParaMeta = i
    }

    const saldoFinal = pontos[pontos.length - 1]?.saldo ?? 0

    return {
      saldo, taxa, extra, meta,
      totalExpenses, totalIncome, fluxoMensal,
      extraNecessaria, pontos, saldoFinal,
      mesesParaSair, mesesParaMeta,
      noRed: saldo < 0,
      balanced: fluxoMensal >= 0,
    }
  }, [saldoAtual, taxaMensal, taxaExtra, metaReserva, fixedCosts, avgVarCosts, units, mesesProjecao])

  const inputClass = "w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl text-xs min-w-40">
        <p className="text-slate-300 font-medium mb-2">{label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex justify-between gap-4" style={{ color: p.color }}>
            <span>{p.name}</span>
            <span className="font-bold">{fmt(p.value)}</span>
          </div>
        ))}
      </div>
    )
  }

  if (!selectedCondo) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Selecione um condomínio</p>
      </div>
    )
  }

  const hasInputs = !!saldoAtual && !!taxaMensal

  return (
    <div className={`p-4 sm:p-6 max-w-7xl mx-auto ${presentation ? 'print:p-8' : ''}`}>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Projeção Financeira</h1>
          <p className="text-slate-400 text-sm mt-0.5">{selectedCondo.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
            {[6, 12, 24, 36].map(m => (
              <button
                key={m}
                onClick={() => setMesesProjecao(m)}
                className={`px-3 py-1 rounded text-xs font-medium transition ${mesesProjecao === m ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {m}m
              </button>
            ))}
          </div>
          <button
            onClick={() => setPresentation(!presentation)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition ${
              presentation ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            Apresentação
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Painel de inputs */}
        {!presentation && (
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                Dados da Simulação
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Saldo Atual (R$)</label>
                  <input
                    value={saldoAtual}
                    onChange={e => setSaldoAtual(e.target.value)}
                    placeholder="Ex: -5000 ou 12000"
                    className={inputClass}
                  />
                  <p className="text-xs text-slate-600 mt-1">Use valor negativo se estiver no vermelho</p>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                    Taxa Condominial por Unidade (R$)
                    <Users className="w-3 h-3" />
                  </label>
                  <input
                    value={taxaMensal}
                    onChange={e => setTaxaMensal(e.target.value)}
                    placeholder="Ex: 350"
                    className={inputClass}
                  />
                  {units > 0 && taxaMensal && (
                    <p className="text-xs text-blue-400 mt-1">
                      Total: {fmt((parseFloat(taxaMensal) || 0) * units)}/mês ({units} unidades)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Taxa Extra por Unidade (R$)</label>
                  <input
                    value={taxaExtra}
                    onChange={e => setTaxaExtra(e.target.value)}
                    placeholder="Simule uma taxa extra"
                    className={inputClass}
                  />
                  <p className="text-xs text-slate-600 mt-1">Simule o impacto de uma taxa extra</p>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Meta do Fundo de Reserva (R$)
                  </label>
                  <input
                    value={metaReserva}
                    onChange={e => setMetaReserva(e.target.value)}
                    placeholder="Ex: 50000"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Dados carregados do sistema */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">Dados do Sistema</h3>
              {loading ? (
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="space-y-2.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Unidades</span>
                    <span className="text-white font-medium">{units}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Contratos fixos/mês</span>
                    <span className="text-orange-400 font-medium">{fmt(fixedCosts)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Média contas (3m)</span>
                    <span className="text-amber-400 font-medium">{fmt(avgVarCosts)}</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-slate-800 pt-2">
                    <span className="text-slate-400 font-medium">Total despesas/mês</span>
                    <span className="text-red-400 font-bold">{fmt(fixedCosts + avgVarCosts)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conteúdo principal */}
        <div className={`space-y-5 ${presentation ? 'lg:col-span-4' : 'lg:col-span-3'}`}>

          {!hasInputs && !presentation && (
            <div className="bg-slate-900 border border-slate-800 border-dashed rounded-xl p-10 text-center">
              <Info className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">Preencha o saldo atual e a taxa condominial</p>
              <p className="text-slate-600 text-xs mt-1">para gerar a projeção financeira</p>
            </div>
          )}

          {(hasInputs || presentation) && (
            <>
              {/* Cards de resumo */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: 'Receita Mensal',
                    value: fmt(calc.totalIncome),
                    icon: TrendingUp,
                    color: 'text-green-400',
                    bg: 'bg-green-500/10 border-green-500/20',
                  },
                  {
                    label: 'Despesa Mensal',
                    value: fmt(calc.totalExpenses),
                    icon: TrendingDown,
                    color: 'text-red-400',
                    bg: 'bg-red-500/10 border-red-500/20',
                  },
                  {
                    label: 'Fluxo Mensal',
                    value: fmt(calc.fluxoMensal),
                    icon: calc.fluxoMensal >= 0 ? CheckCircle2 : AlertTriangle,
                    color: calc.fluxoMensal >= 0 ? 'text-green-400' : 'text-red-400',
                    bg: calc.fluxoMensal >= 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20',
                  },
                  {
                    label: 'Saldo Atual',
                    value: fmt(calc.saldo),
                    icon: DollarSign,
                    color: calc.saldo >= 0 ? 'text-blue-400' : 'text-red-400',
                    bg: calc.saldo >= 0 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-red-500/10 border-red-500/20',
                  },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className={`rounded-xl border p-4 ${bg}`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Icon className={`w-3.5 h-3.5 ${color}`} />
                      <p className="text-slate-400 text-xs">{label}</p>
                    </div>
                    <p className={`text-base font-bold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Alertas e diagnóstico */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Situação */}
                <div className={`rounded-xl border p-4 ${calc.balanced ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {calc.balanced
                      ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                      : <AlertTriangle className="w-4 h-4 text-red-400" />}
                    <span className="text-xs font-semibold text-slate-300">Situação do Caixa</span>
                  </div>
                  <p className={`text-sm font-bold ${calc.balanced ? 'text-green-400' : 'text-red-400'}`}>
                    {calc.balanced ? 'Superávit' : 'Déficit mensal'}
                  </p>
                  {!calc.balanced && (
                    <p className="text-xs text-slate-500 mt-1">
                      Faltam {fmt(Math.abs(calc.fluxoMensal))}/mês para equilibrar
                    </p>
                  )}
                </div>

                {/* Sair do vermelho */}
                <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-semibold text-slate-300">Sair do Vermelho</span>
                  </div>
                  {calc.saldo >= 0 ? (
                    <p className="text-sm font-bold text-green-400">Já está no positivo</p>
                  ) : calc.mesesParaSair > 0 ? (
                    <>
                      <p className="text-sm font-bold text-amber-400">{calc.mesesParaSair} {calc.mesesParaSair === 1 ? 'mês' : 'meses'}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {format(addMonths(new Date(), calc.mesesParaSair), "MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-bold text-red-400">Não equilibra no período</p>
                  )}
                </div>

                {/* Meta de reserva */}
                <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-semibold text-slate-300">Fundo de Reserva</span>
                  </div>
                  {!calc.meta ? (
                    <p className="text-xs text-slate-600">Defina uma meta de reserva</p>
                  ) : calc.mesesParaMeta > 0 ? (
                    <>
                      <p className="text-sm font-bold text-purple-400">{calc.mesesParaMeta} {calc.mesesParaMeta === 1 ? 'mês' : 'meses'}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        para atingir {fmt(calc.meta)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-bold text-red-400">Meta fora do período</p>
                  )}
                </div>
              </div>

              {/* Taxa extra necessária */}
              {!calc.balanced && calc.extraNecessaria > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-wrap items-center gap-4">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-300">Taxa extra necessária para equilibrar o caixa</p>
                    <p className="text-xs text-amber-500 mt-0.5">
                      Com as despesas atuais, o condomínio precisa de uma complementação mensal
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-bold text-amber-400">{fmt(calc.extraNecessaria)}</p>
                    <p className="text-xs text-amber-600">por unidade / mês</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-amber-600 shrink-0 hidden sm:block" />
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-amber-300">{fmt(calc.extraNecessaria * units)}</p>
                    <p className="text-xs text-amber-600">total / mês</p>
                  </div>
                </div>
              )}

              {/* Gráfico de projeção */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Projeção do Saldo — {mesesProjecao} meses</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Saldo projetado em {format(addMonths(new Date(), mesesProjecao), "MMMM 'de' yyyy", { locale: ptBR })}: <span className={`font-bold ${calc.saldoFinal >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(calc.saldoFinal)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-400 inline-block" />Saldo</span>
                    {calc.meta > 0 && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-purple-400 inline-block border-dashed" />Meta Reserva</span>}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={calc.pontos} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradPos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradNeg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis tickFormatter={fmtShort} tick={{ fill: '#64748b', fontSize: 10 }} width={60} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Zero', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} />
                    {calc.meta > 0 && (
                      <ReferenceLine y={calc.meta} stroke="#a855f7" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Meta', fill: '#a855f7', fontSize: 10, position: 'insideTopRight' }} />
                    )}
                    <Area
                      type="monotone"
                      dataKey="saldo"
                      name="Saldo"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      fill={calc.saldo >= 0 ? 'url(#gradPos)' : 'url(#gradNeg)'}
                      dot={false}
                      activeDot={{ r: 4, fill: '#3b82f6' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico de receita vs despesa */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-5">Receita vs Despesa ao Longo do Tempo</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={calc.pontos} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis tickFormatter={fmtShort} tick={{ fill: '#64748b', fontSize: 10 }} width={60} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                    <Line type="monotone" dataKey="receita" name="Receita" stroke="#22c55e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="despesa" name="Despesa" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="5 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Tabela de projeção mensal */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    Projeção Mês a Mês
                  </h3>
                  <span className="text-xs text-slate-500">{mesesProjecao} meses</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="text-left py-2.5 px-4 text-slate-400 font-medium">Mês</th>
                        <th className="text-right py-2.5 px-4 text-slate-400 font-medium">Receita</th>
                        <th className="text-right py-2.5 px-4 text-slate-400 font-medium">Despesa</th>
                        <th className="text-right py-2.5 px-4 text-slate-400 font-medium">Fluxo</th>
                        <th className="text-right py-2.5 px-4 text-slate-400 font-medium">Saldo Acumulado</th>
                        <th className="text-center py-2.5 px-4 text-slate-400 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {calc.pontos.slice(1).map((p, i) => {
                        const fluxo = p.receita - p.despesa
                        return (
                          <tr key={i} className={`transition ${p.saldo < 0 ? 'bg-red-500/3' : ''}`}>
                            <td className="py-2.5 px-4 text-slate-300 font-medium">{p.mes}</td>
                            <td className="py-2.5 px-4 text-right text-green-400">{fmt(p.receita)}</td>
                            <td className="py-2.5 px-4 text-right text-red-400">{fmt(p.despesa)}</td>
                            <td className={`py-2.5 px-4 text-right font-medium ${fluxo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {fluxo >= 0 ? '+' : ''}{fmt(fluxo)}
                            </td>
                            <td className={`py-2.5 px-4 text-right font-bold ${p.saldo >= 0 ? 'text-white' : 'text-red-400'}`}>
                              {fmt(p.saldo)}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              {p.saldo >= (calc.meta || Infinity) ? (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                  <Target className="w-3 h-3" /> Meta
                                </span>
                              ) : p.saldo >= 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                                  <CheckCircle2 className="w-3 h-3" /> OK
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                                  <AlertTriangle className="w-3 h-3" /> Déficit
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rodapé da apresentação */}
              {presentation && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between text-xs text-slate-500">
                  <span>{selectedCondo.name} · Projeção gerada em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</span>
                  <span>SíndicoPro · Gestão Profissional de Condomínios</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
