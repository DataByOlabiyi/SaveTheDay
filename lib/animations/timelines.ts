// ──────────────────────────────────────────────────────────────
// GSAP Timeline Configurations
// All animation constants and reusable timeline factories
// ──────────────────────────────────────────────────────────────

export const EASINGS = {
  // Luxury deceleration — the signature motion
  expoOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  // Dramatic entrance
  dramatic: 'cubic-bezier(0.22, 1, 0.36, 1)',
  // Fast exit
  expoIn: 'cubic-bezier(0.7, 0, 1, 1)',
  // Standard ease
  standard: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
} as const

export const DURATIONS = {
  micro: 200,    // Button feedback
  fast: 400,     // Quick reveals
  medium: 600,   // Panel transitions
  slow: 1200,    // Scene changes
  verySlow: 2400, // Hero reveals
  ambient: 3000, // Atmospheric
} as const

// The full choreography timeline offsets (ms from page load)
export const TIMELINE = {
  // Ambient intro
  BG_FADE_IN: 0,
  FIRST_PARTICLE: 1000,
  PARTICLE_FIELD: 1500,
  FLAME_APPEAR: 3000,

  // Envelope arrival
  ENVELOPE_ARRIVE: 6000,
  ENVELOPE_FLOAT: 7000,
  SEAL_GLOW: 7200,
  PROMPT_APPEAR: 7500,

  // After seal tap (relative to tap)
  CRACK_ANIM: 0,
  HAPTIC: 100,
  PARTICLE_BURST: 200,
  GLOW_FADE: 300,
  FLAP_1: 600,
  FLAP_2: 900,
  PAPER_RISE: 1400,
  NAME_1_START: 1600,
  AMPERSAND_PULSE: 2800,
  NAME_2_START: 3200,
  NAME_COMPLETE: 4500,
  SCROLL_UNLOCK: 5300,
} as const

// Particle system config
export const PARTICLES = {
  AMBIENT: {
    count: 60,
    minSize: 1,
    maxSize: 3,
    driftDuration: [6000, 12000] as [number, number],
    colors: ['#0CA86E', '#3DD9A0', '#C0EDD9'],
  },
  SEAL_BURST: {
    count: 40,
    minSize: 2,
    maxSize: 6,
    duration: 800,
    spread: 360, // degrees
    velocity: [80, 200] as [number, number], // px
    colors: ['#0CA86E', '#3DD9A0', '#C0EDD9', '#FAF7F2'],
  },
  CONFETTI: {
    count: 80,
    colors: ['#0CA86E', '#3DD9A0', '#0B5240', '#FAF7F2', '#EEF5F0'],
  },
} as const

// Character stagger for name reveal
export const NAME_STAGGER = {
  delay: 80, // ms between each character
  enterDuration: 400,
  translateY: 8, // px starting offset
} as const

// ScrollTrigger zone IDs
export const SCROLL_ZONES = {
  MONTAGE: 'scroll-montage',
  DATE_REVEAL: 'scroll-date',
  VENUE: 'scroll-venue',
  GREETING: 'scroll-greeting',
  RSVP: 'scroll-rsvp',
} as const

// Haptic patterns
export const HAPTIC = {
  SEAL_CRACK: [50],
  CHAR_REVEAL: [10],
  RSVP_SUCCESS: [100, 50, 100],
  HEART: [30],
  ERROR: [50, 30, 50, 30, 50],
} as const

// Vibration API helper with graceful degradation
// Accepts readonly arrays (const tuples from HAPTIC) or mutable arrays
export function vibrate(pattern: readonly number[]): void {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([...pattern]) // Spread to satisfy mutable array requirement
    } catch {
      // Silently fail — haptics are enhancement, not core UX
    }
  }
}
