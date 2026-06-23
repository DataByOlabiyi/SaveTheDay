'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { MusicTrack } from '@/lib/db/types'

interface MusicPlayerProps {
  tracks:    MusicTrack[]   // multi-track playlist
  /** Legacy: single track URL */
  src?:      string
}

export function MusicPlayer({ tracks: propTracks, src }: MusicPlayerProps) {
  // Normalise: legacy single-track or new playlist
  const tracks: MusicTrack[] = propTracks.length > 0
    ? propTracks
    : src ? [{ url: src, title: 'Background Music' }] : []

  const [trackIdx, setTrackIdx]   = useState(0)
  const [playing, setPlaying]     = useState(false)
  const [expanded, setExpanded]   = useState(false)
  const [volume, setVolume]       = useState(0.6)
  const audioRef = useRef<HTMLAudioElement>(null)

  const currentTrack = tracks[trackIdx]

  // Sync audio element
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    audio.src    = currentTrack.url
    audio.volume = volume
    if (playing) audio.play().catch(() => setPlaying(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIdx, currentTrack?.url])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
  }, [volume])

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      try {
        await audio.play()
        setPlaying(true)
      } catch { /* autoplay blocked */ }
    }
  }, [playing])

  const nextTrack = useCallback(() => {
    setTrackIdx(i => (i + 1) % tracks.length)
    if (playing && audioRef.current) {
      audioRef.current.play().catch(() => {})
    }
  }, [tracks.length, playing])

  const prevTrack = useCallback(() => {
    setTrackIdx(i => (i - 1 + tracks.length) % tracks.length)
    if (playing && audioRef.current) {
      audioRef.current.play().catch(() => {})
    }
  }, [tracks.length, playing])

  // Auto-advance on track end
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onEnded = () => {
      if (tracks.length > 1) nextTrack()
      else { setPlaying(false) }
    }
    audio.addEventListener('ended', onEnded)
    return () => audio.removeEventListener('ended', onEnded)
  }, [tracks.length, nextTrack])

  if (tracks.length === 0) return null

  return (
    <div className="fixed bottom-6 left-6 z-50" aria-label="Music player">
      <audio ref={audioRef} preload="metadata" />

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-12 left-0 rounded-xl p-4 w-64 bg-charcoal-deep"
            style={{
              border: '1px solid rgba(12,168,110,0.2)',
              boxShadow: '0 0 30px rgba(12,168,110,0.1)',
            }}
          >
            {/* Track info */}
            <div className="mb-3">
              <p className="text-xs text-ivory/70 truncate font-body">{currentTrack?.title}</p>
              {currentTrack?.artist && (
                <p className="text-xs text-ivory/30 truncate font-body">{currentTrack.artist}</p>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 mb-3">
              {tracks.length > 1 && (
                <button
                  onClick={prevTrack}
                  className="text-ivory/40 hover:text-ivory/80 transition-colors"
                  aria-label="Previous track"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
              <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: 'linear-gradient(135deg, #0CA86E, #3DD9A0)',
                  color: '#080C0A',
                }}
                aria-label={playing ? 'Pause music' : 'Play music'}
              >
                {playing ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                )}
              </button>
              {tracks.length > 1 && (
                <button
                  onClick={nextTrack}
                  className="text-ivory/40 hover:text-ivory/80 transition-colors"
                  aria-label="Next track"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="rgba(12,168,110,0.5)" aria-hidden="true">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              </svg>
              <input
                type="range"
                min="0" max="1" step="0.05"
                value={volume}
                onChange={e => setVolume(Number(e.target.value))}
                className="flex-1 h-0.5 accent-emerald-DEFAULT"
                aria-label="Volume"
              />
              <svg width="12" height="12" viewBox="0 0 24 24" fill="rgba(12,168,110,0.5)" aria-hidden="true">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" stroke="rgba(12,168,110,0.5)" strokeWidth="2" strokeLinecap="round" fill="none"/>
              </svg>
            </div>

            {/* Playlist */}
            {tracks.length > 1 && (
              <div className="mt-3 space-y-1">
                {tracks.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => { setTrackIdx(i); if (playing && audioRef.current) audioRef.current.play().catch(() => {}) }}
                    className={`w-full text-left px-2 py-1 rounded text-xs font-body truncate transition-colors ${
                      i === trackIdx
                        ? 'text-emerald-DEFAULT bg-emerald-DEFAULT/10'
                        : 'text-ivory/35 hover:text-ivory/60'
                    }`}
                    aria-label={`Play ${t.title}`}
                    aria-current={i === trackIdx}
                  >
                    {i === trackIdx && playing ? '♫ ' : '  '}{t.title}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        onClick={() => setExpanded(e => !e)}
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{
          background: 'rgba(8,12,10,0.9)',
          border: `1px solid ${playing ? 'rgba(12,168,110,0.5)' : 'rgba(12,168,110,0.2)'}`,
          backdropFilter: 'blur(8px)',
          boxShadow: playing ? '0 0 20px rgba(12,168,110,0.2)' : 'none',
        }}
        whileTap={{ scale: 0.92 }}
        aria-label={`${playing ? 'Music playing' : 'Music paused'} — click to ${expanded ? 'close' : 'open'} player`}
        aria-expanded={expanded}
      >
        <AnimatePresence mode="wait">
          {playing ? (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-end gap-0.5"
              aria-hidden="true"
            >
              {[1, 2, 3].map(i => (
                <motion.span
                  key={i}
                  className="block w-0.5 rounded-full"
                  style={{ background: '#0CA86E' }}
                  animate={{ height: ['4px', '10px', '4px'] }}
                  transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div key="paused" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="rgba(12,168,110,0.6)" aria-hidden="true">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 010 7.07" stroke="rgba(12,168,110,0.6)" strokeWidth="2" fill="none" strokeLinecap="round"/>
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  )
}
