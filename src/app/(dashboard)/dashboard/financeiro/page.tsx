'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import { Plus, DollarSign, CheckCircle, Clock, AlertTriangle, Filter, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { AccountModal } from './account-modal'
import type { Account } from '@/types/database.types'

type AccountWithRelations = Account & {
  service_providers?: { name: string } | null
  account_categories?: { name: string; color: string | null } | null
}

const STATUS_CONFIG = {
  pending: { label: 'Pendente', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Clock },
  paid: { label: 'Pago', color: 'text-green-400 bg-green-500/10 border-green-500/20', icon: CheckCircle },
  overdue: { label: 'Vencida', color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: AlertTriangle },
  cancelled: { label: 'Cancelada', color: 'text-slate-400 bg-slate-700/50 border-slate-600', icon: DollarSign },
}

export default function FinanceiroPage() {
  const { selectedCondo } = useAppStore()
  const [accounts, setAccounts] = useState<AccountWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<AccountWithRelations | null>(null)

  const loadAccounts = useCallback(async () => {
    if (!selectedCondo) return
    setLoading(true)
    const supabase = createClient()
    let query = supabase
      .from('accounts')
      .select('*, service_providers(name), account_categories(name, color)')
      .eq('condo_id', selectedCondo.id)
      .order('due_date', { ascending: false })

    if (filterStatus !== 'all') query = query.eq('status', filterStatus as 'pending' | 'paid' | 'overdue' | 'cancelled')
    if (filterType === 'recurring') query = query.eq('is_recurring', true)
    if (filterType === 'oneoff') query = query.eq('is_recurring', false)

    const { data } = await query
    setAccounts((data ?? []) as AccountWithRelations[])
    setLoading(false)
  }, [selectedCondo, filterStatus, filterType])

  useEffect(() => { loadAccounts() }, [loadAccounts])

  async function markAsPaid(account: AccountWithRelations) {
    const supabase = createClient()
    const { error } = await supabase
      .from('accounts')
      .update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0] })
      .eq('id', account.id)

    if (error) { toast.error('Erro ao dar baixa'); return }
    toast.success('Conta baixada!')
    loadAccounts()
  }

  async function cancelAccount(id: string) {
    const supabase = createClient()
    await supabase.from('accounts').update({ status: 'cancelled' }).eq('id', id)
    toast.success('Conta cancelada')
    loadAccounts()
  }

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const formatDate = (d: string) => format(new Date(d + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })

  const totals = {
    pending: accounts.filter(a => a.status === 'pending').reduce((s, a) => s + Number(a.amount), 0),
    paid: accounts.filter(a => a.status === 'paid').reduce((s, a) => s + Number(a.amount), 0),
    overdue: accounts.filter(a => a.status === 'overdue').reduce((s, a) => s + Number(a.amount), 0),
  }

  if (!selectedCondo) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <DollarSign className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400">Selecione um condomínio para ver o financeiro</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Financeiro</h1>
          <p className="text-slate-400 text-sm mt-0.5">{selectedCondo.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAccounts} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setEditingAccount(null); setShowModal(true) }}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nova Conta</span>
          </button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'A Pagar', value: totals.pending, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Pago (período)', value: totals.paid, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
          { label: 'Vencido', value: totals.overdue, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg}`}>
            <p className="text-slate-400 text-xs">{label}</p>
            <p className={`text-xl font-bold mt-1 ${color}`}>{formatCurrency(value)}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
        <div className="flex flex-wrap gap-1.5">
          {[['all', 'Todos'], ['pending', 'Pendentes'], ['paid', 'Pagos'], ['overdue', 'Vencidos'], ['cancelled', 'Cancelados']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilterStatus(v)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                filterStatus === v ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 sm:ml-auto">
          {[['all', 'Todos'], ['recurring', 'Recorrentes'], ['oneoff', 'Avulsas']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilterType(v)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                filterType === v ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">Nenhuma conta encontrada</p>
            <button onClick={() => { setEditingAccount(null); setShowModal(true) }} className="mt-3 text-blue-400 text-sm hover:text-blue-300">
              Lançar primeira conta
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Descrição</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Categoria</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Prestador</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Vencimento</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Valor</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">Status</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {accounts.map((acc) => {
                  const { label, color, icon: Icon } = STATUS_CONFIG[acc.status]
                  return (
                    <tr key={acc.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {acc.is_recurring && (
                            <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded">Fixa</span>
                          )}
                          <span className="text-white">{acc.description}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {acc.account_categories ? (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{
                            backgroundColor: `${acc.account_categories.color}20`,
                            color: acc.account_categories.color ?? '#94a3b8',
                            border: `1px solid ${acc.account_categories.color ?? '#94a3b8'}30`,
                          }}>
                            {acc.account_categories.name}
                          </span>
                        ) : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{acc.service_providers?.name ?? '—'}</td>
                      <td className="py-3 px-4 text-slate-300">{formatDate(acc.due_date)}</td>
                      <td className="py-3 px-4 text-right font-medium text-white">{formatCurrency(Number(acc.amount))}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${color}`}>
                          <Icon className="w-3 h-3" />
                          {label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {acc.status === 'pending' && (
                            <button onClick={() => markAsPaid(acc)} className="text-xs text-green-400 hover:text-green-300 font-medium transition">
                              Baixar
                            </button>
                          )}
                          <button onClick={() => { setEditingAccount(acc); setShowModal(true) }} className="text-xs text-slate-400 hover:text-white transition">
                            Editar
                          </button>
                          {acc.status !== 'cancelled' && acc.status !== 'paid' && (
                            <button onClick={() => cancelAccount(acc.id)} className="text-xs text-red-400 hover:text-red-300 transition">
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <AccountModal
          condoId={selectedCondo.id}
          account={editingAccount}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); loadAccounts() }}
        />
      )}
    </div>
  )
}
