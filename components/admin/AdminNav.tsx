'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href: string
  label: string
}

export function AdminNav({ nav }: { nav: NavItem[] }) {
  const pathname = usePathname()

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
      {nav.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              'flex items-center px-3 py-2.5 rounded-xl font-body text-sm tracking-wide transition-colors',
              isActive
                ? 'bg-white/[0.07] text-ivory/90'
                : 'text-ivory/40 hover:text-ivory/70 hover:bg-white/[0.04]',
            ].join(' ')}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
