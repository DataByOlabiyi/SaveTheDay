'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface RSVPButtonProps {
  onClick?: () => void
  className?: string
  pulsate?: boolean
}

export function RSVPButton({ onClick, className = '', pulsate = true }: RSVPButtonProps) {
  const [pressed, setPressed] = useState(false)

  const handleClick = () => {
    setPressed(true)
    onClick?.()
    // Reset after a moment so the button is re-pressable
    setTimeout(() => setPressed(false), 1000)
  }

  return (
    <motion.button
      className={`btn-gold relative overflow-hidden ${className}`}
      onClick={handleClick}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{
        opacity: 1,
        scale: 1,
        boxShadow: pulsate
          ? [
              '0 0 0px rgba(201, 168, 76, 0)',
              '0 0 30px rgba(201, 168, 76, 0.4)',
              '0 0 0px rgba(201, 168, 76, 0)',
            ]
          : '0 0 0px rgba(201, 168, 76, 0)',
      }}
      transition={{
        opacity: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
        scale: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
        boxShadow: pulsate
          ? { duration: 2, repeat: Infinity, repeatDelay: 1 }
          : { duration: 0 },
      }}
      whileTap={{ scale: 0.96 }}
      aria-label="RSVP to this wedding"
    >
      {/* Ripple effect on press */}
      <AnimatePresence>
        {pressed && (
          <motion.span
            className="absolute inset-0 bg-white rounded-none"
            initial={{ opacity: 0.3, scale: 0 }}
            animate={{ opacity: 0, scale: 4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{ originX: '50%', originY: '50%' }}
          />
        )}
      </AnimatePresence>

      <span className="relative z-10 tracking-widest">Reply to Invitation</span>
    </motion.button>
  )
}
