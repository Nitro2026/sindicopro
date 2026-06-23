'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import type { Condominium } from '@/types/database.types'
import { ChevronDown, Building2, Plus } from 'lucide-react'
import Link from 'next/link'

export function CondoSelector() {
  const [condos, setCondos] = useState<Condominium[]>([])
  const [open, setOpen] = useState(false)
  const { selectedCondo, setSelectedCondo } = useAppStore()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from('condominiums').select('*').eq('active', true).order('name')
      if (data) {
        setCondos(data)
        if (!selectedCondo && data.length > 0) setSelectedCondo(data[0])
      }
    }
    load()
  }, [selectedCondo, setSelectedCondo])

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm text-white transition w-full"
      >
        <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
        <span className="flex-1 text-left truncate">
          {selectedCondo ? selectedCondo.name : 'Selecionar condomínio'}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="max-h-56 overflow-y-auto py-1">
            {condos.map((condo) => (
              <button
                key={condo.id}
                onClick={() => { setSelectedCondo(condo); setOpen(false) }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition flex items-center gap-2 ${
                  selectedCondo?.id === condo.id ? 'text-blue-400 bg-slate-700/50' : 'text-slate-300'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{condo.name}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-slate-700">
            <Link
              href="/dashboard/condominios/novo"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-blue-400 hover:bg-slate-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo condomínio
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
