'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { EnvelopeScene } from '@/components/organisms/EnvelopeScene'
import { VenueSection } from '@/components/organisms/VenueSection'
import { RSVPForm } from '@/components/organisms/RSVPForm'

const LoveStoryScene = dynamic(() => import('@/components/organisms/LoveStoryScene').then(m => ({ default: m.LoveStoryScene })), {
  ssr: false,
  loading: () => <div className="min-h-screen" />,
})

const MontageScene = dynamic(() => import('@/components/organisms/MontageScene').then(m => ({ default: m.MontageScene })), {
  ssr: false,
  loading: () => <div className="min-h-screen" />,
})

const GalleryScene = dynamic(() => import('@/components/organisms/GalleryScene').then(m => ({ default: m.GalleryScene })), {
  ssr: false,
  loading: () => <div className="min-h-screen" />,
})

const GuestbookScene = dynamic(() => import('@/components/organisms/GuestbookScene').then(m => ({ default: m.GuestbookScene })), {
  ssr: false,
  loading: () => <div className="min-h-screen" />,
})
import { CountdownTimer } from '@/components/molecules/CountdownTimer'
import { NameReveal } from '@/components/molecules/NameReveal'
import { GoldDivider } from '@/components/atoms/GoldText'
import { ParticleField } from '@/components/atoms/ParticleField'
import { RSVPButton } from '@/components/molecules/RSVPButton'
import { ShareableCard } from '@/components/molecules/ShareableCard'
import { AddToCalendarButton } from '@/components/molecules/AddToCalendarButton'
import { GuestPhotoUpload } from '@/components/molecules/GuestPhotoUpload'
import { SectionDots } from '@/components/atoms/SectionDots'
import { MusicPlayer } from '@/components/molecules/MusicPlayer'
import { QRCodeModal } from '@/components/molecules/QRCodeModal'
import { ThemeToggle } from '@/components/atoms/ThemeToggle'
import { Events } from '@/lib/analytics/events'
import { formatWeddingDate } from '@/lib/personalization/guest'
import { usePrefersReducedMotion } from '@/lib/utils/motion'
import { getThemeVars } from '@/lib/themes'
import type { Wedding, Guest, EventScheduleItem, StoryMilestone, GalleryAlbum, GalleryPhoto } from '@/lib/db/types'

type AppPhase = 'intro' | 'revealed' | 'rsvp'

interface TheUnveilingPageProps {
  wedding:    Wedding
  guest?:     Guest | null
  schedule?:  EventScheduleItem[]
  milestones?: StoryMilestone[]
  albums?:     GalleryAlbum[]
  photos?:     GalleryPhoto[]
}

// Build section list — only include sections that have actual content to show
function buildSections(
  config: Wedding['config'],
  milestonesCount: number,
  albumsCount: number,
) {
  const sections = [{ id: 'section-hero', label: 'Welcome' }]
  // Story: only show if config allows AND there are milestones with descriptions
  if (config.show_story !== false && milestonesCount > 0)
    sections.push({ id: 'section-story', label: 'Our Story' })
  // Countdown sits early to build anticipation
  if (config.show_countdown !== false) sections.push({ id: 'section-countdown', label: 'Countdown' })
  if (config.montage_images || config.montage_video)
    sections.push({ id: 'section-montage', label: 'Gallery' })
  // Gallery: only show if config allows AND there are albums with photos
  if (config.show_gallery !== false && albumsCount > 0)
    sections.push({ id: 'section-gallery', label: 'Photos' })
  if (config.rsvp_open !== false) sections.push({ id: 'section-rsvp', label: 'RSVP' })
  if (config.show_schedule || config.show_venue_map || config.dress_code ||
      (config.show_accommodations && config.accommodations?.length))
    sections.push({ id: 'section-venue', label: 'Details' })
  if (config.show_gift_registry)
    sections.push({ id: 'section-registry', label: 'Gifts' })
  if (config.show_guestbook !== false) sections.push({ id: 'section-guestbook', label: 'Guestbook' })
  return sections
}

const VISITED_KEY = 'stv_visited'

