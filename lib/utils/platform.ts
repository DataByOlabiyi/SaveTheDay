import { useEffect, useState } from 'react'

export function isIOSStandaloneDisplay(userAgent: string, isStandaloneDisplay: boolean): boolean {
  return /iphone|ipad|ipod/i.test(userAgent) && isStandaloneDisplay
}

/** True when Studio is being viewed as an installed iOS home-screen app (no Safari share sheet, no multi-file picker). */
export function useIsIOSStandalone(): boolean {
  const [isIOSStandalone, setIsIOSStandalone] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const isStandaloneDisplay =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    setIsIOSStandalone(isIOSStandaloneDisplay(navigator.userAgent, isStandaloneDisplay))
  }, [])

  return isIOSStandalone
}
