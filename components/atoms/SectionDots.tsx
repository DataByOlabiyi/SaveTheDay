'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

export interface SectionDef {
  id: string
  label: string
}

interface SectionDotsProps {
  sections: SectionDef[]
}

/**
 * Fixed right-side progress dots — highlights whichever section
 * is most visible in the viewport via IntersectionObserver.
 */
export function SectionDots({ sections }: SectionDotsProps) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? '')

  useEffect(() => {
    const observers: IntersectionObserver[] = []

    // Track how much each section is visible
    const ratios: Record<string, number> = {}

    const pickMostVisible = () => {
      let bestId = sections[0]?.id ?? ''
      let bestRatio = -1
      for (const id of Object.keys(ratios)) {
        if (ratios[id] > bestRatio) {
          bestRatio = ratios[id]
          bestId = id
        }
      }
      setActive(bestId)
    }

    sections.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (!el) return

      const obs = new IntersectionObserver(
        ([entry]) => {
          ratios[id] = entry.intersectionRatio
          pickMostVisible()
        },
        { threshold: Array.from({ length: 21 }, (_, i) => i / 20) }
      )
      obs.observe(el)
      observers.push(obs)
    })

    return () => observers.forEach(o => o.disconnect())
  }, [sections])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav
      aria-label="Page sections"
      className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-3 pointer-events-auto"
    >
      {sections.map(({ id, label }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            onClick={() => scrollTo(id)}
            aria-label={`Scroll to ${label}`}
            title={label}
            className="group relative flex items-center justify-end gap-2"
          >
            {/* Tooltip label */}
            <span
              className="
                hidden group-hover:block
                absolute right-6
                font-body text-ivory/60 text-xs tracking-widest uppercase
                whitespace-nowrap bg-obsidian/80 px-2 py-0.5
                pointer-events-none select-none
              "
              style={{ fontSize: '0.6rem', letterSpacing: '0.15em' }}
            >
              {label}
            </span>

            {/* Dot */}
            <motion.span
              animate={
                isActive
                  ? { width: 8, height: 8, opacity: 1 }
                  : { width: 5, height: 5, opacity: 0.35 }
              }
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="block rounded-full"
              style={{
                background: isActive
                  ? 'linear-gradient(135deg, #0CA86E, #3DD9A0)'
                  : 'rgba(12,168,110,0.5)',
                boxShadow: isActive ? '0 0 8px rgba(12,168,110,0.6)' : 'none',
              }}
            />
          </button>
        )
      })}
    </nav>
  )
}