export function TheUnveilingPage({ wedding, guest, schedule = [], milestones, albums, photos }: TheUnveilingPageProps) {
  const prefersReducedMotion = usePrefersReducedMotion()

  // Always start from a safe SSR default — useEffect fast-forwards for return visitors
  // and for users who prefer reduced motion (skip straight to the revealed state).
  const [phase, setPhase]                     = useState<AppPhase>('intro')
  const [nameRevealDone, setNameRevealDone]   = useState(false)

  useEffect(() => {
    try {
      // Skip the cinematic intro for users who prefer reduced motion
      if (prefersReducedMotion || localStorage.getItem(VISITED_KEY)) {
        setPhase('revealed')
        setNameRevealDone(true)
      }
    } catch {}
  }, [prefersReducedMotion])
  const [showRSVP, setShowRSVP]               = useState(false)
  const [rsvpDone, setRsvpDone]               = useState(false)
  const [rsvpStatus, setRsvpStatus]           = useState<'attending' | 'declined' | null>(null)
  const [hashtagCopied, setHashtagCopied]     = useState(false)
  const [showQR, setShowQR]                   = useState(false)
  const [showRSVPBurst, setShowRSVPBurst]     = useState(false)
  const [rsvpBurstOrigin, setRsvpBurstOrigin] = useState<{ x: number; y: number } | null>(null)
  const rsvpSectionRef  = useRef<HTMLDivElement>(null)
  const rsvpRef         = useRef<HTMLDivElement>(null)
  const scrollYRef      = useRef(0)

  const { couple_names, wedding_date, venue, venue_address, city, config } = wedding
  const weddingDate = formatWeddingDate(wedding_date)
  const guestName   = guest?.name
  const firstName   = guestName?.split(' ')[0]
  const monogram    = (couple_names.name1[0] ?? '') + (couple_names.name2[0] ?? '')

  // Determine music: prefer multi-track playlist, fall back to single track
  const musicTracks = config.music_tracks?.length
    ? config.music_tracks
    : config.music_track
    ? [{ url: config.music_track, title: 'Background Music' }]
    : []

  const activeSections = buildSections(config, milestones?.length ?? 0, albums?.length ?? 0)

  // Track page open
  useEffect(() => {
    Events.opened(wedding.id, guest?.id)
    if (guest?.id && !guest.opened_at) {
      fetch('/api/guest/mark-opened', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ guestId: guest.id }),
      })
    }
  }, [wedding.id, guest?.id, guest?.opened_at])

  // Lock body scroll during intro; save/restore position to prevent iOS scroll-jump
  useEffect(() => {
    if (phase === 'intro') {
      scrollYRef.current = window.scrollY
      document.body.classList.add('scroll-locked')
      document.body.style.top = `-${scrollYRef.current}px`
    } else {
      document.body.classList.remove('scroll-locked')
      document.body.style.top = ''
      window.scrollTo(0, scrollYRef.current)
    }
    return () => {
      document.body.classList.remove('scroll-locked')
      document.body.style.top = ''
      window.scrollTo(0, scrollYRef.current)
    }
  }, [phase])

  const handleSealCracked = () => {
    Events.sealTapped(wedding.id, guest?.id)
    try { localStorage.setItem(VISITED_KEY, '1') } catch { /* storage blocked */ }
    setPhase('revealed')
  }

  const handleScrollToRSVP = () => {
    setShowRSVP(true)
    setTimeout(() => rsvpRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  const handleRSVPSuccess = useCallback((status: 'attending' | 'declined') => {
    setRsvpDone(true)
    setRsvpStatus(status)
    if (status === 'attending' && rsvpSectionRef.current) {
      const rect = rsvpSectionRef.current.getBoundingClientRect()
      setRsvpBurstOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
      setShowRSVPBurst(true)
    }
  }, [])

  const handleCopyHashtag = async () => {
    const tag = config.hashtag ?? ''
    try { await navigator.clipboard.writeText(tag) }
    catch { /* fallback not needed for hashtag */ }
    setHashtagCopied(true)
    setTimeout(() => setHashtagCopied(false), 2200)
  }

  const handleShareInvitation = () => {
    // Use the generic wedding URL so forwarded shares don't expose guest-specific links
    const genericUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/e/${wedding.slug}`
      : `/e/${wedding.slug}`
    const shareText = `You're invited to ${couple_names.name1} & ${couple_names.name2}'s Wedding`
    if (navigator.share) {
      navigator.share({ title: shareText, url: genericUrl }).catch(() => {})
    } else {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(`${shareText}: ${genericUrl}`)}`,
        '_blank'
      )
    }
    Events.shared(wedding.id, guest?.id, 'invite_link')
  }

  const calendarEvent = {
    title:       `${couple_names.name1} & ${couple_names.name2}'s Wedding`,
    startDate:   wedding_date,
    location:    `${venue}${venue_address ? `, ${venue_address}` : ''}, ${city}`,
    description: `You're invited to the wedding of ${couple_names.name1} & ${couple_names.name2}`,
    startTime:   config.start_time,
    endTime:     config.end_time,
  } as const

  const inviteUrl = typeof window !== 'undefined' ? window.location.href : ''

  const themeVars = getThemeVars(config.invitation_theme)

  return (
    <div className="min-h-screen bg-obsidian" style={themeVars}>
      {/* Skip navigation for screen readers */}
      <a href="#section-hero" className="skip-nav">Skip to content</a>

      {/* Theme toggle */}
      <ThemeToggle />

      {/* ── PHASE 1: Intro ── */}
      <AnimatePresence>
        {phase === 'intro' && (
          <motion.div
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50"
          >
            <EnvelopeScene
              visible
              onSealCracked={handleSealCracked}
              monogram={monogram}
            />
            {/* Keyboard / accessibility bypass — also useful for screen readers */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3 }}
              onClick={handleSealCracked}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 font-body text-ivory/30 hover:text-ivory/60 focus:text-ivory/60 transition-colors outline-none focus-visible:ring-1 focus-visible:ring-gold-DEFAULT rounded px-3 py-1"
              style={{ fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase' }}
              aria-label="Skip the envelope animation"
            >
              Skip
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PHASE 2+: Main content ── */}
      <AnimatePresence>
        {phase !== 'intro' && (
          <motion.main
            id="main-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            {/* Ambient particles */}
            <ParticleField className="fixed inset-0 w-full h-full pointer-events-none" count={30} />

            {/* Section progress dots */}
            <SectionDots sections={activeSections} />

            {/* Music player — multi-track */}
            {musicTracks.length > 0 && (
              <MusicPlayer tracks={musicTracks} />
            )}

            {/* RSVP confetti burst */}
            {showRSVPBurst && rsvpBurstOrigin && (
              <div className="fixed inset-0 pointer-events-none z-50">
                <ParticleField
                  className="w-full h-full" burst
                  burstOrigin={rsvpBurstOrigin}
                  onBurstComplete={() => setShowRSVPBurst(false)}
                />
              </div>
            )}

            {/* ── Sticky RSVP shortcut pill — visible for logged-in guests before they RSVP ── */}
            <AnimatePresence>
              {config.rsvp_open !== false && guest && !rsvpDone && !showRSVP && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={{ duration: 0.5, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="fixed bottom-6 right-4 z-40 safe-bottom"
                >
                  <button
                    onClick={handleScrollToRSVP}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full font-body text-xs backdrop-blur-sm transition-all active:scale-95"
                    style={{
                      background: 'rgba(8,12,10,0.75)',
                      border: '1px solid rgba(201,168,76,0.35)',
                      color: 'rgba(201,168,76,0.85)',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                    }}
                    aria-label="Jump to RSVP"
                  >
                    RSVP
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                      <path d="M12 5v14M5 12l7 7 7-7" />
                    </svg>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* QR Modal */}
            <AnimatePresence>
              {showQR && (
                <QRCodeModal
                  url={inviteUrl}
                  title="Save the Date"
                  subtitle={`${couple_names.name1} & ${couple_names.name2}`}
                  whatsappText={`You're invited! ${couple_names.name1} & ${couple_names.name2}'s wedding: ${inviteUrl}`}
                  emailSubject={`You're invited — ${couple_names.name1} & ${couple_names.name2}`}
                  emailBody={`Open your personal wedding invitation:`}
                  onClose={() => setShowQR(false)}
                />
              )}
            </AnimatePresence>

            {/* ── HERO ── */}
            <section
              id="section-hero"
              tabIndex={-1}
              className="relative min-h-[100svh] flex flex-col items-center justify-center px-6 py-20"
              aria-label="Wedding invitation hero"
            >
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(12, 168, 110, 0.07) 0%, transparent 70%)',
              }} />

              {guestName && (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                  className="font-body text-xs tracking-[0.35em] uppercase text-emerald-DEFAULT/60 mb-8"
                >
                  {firstName ? `Welcome, ${firstName}` : 'Welcome'}
                </motion.p>
              )}

              <NameReveal
                name1={couple_names.name1}
                name2={couple_names.name2}
                delay={400}
                onComplete={() => setNameRevealDone(true)}
                className="mb-10 w-full max-w-sm mx-auto"
              />

              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={nameRevealDone ? { opacity: 1, scaleX: 1 } : {}}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                <GoldDivider wide className="mb-10" />
              </motion.div>

              <AnimatePresence>
                {nameRevealDone && (
                  <>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="text-center mb-10"
                    >
                      <p className="font-body text-eyebrow tracking-[0.35em] uppercase mb-3"
                        style={{ color: 'rgba(12, 168, 110, 0.6)' }}>
                        Save the date
                      </p>
                      <p className="font-display text-gold-gradient"
                        style={{ fontSize: 'clamp(1.25rem, 4vw, 2rem)', fontWeight: 300, letterSpacing: '0.08em' }}>
                        {weddingDate.day} {weddingDate.month}
                      </p>
                      <p className="font-display text-ivory/60"
                        style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)', fontWeight: 300, letterSpacing: '0.2em' }}>
                        {weddingDate.year}
                      </p>
                      {config.intro_text && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4, duration: 0.8 }}
                          className="font-display text-ivory/35 mt-3"
                          style={{ fontSize: 'clamp(0.75rem, 2vw, 0.9rem)', fontStyle: 'italic', fontWeight: 300, letterSpacing: '0.08em' }}
                        >
                          {config.intro_text}
                        </motion.p>
                      )}
                    </motion.div>

                    {/* Venue */}
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className="text-center mb-12"
                    >
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <svg width="12" height="14" viewBox="0 0 12 14" fill="none" aria-hidden="true">
                          <path d="M6 0C2.68 0 0 2.68 0 6C0 10.5 6 14 6 14C6 14 12 10.5 12 6C12 2.68 9.32 0 6 0ZM6 8C4.9 8 4 7.1 4 6C4 4.9 4.9 4 6 4C7.1 4 8 4.9 8 6C8 7.1 7.1 8 6 8Z" fill="rgba(12, 168, 110, 0.6)" />
                        </svg>
                        <p className="font-body text-eyebrow tracking-widest uppercase"
                          style={{ color: 'rgba(12, 168, 110, 0.6)' }}>
                          {city}
                        </p>
                      </div>
                      <p className="font-display text-ivory/70 text-subtitle"
                        style={{ fontWeight: 300, fontStyle: 'italic', letterSpacing: '0.04em' }}>
                        {venue}
                      </p>
                      {venue_address && (
                        <p className="font-body text-ivory/35 mt-1" style={{ fontSize: '0.8rem', letterSpacing: '0.04em' }}>
                          {venue_address}
                        </p>
                      )}
                    </motion.div>

                    {/* Scroll indicator + QR */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 }}
                      className="flex flex-col items-center gap-4"
                    >
                      {/* QR code button */}
                      <button
                        onClick={() => setShowQR(true)}
                        className="flex items-center gap-1.5 font-body text-ivory/25 hover:text-ivory/50 transition-colors"
                        style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}
                        aria-label="Show QR code for this invitation"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                          <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/>
                        </svg>
                        QR Code
                      </button>

                      <p className="font-body text-xs tracking-[0.3em] uppercase text-ivory/25">Scroll</p>
                      <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                        <svg width="16" height="24" viewBox="0 0 16 24" fill="none" aria-hidden="true">
                          <rect x="1" y="1" width="14" height="22" rx="7" stroke="rgba(12, 168, 110, 0.3)" strokeWidth="1.5" />
                          <motion.rect x="6.5" y="5" width="3" height="5" rx="1.5" fill="rgba(12, 168, 110, 0.6)"
                            animate={{ y: [5, 11, 5] }} transition={{ duration: 1.5, repeat: Infinity }} />
                        </svg>
                      </motion.div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </section>

            {/* ── LOVE STORY ── */}
            {config.show_story !== false && (
              <LoveStoryScene
                weddingId={wedding.id}
                guestId={guest?.id}
                initialMilestones={milestones}
              />
            )}

            {/* ── COUNTDOWN ── (placed early to build anticipation before photos/RSVP) */}
            {config.show_countdown !== false && (
              <motion.section
                id="section-countdown"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 1 }}
                className="py-20 px-6"
                aria-label="Wedding countdown"
              >
                <div className="text-center mb-10">
                  <p className="font-body text-eyebrow tracking-[0.3em] uppercase mb-3"
                    style={{ color: 'rgba(12, 168, 110, 0.5)' }}>
                    Counting down
                  </p>
                  <GoldDivider />
                </div>
                <CountdownTimer weddingDate={wedding_date} className="justify-center" />
              </motion.section>
            )}

            {/* ── MONTAGE (legacy) — shown if montage images configured ── */}
            {(config.montage_images?.length || config.montage_video) && (
              <section id="section-montage" className="relative py-16 px-0">
                <div className="text-center mb-10 px-6">
                  <p className="font-body text-eyebrow tracking-[0.3em] uppercase mb-3"
                    style={{ color: 'rgba(12, 168, 110, 0.5)' }}>
                    Moments
                  </p>
                  <GoldDivider className="mx-auto" />
                </div>
                <MontageScene
                  images={config.montage_images?.map(id => ({ publicId: id }))}
                  videoPublicId={config.montage_video}
                  weddingId={wedding.id}
                  guestId={guest?.id}
                />
              </section>
            )}

            {/* ── GALLERY ── */}
            {config.show_gallery !== false && (
              <GalleryScene
                weddingId={wedding.id}
                guestId={guest?.id}
                allowDownloads={config.allow_downloads !== false}
                watermarkDownloads={config.watermark_downloads === true}
                watermarkText={`${couple_names.name1} & ${couple_names.name2} • SaveTheDay`}
                initialAlbums={albums}
                initialPhotos={photos}
                galleryHref={
                  guest?.slug
                    ? `/e/${wedding.slug}/gallery?guest=${guest.slug}`
                    : `/e/${wedding.slug}/gallery`
                }
              />
            )}

            {/* ── RSVP ── */}
            {config.rsvp_open !== false && <section
              id="section-rsvp"
              ref={rsvpSectionRef}
              className="relative py-20 px-6 overflow-hidden"
              style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(11, 82, 64, 0.08) 50%, transparent 100%)' }}
              aria-label="RSVP"
            >
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 60%, rgba(12, 168, 110, 0.06) 0%, transparent 70%)' }} />
              <div className="relative max-w-sm mx-auto">
                {guestName ? (
                  <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ duration: 0.8 }} className="text-center mb-14">
                    <p className="font-display text-ivory/90 mb-4"
                      style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: 300, fontStyle: 'italic', lineHeight: 1.2 }}>
                      {firstName}, you&apos;re invited.
                    </p>
                    <GoldDivider className="mb-4" />
                    <p className="font-body text-ivory/50 text-sm leading-relaxed">
                      {couple_names.name1} &amp; {couple_names.name2} can&apos;t imagine<br className="hidden sm:block" />
                      this day without you.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ duration: 0.8 }} className="text-center mb-14">
                    <p className="font-display text-ivory/80"
                      style={{ fontSize: 'clamp(1.25rem, 4vw, 2rem)', fontWeight: 300, fontStyle: 'italic' }}>
                      You&apos;re invited.
                    </p>
                    <GoldDivider className="mt-4" />
                  </motion.div>
                )}

                {!guest ? (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="text-center space-y-3"
                  >
                    <p className="font-body text-ivory/40 text-sm leading-relaxed">
                      RSVP is available on your personal invitation link.
                    </p>
                    <p className="font-body text-ivory/20 text-xs tracking-wide">
                      Contact {couple_names.name1} &amp; {couple_names.name2} to receive yours.
                    </p>
                  </motion.div>
                ) : !showRSVP ? (
                  <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.3 }}
                    className="flex flex-col items-center gap-4">
                    {config.rsvp_deadline && (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 }}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                        style={{ background: 'rgba(12,168,110,0.08)', border: '1px solid rgba(12,168,110,0.2)' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(12,168,110,0.7)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span className="font-body text-emerald-DEFAULT/70" style={{ fontSize: '0.65rem', letterSpacing: '0.12em' }}>
                          RSVP by {new Date(config.rsvp_deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
                        </span>
                      </motion.div>
                    )}
                    <RSVPButton onClick={handleScrollToRSVP} className="w-full max-w-xs" />
                    <AddToCalendarButton {...calendarEvent} className="w-full max-w-xs" />

                    {/* Share row */}
                    <div className="flex items-center gap-4 mt-1">
                      <motion.button
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
                        onClick={handleShareInvitation}
                        className="flex items-center gap-1.5 font-body text-ivory/35 hover:text-ivory/60 transition-colors"
                        style={{ fontSize: '0.7rem', letterSpacing: '0.12em' }}
                        aria-label="Share this invitation"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                        </svg>
                        Share
                      </motion.button>
                      <motion.button
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}
                        onClick={() => setShowQR(true)}
                        className="flex items-center gap-1.5 font-body text-ivory/35 hover:text-ivory/60 transition-colors"
                        style={{ fontSize: '0.7rem', letterSpacing: '0.12em' }}
                        aria-label="Show QR code"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                          <rect x="3" y="14" width="7" height="7"/>
                        </svg>
                        QR Code
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div ref={rsvpRef} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }} className="pt-4">
                    {config.rsvp_deadline && (
                      <p className="text-center text-xs text-ivory/30 mb-6 tracking-wider">
                        Please RSVP by {new Date(config.rsvp_deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
                      </p>
                    )}
                    <RSVPForm
                      guestId={guest?.id}
                      guestName={guestName}
                      weddingId={wedding.id}
                      allowPlusOne={config.allow_plus_one}
                      maxPartySize={config.max_party_size}
                      collectDietary={config.collect_dietary}
                      mealOptions={config.collect_meal_choice ? config.meal_options : undefined}
                      rsvpEvents={config.rsvp_events}
                      onSuccess={handleRSVPSuccess}
                      existingStatus={guest?.rsvp_status}
                    />
                  </motion.div>
                )}
              </div>
            </section>}

            {/* ── Post-RSVP card ── */}
            <AnimatePresence>
              {rsvpDone && rsvpStatus && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="py-16 px-6"
                  aria-label="Your invitation card"
                >
                  <div className="max-w-sm mx-auto">
                    <GoldDivider wide className="mb-8" />
                    <p className="font-body text-xs tracking-[0.3em] uppercase text-ivory/30 mb-8 text-center">
                      Your invitation card
                    </p>
                    <ShareableCard
                      weddingSlug={wedding.slug} guestName={guestName} status={rsvpStatus}
                      weddingId={wedding.id} guestId={guest?.id}
                      coupleName1={couple_names.name1} coupleName2={couple_names.name2}
                    />
                    <AddToCalendarButton {...calendarEvent} className="mt-3" />
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* ── VENUE / SCHEDULE / DRESS CODE / ACCOMMODATION ── */}
            {(config.show_schedule || config.show_venue_map || config.dress_code || venue ||
              (config.show_accommodations && config.accommodations?.length)) && (
              <VenueSection
                venue={venue}
                venueAddress={venue_address}
                city={city}
                config={config}
                schedule={schedule}
              />
            )}

            {/* ── GIFT REGISTRY CTA ── */}
            {config.show_gift_registry && (
              <section
                id="section-registry"
                className="relative py-20 px-6"
                aria-labelledby="registry-cta-heading"
              >
                <div className="max-w-sm mx-auto text-center">
                  {/* Decorative ring */}
                  <div className="relative w-16 h-16 mx-auto mb-8" aria-hidden="true">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 rounded-full"
                      style={{ border: '1px dashed rgba(201,168,76,0.25)' }}
                    />
                    <div
                      className="absolute inset-2 rounded-full flex items-center justify-center text-2xl"
                      style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)' }}
                    >
                      🎁
                    </div>
                  </div>

                  <p className="font-body tracking-[0.3em] uppercase mb-3" style={{ fontSize: '0.65rem', color: 'rgba(201,168,76,0.5)' }}>
                    Gift Registry
                  </p>
                  <h2
                    id="registry-cta-heading"
                    className="font-display text-ivory/80 mb-4"
                    style={{ fontSize: 'clamp(1.25rem, 3.5vw, 2rem)', fontWeight: 300, fontStyle: 'italic' }}
                  >
                    A gift for the journey ahead
                  </h2>
                  <GoldDivider className="mb-6" />
                  <p className="font-body text-ivory/45 text-sm leading-relaxed mb-8">
                    {config.gift_registry_note ??
                      `Your presence at our wedding is the greatest gift we could ask for. If you'd like to celebrate with a gift, tap below to view our registry.`}
                  </p>
                  <motion.a
                    href={guest ? `/e/${wedding.slug}/${guest.slug}/registry` : `/e/${wedding.slug}/registry`}
                    className="btn-gold inline-flex items-center gap-2"
                    whileTap={{ scale: 0.97 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7m0 0H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zm0 0h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7" />
                    </svg>
                    View Gift Registry
                  </motion.a>
                </div>
              </section>
            )}

            {/* ── GUESTBOOK ── */}
            {config.show_guestbook !== false && (
              <motion.div
                id="section-guestbook"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.8 }}
              >
                <div className="px-6 mb-0"><GoldDivider wide /></div>
                <GuestbookScene
                  weddingId={wedding.id}
                  guestId={guest?.id}
                  guestName={guestName}
                  coupleName1={couple_names.name1}
                  coupleName2={couple_names.name2}
                  showReactions
                  readonly={!guest}
                />
              </motion.div>
            )}

            {/* ── GUEST PHOTO UPLOAD ── */}
            {config.show_post_uploads && guest && (
              <GuestPhotoUpload
                weddingId={wedding.id}
                guestId={guest.id}
                guestName={guest.name}
              />
            )}

            {/* ── FOOTER ── */}
            <footer className="py-16 px-6 text-center safe-bottom" aria-label="Footer">
              <GoldDivider wide className="mb-8" />
              <p className="font-display text-ivory/30"
                style={{ fontSize: 'clamp(1.125rem, 3vw, 1.5rem)', fontStyle: 'italic', fontWeight: 300 }}>
                {couple_names.name1} &amp; {couple_names.name2}
              </p>
              <p className="font-body text-ivory/15 text-xs tracking-widest mt-2 uppercase">
                {weddingDate.numeric}
              </p>

              {config.hashtag && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}
                  className="mt-6"
                >
                  <button
                    onClick={handleCopyHashtag}
                    aria-label={`Copy wedding hashtag ${config.hashtag}`}
                    className="group inline-flex flex-col items-center gap-2"
                  >
                    <span className="font-display text-gold-gradient group-hover:opacity-80 transition-opacity"
                      style={{ fontSize: 'clamp(1.25rem, 4vw, 2rem)', fontStyle: 'italic', fontWeight: 300, letterSpacing: '0.04em' }}>
                      {config.hashtag}
                    </span>
                    <AnimatePresence mode="wait">
                      {hashtagCopied ? (
                        <motion.span key="copied" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }} className="font-body text-emerald-DEFAULT/60"
                          style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                          ✓ Copied
                        </motion.span>
                      ) : (
                        <motion.span key="hint" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }} className="font-body text-ivory/20 group-hover:text-ivory/40 transition-colors"
                          style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                          Tap to copy
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                </motion.div>
              )}

              <p className="font-body text-ivory/10 text-xs mt-8 tracking-widest">
                Made with{' '}
                <a
                  href="https://savetheday.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-ivory/30 transition-colors underline underline-offset-2"
                >
                  Save The Day
                </a>
              </p>
            </footer>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  )
}
