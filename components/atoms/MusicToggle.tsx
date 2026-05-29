'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface MusicToggleProps {
  /** Absolute or relative URL to the audio track */
  src: string
}

/**
 * Floating bottom-right music toggle.
 * Autoplays muted on mount then unmutes on first user tap
 * (browser autoplay policy requires a user gesture for audio).
 */
export function MusicToggle({ src }: MusicToggleProps) {
  const audioRef  = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [ready,   setReady]   = useState(false)
  const [visible, setVisible] = useState(false)

  // Create audio element once
  useEffect(() => {
    const audio = new Audio(src)
    audio.loop   = true
    audio.volume = 0.35
    audioRef.current = audio

    audio.addEventListener('canplaythrough', () => setReady(true), { once: true })
    audio.load()

    // Show the button after a short delay (let the envelope scene finish)
    const t = setTimeout(() => setVisible(true), 1500)

    return () => {
      clearTimeout(t)
      audio.pause()
      audio.src = ''
    }
  }, [src])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return

    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {
        // Autoplay blocked — still flip the icon so user gets feedback
        setPlaying(true)
      })
    }
  }

  if (!visible) return null

  return (
    <AnimatePresence>
      <motion.button
        key="music-toggle"
        initial={{ opacity: 0, scale: 0.7, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.7 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        onClick={toggle}
        aria-label={playing ? 'Pause music' : 'Play music'}
        title={playing ? 'Pause music' : 'Play music'}
        className="fixed bottom-6 right-4 z-50 w-11 h-11 rounded-full flex items-center justify-center"
        style={{
          background:  'rgba(8, 12, 10, 0.85)',
          border:      '1px solid rgba(12, 168, 110, 0.25)',
          backdropFilter: 'blur(8px)',
          boxShadow:   playing
            ? '0 0 18px rgba(12,168,110,0.35), inset 0 1px 0 rgba(12,168,110,0.1)'
            : '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(12,168,110,0.06)',
          transition:  'box-shadow 0.4s ease',
        }}
        whileTap={{ scale: 0.92 }}
      >
        {/* Pulsing ring when playing */}
        {playing && (
          <motion.span
            className="absolute inset-0 rounded-full"
            animate={{ scale: [1, 1.55], opacity: [0.4, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
            style={{ border: '1px solid rgba(12,168,110,0.5)' }}
          />
        )}

        <AnimatePresence mode="wait">
          {playing ? (
            <motion.span
              key="playing"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.2 }}
            >
              <EqualizerIcon />
            </motion.span>
          ) : (
            <motion.span
              key="paused"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.2 }}
            >
              <MusicNoteIcon muted={!ready} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </AnimatePresence>
  )
}

function MusicNoteIcon({ muted }: { muted?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={muted ? 'rgba(12,168,110,0.4)' : '#0CA86E'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

// Animated bars equalizer icon for "playing" state
function EqualizerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      {[
        { x: 1,  heights: [3, 10, 6],  delay: 0 },
        { x: 5,  heights: [8, 3, 11],  delay: 0.2 },
        { x: 9,  heights: [5, 12, 4],  delay: 0.1 },
        { x: 13, heights: [10, 4, 8],  delay: 0.3 },
      ].map(({ x, heights, delay }) => (
        <motion.rect
          key={x}
          x={x}
          width={2}
          rx={1}
          fill="#0CA86E"
          animate={{ height: heights, y: heights.map(h => 16 - h) }}
          transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut', delay }}
        />
      ))}
    </svg>
  )
}
