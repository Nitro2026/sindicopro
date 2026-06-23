'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CondoSelector } from './condo-selector'
import {
  LayoutDashboard, DollarSign, Users, Wrench,
  ShieldCheck, BarChart3, Building2, LogOut,
  Menu, X, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/dashboard/financeiro', icon: DollarSign, label: 'Financeiro' },
  { href: '/dashboard/prestadores', icon: Wrench, label: 'Prestadores' },
  { href: '/dashboard/colaboradores', icon: Users, label: 'Colaboradores' },
  { href: '/dashboard/auditoria', icon: ShieldCheck, label: 'Auditoria' },
  { href: '/dashboard/relatorios', icon: BarChart3, label: 'Relatórios' },
  { href: '/dashboard/condominios', icon: Building2, label: 'Condomínios' },
]

function LogoIcon() {
  return (
    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true'
    }
    return false
  })

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  function toggleCollapse() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  // Fecha drawer mobile ao navegar
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Bloqueia scroll do body com drawer aberto
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  // ── Nav links reutilizável ──────────────────────────────────────
  function NavLinks({ mini = false, onNavigate }: { mini?: boolean; onNavigate?: () => void }) {
    return (
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              title={mini ? label : undefined}
              className={`flex items-center gap-2.5 rounded-lg font-medium transition
                ${mini ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5 text-sm'}
                ${active
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
                }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!mini && label}
            </Link>
          )
        })}
      </nav>
    )
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ── Sidebar desktop ──────────────────────────────────────────────
  const desktopWidth = collapsed ? 'w-[60px]' : 'w-60'

  return (
    <>
      {/* ── Header mobile ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-slate-900 border-b border-slate-800 flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5">
          <LogoIcon />
          <span className="text-white font-semibold text-sm">SíndicoPro</span>
        </div>
      </header>

      {/* ── Sidebar desktop ── */}
      <aside
        className={`hidden lg:flex flex-col h-screen sticky top-0 border-r border-slate-800 bg-slate-900 transition-all duration-200 shrink-0 ${desktopWidth}`}
      >
        {/* Header da sidebar */}
        <div className={`flex items-center border-b border-slate-800 h-14 ${collapsed ? 'justify-center px-0' : 'justify-between px-4'}`}>
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <LogoIcon />
              <span className="text-white font-semibold text-sm">SíndicoPro</span>
            </div>
          )}
          {collapsed && <LogoIcon />}
          {!collapsed && (
            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition"
              title="Recolher menu"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Seletor de condomínio */}
        {!collapsed && (
          <div className="px-3 py-2.5 border-b border-slate-800">
            <CondoSelector />
          </div>
        )}

        {/* Nav */}
        <NavLinks mini={collapsed} />

        {/* Footer */}
        <div className={`border-t border-slate-800 p-2 space-y-1`}>
          {/* Botão recolher quando collapsed */}
          {collapsed && (
            <button
              onClick={toggleCollapse}
              className="w-full flex justify-center py-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition"
              title="Expandir menu"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Sair' : undefined}
            className={`flex items-center gap-2.5 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 w-full transition
              ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2'}`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && 'Sair'}
          </button>
        </div>
      </aside>

      {/* ── Backdrop mobile ── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Drawer mobile ── */}
      <div
        className={`lg:hidden fixed top-0 left-0 z-50 h-full w-72 bg-slate-900 shadow-2xl transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <LogoIcon />
            <span className="text-white font-semibold text-sm">SíndicoPro</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-3 py-2.5 border-b border-slate-800">
          <CondoSelector />
        </div>
        <div className="flex flex-col h-[calc(100%-7.5rem)]">
          <NavLinks onNavigate={() => setMobileOpen(false)} />
          <div className="p-2 border-t border-slate-800">
            <button
              onClick={async () => {
                const supabase = createClient()
                await supabase.auth.signOut()
                window.location.href = '/login'
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 w-full transition"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
