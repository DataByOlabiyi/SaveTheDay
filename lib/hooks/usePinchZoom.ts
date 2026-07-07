import { useCallback, useRef, useState } from 'react'
import { animate, useMotionValue, type MotionValue, type AnimationPlaybackControls } from 'framer-motion'

const MIN_SCALE = 1
const MAX_SCALE = 4
const DOUBLE_TAP_SCALE = 2.5
const RESET_THRESHOLD = 1.1
const RUBBER_BAND = 0.35
const SPRING = { type: 'spring' as const, stiffness: 300, damping: 30 }
const DOUBLE_TAP_WINDOW_MS = 300

interface Point { x: number; y: number }

interface UsePinchZoomOptions {
  imageRef: React.RefObject<HTMLElement>
  disabled?: boolean
  reducedMotion?: boolean
}

interface PinchZoomBind {
  onPointerDown:   (e: React.PointerEvent<HTMLElement>) => void
  onPointerMove:   (e: React.PointerEvent<HTMLElement>) => void
  onPointerUp:     (e: React.PointerEvent<HTMLElement>) => void
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void
  onDoubleClick:   (e: React.MouseEvent<HTMLElement>) => void
  onWheel:         (e: React.WheelEvent<HTMLElement>) => void
}

interface UsePinchZoomResult {
  scale:       MotionValue<number>
  x:           MotionValue<number>
  y:           MotionValue<number>
  isZoomed:    boolean
  isGesturing: boolean
  bind:        PinchZoomBind
  reset:       () => void
}

