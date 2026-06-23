'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, TrendingUp } from 'lucide-react'

const tabs = [
  { href: '/dashboard/relatorios', label: 'Relatórios', icon: BarChart3, exact: true },
  { href: '/dashboard/relatorios/projecao', label: 'Projeção Financeira', icon: TrendingUp, exact: false },
]

export default function RelatoriosLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col min-h-full">
      <div className="border-b border-slate-800 bg-slate-950 px-4 sm:px-6 pt-4">
        <nav className="flex gap-1">
          {tabs.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition ${
                  active
                    ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
      {children}
    </div>
  )
}
