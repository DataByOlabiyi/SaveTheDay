'use client'

import { useEffect, useRef } from 'react'

interface CountdownUnitProps {
  value: number
  label: string
  prevValue?: number
}

export function CountdownUnit({ value, label, prevValue }: CountdownUnitProps) {
  const digitRef = useRef<HTMLSpanElement>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (prevValue !== value && digitRef.current) {
      // Trigger flip animation on digit change
      const el = digitRef.current
      el.style.animation = 'none'
      // Force reflow
      void el.offsetHeight
      el.style.animation = 'countdownFlip 0.4s cubic-bezier(0.455, 0.03, 0.515, 0.955) forwards'
    }
  }, [value, prevValue])

  const formatted = String(value).padStart(2, '0')

  return (
    <div className="countdown-unit text-center flex flex-col items-center" role="timer">
      <span
        ref={digitRef}
        className="countdown-digit"
        aria-label={`${value} ${label}`}
      >
        {formatted}
      </span>
      <span className="countdown-label" aria-hidden="true">
        {label}
      </span>
    </div>
  )
}
