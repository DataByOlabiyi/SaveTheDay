import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core palette — The Unveiling (Emerald Edition)
        obsidian: '#080C0A',
        charcoal: {
          DEFAULT: '#111A15',
          deep: '#0A1210',
        },
        emerald: {
          pale: '#C0EDD9',
          light: '#3DD9A0',
          DEFAULT: '#0CA86E',
          dark: '#0A8A59',
        },
        ivory: '#FAF7F2',
        cream: '#EEF5F0',
        forest: {
          DEFAULT: '#0B5240',
          deep: '#073628',
        },
        // Gold accent — used in admin dashboard, OG images, legacy class names
        gold: {
          DEFAULT: '#C9A84C',
          light:   '#E8CC7A',
          dark:    '#A8852A',
        },
      },
      fontFamily: {
        display: ['var(--font-cormorant)', 'Georgia', 'serif'],
        body: ['var(--font-jost)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['clamp(3rem, 10vw, 6rem)', { lineHeight: '1.05', letterSpacing: '0.06em' }],
        'display-lg': ['clamp(2.5rem, 8vw, 5rem)', { lineHeight: '1.1', letterSpacing: '0.08em' }],
        'display-md': ['clamp(1.75rem, 5vw, 3rem)', { lineHeight: '1.15', letterSpacing: '0.06em' }],
        'subtitle': ['clamp(0.875rem, 2.5vw, 1.25rem)', { lineHeight: '1.4', letterSpacing: '0.25em' }],
      },
      backgroundImage: {
        'emerald-shimmer': 'linear-gradient(90deg, #0CA86E 0%, #3DD9A0 30%, #C0EDD9 50%, #3DD9A0 70%, #0CA86E 100%)',
        'dark-radial': 'radial-gradient(ellipse at center, #111A15 0%, #080C0A 100%)',
        'emerald-radial': 'radial-gradient(ellipse at center, rgba(12,168,110,0.15) 0%, transparent 70%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 10s ease-in-out infinite',
        'pulse-emerald': 'pulseEmerald 2s ease-in-out infinite',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        'shimmer': 'shimmer 3s ease-in-out infinite',
        'flicker': 'flicker 0.15s ease-in-out infinite alternate',
        'drift-up': 'driftUp 8s linear infinite',
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'scale-in': 'scaleIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'countdown-flip': 'countdownFlip 0.4s cubic-bezier(0.455, 0.03, 0.515, 0.955)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        pulseEmerald: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        pulseGold: {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.06)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        flicker: {
          '0%': { opacity: '0.85', transform: 'scaleX(0.98)' },
          '100%': { opacity: '1', transform: 'scaleX(1.02)' },
        },
        driftUp: {
          '0%': { transform: 'translateY(100vh) translateX(0px)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '0.6' },
          '100%': { transform: 'translateY(-20vh) translateX(30px)', opacity: '0' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.85)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        glowPulse: {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(12, 168, 110, 0.3), 0 0 40px rgba(12, 168, 110, 0.1)',
          },
          '50%': {
            boxShadow: '0 0 40px rgba(12, 168, 110, 0.6), 0 0 80px rgba(12, 168, 110, 0.2)',
          },
        },
        countdownFlip: {
          '0%': { transform: 'rotateX(90deg)' },
          '100%': { transform: 'rotateX(0deg)' },
        },
      },
      boxShadow: {
        'emerald': '0 0 30px rgba(12, 168, 110, 0.4)',
        'emerald-lg': '0 0 60px rgba(12, 168, 110, 0.3)',
        'inner-emerald': 'inset 0 1px 0 rgba(12, 168, 110, 0.2)',
      },
      transitionTimingFunction: {
        'expo-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'expo-in': 'cubic-bezier(0.7, 0, 1, 1)',
        'dramatic': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
}

export default config
