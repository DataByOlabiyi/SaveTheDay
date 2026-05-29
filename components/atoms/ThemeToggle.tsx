'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

type Theme = 'dark' | 'light'

function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null
  return (localStorage.getItem('theme') as Theme) ?? null
}

function applyTheme(theme: Theme) {
  const html = document.documentElement
  html.classList.remove('dark', 'light')
  html.classList.add(theme)
  localStorage.setItem('theme', theme)
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = getStoredTheme()
    const system  = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    const active  = stored ?? system
    setTheme(active)
    applyTheme(active)
    setMounted(true)
  }, [])

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
  }

  // Prevent hydration flash by not rendering until mounted
  if (!mounted) return null

  return (
    <motion.button
      onClick={toggle}
      className="fixed top-4 right-14 z-50 w-8 h-8 flex items-center justify-center transition-colors"
      style={{
        background: 'rgba(12,168,110,0.05)',
        border: '1px solid rgba(12,168,110,0.15)',
        borderRadius: '50%',
        backdropFilter: 'blur(8px)',
      }}
      whileTap={{ scale: 0.9 }}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={theme === 'light'}
    >
      <motion.span
        key={theme}
        initial={{ opacity: 0, rotate: -30 }}
        animate={{ opacity: 1, rotate: 0 }}
        transition={{ duration: 0.2 }}
        style={{ fontSize: '0.9rem', lineHeight: 1 }}
        aria-hidden="true"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </motion.span>
    </motion.button>
  )
}
