'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import { Wrench, Plus, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { ProviderModal } from './provider-modal'
import { ContractModal } from './contract-modal'

const STATUS_CONFIG = {
  active: { label: 'Ativo', color: 'text-green-400 bg-green-500/10 border-green-500/20', icon: CheckCircle },
  inactive: { label: 'Inativo', color: 'text-slate-400 bg-slate-700 border-slate-600', icon: XCircle },
  blocked: { label: 'Bloqueado', color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: AlertTriangle },
}

export default function PrestadoresPage() {
  const { selectedCondo } = useAppStore()
  const [providers, setProviders] = useState<any[]>([])
  const [contracts, setContracts] = useState<Record<string, any[]>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showProviderModal, setShowProviderModal] = useState(false)
  const [showContractModal, setShowContractModal] = useState(false)
  const [editingProvider, setEditingProvider] = useState<any>(null)
  const [contractProvider, setContractProvider] = useState<any>(null)

  const loadProviders = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from('service_providers').select('*').order('name')
    setProviders(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadProviders() }, [loadProviders])

  async function loadContracts(providerId: string) {
    if (!selectedCondo) return
    const supabase = createClient()
    const { data } = await supabase
      .from('provider_contracts')
      .select('*')
      .eq('provider_id', providerId)
      .eq('condo_id', selectedCondo.id)
      .order('start_date', { ascending: false })
    setContracts(prev => ({ ...prev, [providerId]: data ?? [] }))
    setExpanded(providerId)
  }

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const formatDate = (d: string) => format(new Date(d + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })

  function getContractDaysAlert(endDate: string | null) {
    if (!endDate) return null
    const days = differenceInDays(new Date(endDate + 'T00:00:00'), new Date())
    if (days < 0) return { label: 'Vencido', color: 'text-red-400' }
    if (days <= 15) return { label: `${days}d`, color: 'text-red-400' }
    if (days <= 30) return { label: `${days}d`, color: 'text-amber-400' }
    return null
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
          <h1 className="text-xl font-bold text-white">Prestadores</h1>
          <p className="text-slate-400 text-sm mt-0.5">{providers.length} cadastrado(s)</p>
        </div>
        <button
          onClick={() => { setEditingProvider(null); setShowProviderModal(true) }}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Prestador</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : providers.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <Wrench className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">Nenhum prestador cadastrado</p>
          <button onClick={() => setShowProviderModal(true)} className="mt-3 text-blue-400 text-sm hover:text-blue-300">
            Cadastrar primeiro prestador
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((provider) => {
            const { label, color, icon: Icon } = STATUS_CONFIG[provider.status as keyof typeof STATUS_CONFIG]
            const isExpanded = expanded === provider.id
            const provContracts = contracts[provider.id] ?? []

            return (
              <div key={provider.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                      <Wrench className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white text-sm">{provider.name}</p>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${color}`}>
                          <Icon className="w-3 h-3" />
                          {label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-slate-500">{provider.type_of_service}</span>
                        {provider.cnpj && <span className="text-xs text-slate-600 font-mono">{provider.cnpj}</span>}
                        {provider.phone && <span className="text-xs text-slate-500">{provider.phone}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setContractProvider(provider); setShowContractModal(true) }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                    >
                      + Contrato
                    </button>
                    <button
                      onClick={() => { setEditingProvider(provider); setShowProviderModal(true) }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => isExpanded ? setExpanded(null) : loadContracts(provider.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-800 p-4">
                    <p className="text-xs text-slate-400 font-medium mb-3">Contratos em {selectedCondo.name}</p>
                    {provContracts.length === 0 ? (
                      <p className="text-slate-600 text-sm">Nenhum contrato para este condomínio.</p>
                    ) : (
                      <div className="space-y-2">
                        {provContracts.map((contract) => {
                          const alert = getContractDaysAlert(contract.end_date)
                          return (
                            <div key={contract.id} className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-lg">
                              <div>
                                <p className="text-sm text-white">{contract.description}</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {formatDate(contract.start_date)} → {contract.end_date ? formatDate(contract.end_date) : 'Indeterminado'}
                                  {contract.readjustment_index && ` · Reajuste: ${contract.readjustment_index}`}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                {alert && (
                                  <span className={`text-xs font-medium ${alert.color}`}>
                                    Vence em {alert.label}
                                  </span>
                                )}
                                <span className="text-sm font-medium text-white">{formatCurrency(Number(contract.value))}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  contract.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                    : 'bg-slate-700 text-slate-400'
                                }`}>{contract.status === 'active' ? 'Ativo' : contract.status === 'expired' ? 'Vencido' : 'Cancelado'}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showProviderModal && (
        <ProviderModal
          provider={editingProvider}
          onClose={() => setShowProviderModal(false)}
          onSuccess={() => { setShowProviderModal(false); loadProviders() }}
        />
      )}

      {showContractModal && contractProvider && selectedCondo && (
        <ContractModal
          providerId={contractProvider.id}
          providerName={contractProvider.name}
          condoId={selectedCondo.id}
          onClose={() => setShowContractModal(false)}
          onSuccess={() => { setShowContractModal(false); loadContracts(contractProvider.id) }}
        />
      )}
    </div>
  )
}