function distanceBetween(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/**
 * Pinch/pan gesture math kept out of the component render body. Bounds are
 * derived from the image element's own rendered (unscaled) size so panning
 * can never drag the photo past its own edges, independent of the container.
 */
export function usePinchZoom({ imageRef, disabled, reducedMotion }: UsePinchZoomOptions): UsePinchZoomResult {
  const scale = useMotionValue(1)
  const x     = useMotionValue(0)
  const y     = useMotionValue(0)

  const [isZoomed, setIsZoomed]       = useState(false)
  const [isGesturing, setIsGesturing] = useState(false)

  const pointers    = useRef<Map<number, Point>>(new Map())
  const pinchState  = useRef<{ startDistance: number; startScale: number } | null>(null)
  const panState    = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)
  const lastTapAt   = useRef(0)
  const activeAnimations = useRef<AnimationPlaybackControls[]>([])

  // Cancels any in-flight scale/x/y springs so a stale animation from the
  // previous photo (or a previous gesture) can never keep ticking `.set()`
  // calls after `reset()`/`springTo()` has moved on to new target values.
  const stopActiveAnimations = useCallback(() => {
    activeAnimations.current.forEach(controls => controls.stop())
    activeAnimations.current = []
  }, [])

  const getBaseSize = useCallback((): { width: number; height: number } => {
    const el = imageRef.current
    if (!el) return { width: 0, height: 0 }
    const rect = el.getBoundingClientRect()
    const s = scale.get() || 1
    return { width: rect.width / s, height: rect.height / s }
  }, [imageRef, scale])

  const clampPan = useCallback((px: number, py: number, s: number): Point => {
    const { width, height } = getBaseSize()
    const boundX = Math.max(0, (width * (s - 1)) / 2)
    const boundY = Math.max(0, (height * (s - 1)) / 2)
    return {
      x: Math.min(boundX, Math.max(-boundX, px)),
      y: Math.min(boundY, Math.max(-boundY, py)),
    }
  }, [getBaseSize])

  const reset = useCallback(() => {
    stopActiveAnimations()
    scale.set(1); x.set(0); y.set(0)
    setIsZoomed(false)
  }, [scale, x, y, stopActiveAnimations])

  const springTo = useCallback((targetScale: number, targetX: number, targetY: number) => {
    stopActiveAnimations()
    if (reducedMotion) {
      scale.set(targetScale); x.set(targetX); y.set(targetY)
    } else {
      activeAnimations.current = [
        animate(scale, targetScale, SPRING),
        animate(x, targetX, SPRING),
        animate(y, targetY, SPRING),
      ]
    }
    setIsZoomed(targetScale > 1)
  }, [scale, x, y, reducedMotion, stopActiveAnimations])

  const toggleZoomAt = useCallback((clientX: number, clientY: number) => {
    if (scale.get() > 1) {
      springTo(1, 0, 0)
      return
    }
    const el = imageRef.current
    if (!el) { springTo(DOUBLE_TAP_SCALE, 0, 0); return }
    const rect = el.getBoundingClientRect()
    const offsetX = clientX - (rect.left + rect.width / 2)
    const offsetY = clientY - (rect.top + rect.height / 2)
    const targetX = -offsetX * (DOUBLE_TAP_SCALE - 1)
    const targetY = -offsetY * (DOUBLE_TAP_SCALE - 1)
    const clamped = clampPan(targetX, targetY, DOUBLE_TAP_SCALE)
    springTo(DOUBLE_TAP_SCALE, clamped.x, clamped.y)
  }, [scale, imageRef, springTo, clampPan])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (disabled) return
    stopActiveAnimations()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinchState.current = { startDistance: distanceBetween(a, b), startScale: scale.get() }
      panState.current = null
      setIsGesturing(true)
      return
    }

    if (pointers.current.size === 1) {
      if (e.pointerType === 'touch') {
        const now = Date.now()
        if (now - lastTapAt.current < DOUBLE_TAP_WINDOW_MS) {
          lastTapAt.current = 0
          toggleZoomAt(e.clientX, e.clientY)
          return
        }
        lastTapAt.current = now
      }
      if (scale.get() > 1) {
        panState.current = { startX: e.clientX, startY: e.clientY, originX: x.get(), originY: y.get() }
        setIsGesturing(true)
      }
    }
  }, [disabled, scale, x, y, toggleZoomAt, stopActiveAnimations])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (disabled || !pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointers.current.size === 2 && pinchState.current) {
      const [a, b] = [...pointers.current.values()]
      const dist = distanceBetween(a, b)
      const ratio = pinchState.current.startDistance ? dist / pinchState.current.startDistance : 1
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchState.current.startScale * ratio))
      scale.set(nextScale)
      setIsZoomed(nextScale > 1)
      return
    }

    if (pointers.current.size === 1 && panState.current) {
      const dx = e.clientX - panState.current.startX
      const dy = e.clientY - panState.current.startY
      const s = scale.get()
      const { width, height } = getBaseSize()
      const boundX = Math.max(0, (width * (s - 1)) / 2)
      const boundY = Math.max(0, (height * (s - 1)) / 2)
      const rubberBand = (val: number, bound: number) => {
        if (val > bound) return bound + (val - bound) * RUBBER_BAND
        if (val < -bound) return -bound + (val + bound) * RUBBER_BAND
        return val
      }
      x.set(rubberBand(panState.current.originX + dx, boundX))
      y.set(rubberBand(panState.current.originY + dy, boundY))
    }
  }, [disabled, scale, x, y, getBaseSize])

  const endGesture = useCallback((pointerId: number) => {
    pointers.current.delete(pointerId)

    if (pointers.current.size === 0) {
      setIsGesturing(false)
      const finalScale = scale.get()
      if (finalScale < RESET_THRESHOLD) {
        springTo(1, 0, 0)
      } else {
        const clamped = clampPan(x.get(), y.get(), finalScale)
        springTo(finalScale, clamped.x, clamped.y)
      }
      pinchState.current = null
      panState.current = null
      return
    }

    if (pointers.current.size === 1) {
      pinchState.current = null
      const [[, pos]] = [...pointers.current.entries()]
      panState.current = scale.get() > 1
        ? { startX: pos.x, startY: pos.y, originX: x.get(), originY: y.get() }
        : null
    }
  }, [scale, x, y, clampPan, springTo])

  const onPointerUp     = useCallback((e: React.PointerEvent<HTMLElement>) => endGesture(e.pointerId), [endGesture])
  const onPointerCancel = useCallback((e: React.PointerEvent<HTMLElement>) => endGesture(e.pointerId), [endGesture])

  const onDoubleClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (disabled) return
    toggleZoomAt(e.clientX, e.clientY)
  }, [disabled, toggleZoomAt])

  const onWheel = useCallback((e: React.WheelEvent<HTMLElement>) => {
    if (disabled || !e.ctrlKey) return
    e.preventDefault()
    const el = imageRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cursorX = e.clientX - (rect.left + rect.width / 2)
    const cursorY = e.clientY - (rect.top + rect.height / 2)
    const current = scale.get()
    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, current - e.deltaY * 0.01))
    const scaleRatio = current ? nextScale / current : 1
    const nextX = x.get() * scaleRatio - cursorX * (scaleRatio - 1)
    const nextY = y.get() * scaleRatio - cursorY * (scaleRatio - 1)
    const clamped = clampPan(nextX, nextY, nextScale)
    scale.set(nextScale)
    x.set(clamped.x)
    y.set(clamped.y)
    setIsZoomed(nextScale > 1)
  }, [disabled, imageRef, scale, x, y, clampPan])

  return {
    scale, x, y, isZoomed, isGesturing,
    bind: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onDoubleClick, onWheel },
    reset,
  }
}
