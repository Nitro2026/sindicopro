'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import {
  ShieldCheck, Plus, Edit, Trash2, Eye, LogIn, LogOut,
  Filter, Download, ChevronLeft, ChevronRight
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const ACTION_CONFIG = {
  create: { label: 'Criação', icon: Plus, color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  update: { label: 'Edição', icon: Edit, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  delete: { label: 'Exclusão', icon: Trash2, color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  view: { label: 'Visualização', icon: Eye, color: 'text-slate-400 bg-slate-700/50 border-slate-600' },
  login: { label: 'Login', icon: LogIn, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  logout: { label: 'Logout', icon: LogOut, color: 'text-slate-400 bg-slate-700/50 border-slate-600' },
}

const MODULE_LABELS: Record<string, string> = {
  financial: 'Financeiro', providers: 'Prestadores',
  collaborators: 'Colaboradores', audit: 'Auditoria',
  reports: 'Relatórios', condominiums: 'Condomínios', auth: 'Autenticação',
}

const PAGE_SIZE = 20

export default function AuditoriaPage() {
  const { selectedCondo } = useAppStore()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [filterModule, setFilterModule] = useState('all')
  const [filterAction, setFilterAction] = useState('all')
  const [filterDate, setFilterDate] = useState('')
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  const loadLogs = useCallback(async () => {
    if (!selectedCondo) return
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('audit_logs')
      .select('*, profiles(full_name, email)', { count: 'exact' })
      .eq('condo_id', selectedCondo.id)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (filterModule !== 'all') query = query.eq('module', filterModule)
    if (filterAction !== 'all') query = query.eq('action', filterAction as 'create' | 'update' | 'delete' | 'view' | 'login' | 'logout')
    if (filterDate) {
      query = query.gte('created_at', `${filterDate}T00:00:00`).lte('created_at', `${filterDate}T23:59:59`)
    }

    const { data, count } = await query
    setLogs((data ?? []) as any[])
    setTotal(count ?? 0)
    setLoading(false)
  }, [selectedCondo, page, filterModule, filterAction, filterDate])

  useEffect(() => { loadLogs() }, [loadLogs])

  function formatDateTime(d: string) {
    return format(new Date(d), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })
  }

  function formatRelative(d: string) {
    const diff = Date.now() - new Date(d).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'agora há pouco'
    if (mins < 60) return `${mins}min atrás`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h atrás`
    const days = Math.floor(hours / 24)
    return `${days}d atrás`
  }

  async function exportLogs() {
    if (!selectedCondo) return
    const supabase = createClient()
    const { data } = await supabase
      .from('audit_logs')
      .select('*, profiles(full_name, email)')
      .eq('condo_id', selectedCondo.id)
      .order('created_at', { ascending: false })

    if (!data) return

    const csv = [
      ['Data/Hora', 'Usuário', 'Módulo', 'Ação', 'Registro', 'IP'].join(';'),
      ...data.map(log => [
        formatDateTime(log.created_at),
        log.profiles?.full_name ?? '',
        MODULE_LABELS[log.module] ?? log.module,
        ACTION_CONFIG[log.action as keyof typeof ACTION_CONFIG]?.label ?? log.action,
        log.record_description ?? '',
        log.ip_address ?? '',
      ].join(';'))
    ].join('\n')

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `auditoria-${selectedCondo.name}-${format(new Date(), 'yyyy-MM-dd')}.csv`
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

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Auditoria</h1>
          <p className="text-slate-400 text-sm mt-0.5">{selectedCondo.name} · {total} registro(s)</p>
        </div>
        <button
          onClick={exportLogs}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium rounded-lg transition shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Exportar CSV</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Filter className="w-4 h-4 text-slate-400" />

        <select
          value={filterModule}
          onChange={e => { setFilterModule(e.target.value); setPage(0) }}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-xs appearance-none"
        >
          <option value="all">Todos os módulos</option>
          {Object.entries(MODULE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        <select
          value={filterAction}
          onChange={e => { setFilterAction(e.target.value); setPage(0) }}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-xs appearance-none"
        >
          <option value="all">Todas as ações</option>
          {Object.entries(ACTION_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
        </select>

        <input
          type="date"
          value={filterDate}
          onChange={e => { setFilterDate(e.target.value); setPage(0) }}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-xs"
        />

        {(filterModule !== 'all' || filterAction !== 'all' || filterDate) && (
          <button
            onClick={() => { setFilterModule('all'); setFilterAction('all'); setFilterDate(''); setPage(0) }}
            className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs hover:bg-red-500/20 transition"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <ShieldCheck className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">Nenhum registro encontrado</p>
        </div>
      ) : (
        <div className="relative">
          {/* Linha vertical */}
          <div className="absolute left-[22px] top-0 bottom-0 w-px bg-slate-800" />

          <div className="space-y-1">
            {logs.map((log, idx) => {
              const config = ACTION_CONFIG[log.action as keyof typeof ACTION_CONFIG]
              const Icon = config?.icon ?? ShieldCheck
              const isExpanded = expandedLog === log.id
              const hasDetails = log.old_value || log.new_value

              return (
                <div key={log.id} className="flex gap-4 pl-1">
                  {/* Ícone na timeline */}
                  <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 mt-2 z-10 ${config?.color ?? 'text-slate-400 bg-slate-800 border-slate-700'}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  {/* Conteúdo */}
                  <div
                    className={`flex-1 bg-slate-900 border rounded-xl mb-2 transition ${
                      hasDetails ? 'cursor-pointer hover:border-slate-600' : ''
                    } ${isExpanded ? 'border-slate-600' : 'border-slate-800'}`}
                    onClick={() => hasDetails && setExpandedLog(isExpanded ? null : log.id)}
                  >
                    <div className="flex items-start justify-between p-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${config?.color}`}>
                            {config?.label}
                          </span>
                          <span className="text-xs text-slate-500">{MODULE_LABELS[log.module] ?? log.module}</span>
                          {log.record_description && (
                            <span className="text-sm text-white">{log.record_description}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-slate-500">
                            {log.profiles?.full_name ?? 'Desconhecido'}
                          </span>
                          {log.ip_address && (
                            <span className="text-xs text-slate-700 font-mono">{log.ip_address}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-xs text-slate-500" title={formatDateTime(log.created_at)}>
                          {formatRelative(log.created_at)}
                        </p>
                        <p className="text-xs text-slate-700 mt-0.5">{formatDateTime(log.created_at)}</p>
                      </div>
                    </div>

                    {isExpanded && hasDetails && (
                      <div className="border-t border-slate-800 p-3 grid grid-cols-2 gap-3">
                        {log.old_value && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Valor anterior</p>
                            <pre className="text-xs text-red-300 bg-red-500/5 rounded p-2 overflow-x-auto">
                              {JSON.stringify(log.old_value, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.new_value && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Valor novo</p>
                            <pre className="text-xs text-green-300 bg-green-500/5 rounded p-2 overflow-x-auto">
                              {JSON.stringify(log.new_value, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-slate-500">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
