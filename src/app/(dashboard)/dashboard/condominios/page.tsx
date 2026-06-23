import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Building2, Plus, MapPin, Hash } from 'lucide-react'

export default async function CondominiosPage() {
  const supabase = await createClient()
  const { data: condos } = await supabase.from('condominiums').select('*').order('name')

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Condomínios</h1>
          <p className="text-slate-400 text-sm mt-0.5">{condos?.length ?? 0} condomínio(s) cadastrado(s)</p>
        </div>
        <Link
          href="/dashboard/condominios/novo"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Novo Condomínio
        </Link>
      </div>

      {condos?.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-16 text-center">
          <Building2 className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">Nenhum condomínio cadastrado</p>
          <p className="text-slate-500 text-sm mt-1">Adicione seu primeiro condomínio para começar</p>
          <Link href="/dashboard/condominios/novo" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition">
            <Plus className="w-4 h-4" />
            Adicionar Condomínio
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {condos?.map((condo) => (
            <Link
              key={condo.id}
              href={`/dashboard/condominios/${condo.id}`}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-blue-500/50 hover:bg-slate-800/50 transition group"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white group-hover:text-blue-300 transition truncate">{condo.name}</p>
                  <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full mt-1 ${
                    condo.active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {condo.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-sm text-slate-400">
                {condo.address && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{condo.address}{condo.city ? `, ${condo.city}` : ''}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 shrink-0" />
                  <span>{condo.units_count} unidades</span>
                </div>
                {condo.cnpj && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs bg-slate-800 px-1.5 py-0.5 rounded font-mono">{condo.cnpj}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
