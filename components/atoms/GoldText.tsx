import type { ElementType } from 'react'
import { cn } from '@/lib/utils'

interface GoldTextProps {
  children: React.ReactNode
  className?: string
  shimmer?: boolean
  as?: ElementType
}

export function GoldText({
  children,
  className,
  shimmer = false,
  as: Tag = 'span' as ElementType,
}: GoldTextProps) {
  const Component = Tag
  return (
    <Component
      className={cn(
        'font-display',
        shimmer ? 'text-emerald-shimmer' : 'text-gold-gradient',
        className
      )}
    >
      {children}
    </Component>
  )
}

interface GoldDividerProps {
  className?: string
  wide?: boolean
}

// Ornamental divider: hairlines flanking a rotated diamond
export function GoldDivider({ className, wide = false }: GoldDividerProps) {
  const totalW = wide ? 180 : 110
  const midX   = totalW / 2
  const lineY  = 7
  const gap    = 10 // px gap between line end and diamond tip

  return (
    <div
      className={cn('flex items-center justify-center', className)}
      aria-hidden="true"
    >
      <svg
        width={totalW}
        height={14}
        viewBox={`0 0 ${totalW} 14`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Left hairline */}
        <line
          x1={0}
          y1={lineY}
          x2={midX - gap}
          y2={lineY}
          stroke="rgba(201,168,76,0.35)"
          strokeWidth="0.75"
        />

        {/* Diamond ornament */}
        <polygon
          points={`${midX},2 ${midX + gap - 2},${lineY} ${midX},12 ${midX - gap + 2},${lineY}`}
          fill="rgba(201,168,76,0.12)"
          stroke="rgba(201,168,76,0.65)"
          strokeWidth="0.75"
        />

        {/* Tiny inner dot */}
        <circle cx={midX} cy={lineY} r="1.2" fill="rgba(232,204,122,0.7)" />

        {/* Right hairline */}
        <line
          x1={midX + gap}
          y1={lineY}
          x2={totalW}
          y2={lineY}
          stroke="rgba(201,168,76,0.35)"
          strokeWidth="0.75"
        />
      </svg>
    </div>
  )
}
