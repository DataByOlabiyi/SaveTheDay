import { useEffect, useState } from 'react'

/** Returns true if the user has requested reduced motion via system preferences. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return reduced
}

/**
 * Returns a Framer Motion transition that respects the user's motion preference.
 * Pass the result as the `transition` prop on any motion element.
 */
export function motionTransition(
  duration: number,
  ease: string | number[] = [0.22, 1, 0.36, 1],
  reducedMotion = false,
) {
  if (reducedMotion) return { duration: 0 }
  return { duration, ease }
}
