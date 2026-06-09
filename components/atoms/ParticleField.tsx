'use client'

import { useEffect, useRef } from 'react'
import { PARTICLES } from '@/lib/animations/timelines'

interface Particle {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  opacity: number
  color: string
  life: number
  maxLife: number
}

interface ParticleFieldProps {
  className?: string
  count?: number
  burst?: boolean // One-shot burst mode for seal crack
  burstOrigin?: { x: number; y: number }
  onBurstComplete?: () => void
}

export function ParticleField({
  className = '',
  count = PARTICLES.AMBIENT.count,
  burst = false,
  burstOrigin,
  onBurstComplete,
}: ParticleFieldProps) {
  // All hooks must come before any conditional return (React rules of hooks)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animFrameRef = useRef<number>(0)
  const burstDoneRef = useRef(false)
  const pausedRef    = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Size canvas to container
    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    let io: IntersectionObserver | null = null

    const W = () => canvas.offsetWidth
    const H = () => canvas.offsetHeight
    const colors = PARTICLES.AMBIENT.colors

    if (burst && burstOrigin) {
      // ── Seal crack burst — 40 particles radiate outward ──
      const cfg = PARTICLES.SEAL_BURST
      particlesRef.current = Array.from({ length: cfg.count }, () => {
        const angle = Math.random() * Math.PI * 2
        const vel = cfg.velocity[0] + Math.random() * (cfg.velocity[1] - cfg.velocity[0])
        const life = 600 + Math.random() * 400 // ms

        return {
          x: burstOrigin.x,
          y: burstOrigin.y,
          size: cfg.minSize + Math.random() * (cfg.maxSize - cfg.minSize),
          speedX: Math.cos(angle) * vel * 0.001, // Convert to px/ms
          speedY: Math.sin(angle) * vel * 0.001,
          opacity: 0.8 + Math.random() * 0.2,
          color: cfg.colors[Math.floor(Math.random() * cfg.colors.length)],
          life,
          maxLife: life,
        }
      })

      let lastTime = performance.now()

      const animateBurst = (now: number) => {
        const dt = now - lastTime
        lastTime = now

        ctx.clearRect(0, 0, W(), H())

        let allDead = true
        particlesRef.current.forEach(p => {
          p.life -= dt
          if (p.life <= 0) return
          allDead = false

          const progress = 1 - p.life / p.maxLife
          p.x += p.speedX * dt
          p.y += p.speedY * dt
          p.opacity = (1 - progress) * (0.8 + Math.random() * 0.2)

          ctx.save()
          ctx.globalAlpha = Math.max(0, p.opacity)
          ctx.fillStyle = p.color
          ctx.shadowBlur = 4
          ctx.shadowColor = p.color
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * (1 - progress * 0.5), 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        })

        if (allDead && !burstDoneRef.current) {
          burstDoneRef.current = true
          onBurstComplete?.()
          return
        }

        if (!allDead) {
          animFrameRef.current = requestAnimationFrame(animateBurst)
        }
      }

      animFrameRef.current = requestAnimationFrame(animateBurst)
    } else {
      // ── Ambient floating particles ── pause when off-screen ──
      io = new IntersectionObserver(
        ([entry]) => { pausedRef.current = !entry.isIntersecting },
        { threshold: 0 }
      )
      io.observe(canvas)

      const spawnParticle = (): Particle => ({
        x: Math.random() * W(),
        y: H() + 10,
        size: PARTICLES.AMBIENT.minSize + Math.random() * (PARTICLES.AMBIENT.maxSize - PARTICLES.AMBIENT.minSize),
        speedX: (Math.random() - 0.5) * 0.02,
        speedY: -(0.03 + Math.random() * 0.04), // Drift upward
        opacity: 0,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 8000 + Math.random() * 6000,
        maxLife: 14000,
      })

      // Stagger initial spawn across screen
      particlesRef.current = Array.from({ length: count }, (_, i) => {
        const p = spawnParticle()
        p.y = Math.random() * H() // Start at random y
        p.life = p.maxLife * Math.random() // Random life progress
        return p
      })

      let lastTime = performance.now()

      const animateAmbient = (now: number) => {
        const dt = now - lastTime
        lastTime = now

        if (pausedRef.current) {
          animFrameRef.current = requestAnimationFrame(animateAmbient)
          return
        }

        ctx.clearRect(0, 0, W(), H())

        particlesRef.current = particlesRef.current.map(p => {
          p.life -= dt
          if (p.life <= 0) return spawnParticle()

          const progress = 1 - p.life / p.maxLife
          p.x += p.speedX * dt
          p.y += p.speedY * dt

          // Fade in/out over lifecycle
          const fadeInEnd = 0.1
          const fadeOutStart = 0.8
          if (progress < fadeInEnd) {
            p.opacity = progress / fadeInEnd * 0.7
          } else if (progress > fadeOutStart) {
            p.opacity = (1 - (progress - fadeOutStart) / (1 - fadeOutStart)) * 0.7
          } else {
            p.opacity = 0.3 + Math.random() * 0.4 // Slight twinkle
          }

          // Glow rendering
          ctx.save()
          ctx.globalAlpha = Math.max(0, p.opacity)
          ctx.fillStyle = p.color
          ctx.shadowBlur = 6
          ctx.shadowColor = p.color
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()

          return p
        })

        animFrameRef.current = requestAnimationFrame(animateAmbient)
      }

      animFrameRef.current = requestAnimationFrame(animateAmbient)
    }

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      ro.disconnect()
      io?.disconnect()
    }
  }, [count, burst, burstOrigin, onBurstComplete])

  // Reduced-motion guard must come after all hooks (React rules of hooks)
  if (!burst && typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return null
  }

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none ${className}`}
      aria-hidden="true"
    />
  )
}
