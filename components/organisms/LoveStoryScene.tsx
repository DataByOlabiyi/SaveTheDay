'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import Image from 'next/image'
import { GoldDivider } from '@/components/atoms/GoldText'
import { Events } from '@/lib/analytics/events'
import type { StoryMilestone } from '@/lib/db/types'

interface LoveStorySceneProps {
  weddingId: string
  guestId?:  string
  /** Pre-fetched milestones (SSR-friendly) */
  initialMilestones?: StoryMilestone[]
}

// Fallback demo milestones when DB is empty / demo mode
const DEMO_MILESTONES: StoryMilestone[] = [
  { id: '1', wedding_id: '', sort_order: 1, title: 'We Met', date_label: 'March 2019',
    description: 'A chance encounter at a mutual friend\'s birthday dinner. Words felt easy, time disappeared.',
    emoji: '✨', media_urls: [], created_at: '' },
  { id: '2', wedding_id: '', sort_order: 2, title: 'First Date', date_label: 'April 2019',
    description: 'Coffee that stretched into five hours of conversation. Two missed movies and zero regrets.',
    emoji: '☕', media_urls: [], created_at: '' },
  { id: '3', wedding_id: '', sort_order: 3, title: 'First Trip Together', date_label: 'December 2019',
    description: 'A spontaneous weekend away. Sunsets, laughter, and the quiet certainty of something real.',
    emoji: '✈️', media_urls: [], created_at: '' },
  { id: '4', wedding_id: '', sort_order: 4, title: 'The Proposal', date_label: 'February 2021',
    description: 'Under the stars, down on one knee. She said yes before he could finish the sentence.',
    emoji: '💍', media_urls: [], created_at: '' },
  { id: '5', wedding_id: '', sort_order: 5, title: 'Forever Begins', date_label: 'Our Wedding Day',
    description: 'Every moment led here. We can\'t wait to begin this next chapter with you by our side.',
    emoji: '💌', media_urls: [], created_at: '' },
]

function MilestoneCard({
  milestone,
  index,
  isLast,
}: {
  milestone: StoryMilestone
  index: number
  isLast: boolean
}) {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [lightboxImg, setLightboxImg] = useState<string | null>(null)
  const isEven = index % 2 === 0

  return (
    <>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, x: isEven ? -30 : 30 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className={`relative flex flex-col md:flex-row items-start gap-6 ${isEven ? '' : 'md:flex-row-reverse'}`}
      >
        {/* Timeline connector */}
        <div className="hidden md:flex flex-col items-center flex-shrink-0" style={{ width: 60 }}>
          {/* Dot */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg z-10 flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(12,168,110,0.15), rgba(12,168,110,0.05))',
              border: '1px solid rgba(12,168,110,0.35)',
              boxShadow: '0 0 20px rgba(12,168,110,0.15)',
            }}
            aria-hidden="true"
          >
            {milestone.emoji ?? '♥'}
          </div>
          {/* Line down */}
          {!isLast && (
            <motion.div
              initial={{ scaleY: 0 }}
              animate={inView ? { scaleY: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
              className="w-px flex-1 mt-2"
              style={{
                background: 'linear-gradient(to bottom, rgba(12,168,110,0.3), rgba(12,168,110,0.05))',
                minHeight: 40,
                transformOrigin: 'top',
              }}
            />
          )}
        </div>

        {/* Mobile dot */}
        <div className="md:hidden flex items-center gap-3 mb-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
            style={{
              background: 'rgba(12,168,110,0.1)',
              border: '1px solid rgba(12,168,110,0.3)',
            }}
          >
            {milestone.emoji ?? '♥'}
          </div>
          {milestone.date_label && (
            <span
              className="font-body text-emerald-DEFAULT/60"
              style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}
            >
              {milestone.date_label}
            </span>
          )}
        </div>

        {/* Card */}
        <div
          className="flex-1 rounded-lg p-6 min-w-0"
          style={{
            background: 'rgba(12,168,110,0.03)',
            border: '1px solid rgba(12,168,110,0.1)',
          }}
        >
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              {milestone.date_label && (
                <p
                  className="font-body text-emerald-DEFAULT/60 mb-1"
                  style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}
                >
                  {milestone.date_label}
                </p>
              )}
              <h3
                className="font-display text-ivory/90"
                style={{ fontSize: 'clamp(1.1rem, 3vw, 1.4rem)', fontWeight: 300, fontStyle: 'italic' }}
              >
                {milestone.title}
              </h3>
            </div>
          </div>

          {milestone.description && (
            <p className="font-body text-ivory/55 text-sm leading-relaxed mb-4">
              {milestone.description}
            </p>
          )}

          {/* Media grid */}
          {milestone.media_urls.length > 0 && (
            <div className={`grid gap-2 ${milestone.media_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {milestone.media_urls.slice(0, 4).map((media, mi) => (
                <div key={mi} className="relative rounded overflow-hidden" style={{ aspectRatio: '4/3' }}>
                  {media.type === 'video' ? (
                    <video
                      src={media.url}
                      controls
                      className="w-full h-full object-cover"
                      aria-label={media.caption ?? `Story video ${mi + 1}`}
                    />
                  ) : (
                    <button
                      onClick={() => setLightboxImg(media.url)}
                      className="w-full h-full block"
                      aria-label={`View photo: ${media.caption ?? milestone.title}`}
                    >
                      <Image
                        src={media.url}
                        alt={media.caption ?? milestone.title}
                        fill
                        className="object-cover transition-transform duration-500 hover:scale-105"
                        sizes="(max-width: 768px) 50vw, 30vw"
                      />
                    </button>
                  )}
                  {media.caption && (
                    <div className="absolute bottom-0 inset-x-0 p-1.5 bg-obsidian/70">
                      <p className="text-ivory/70 font-body" style={{ fontSize: '0.6rem' }}>
                        {media.caption}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Inline lightbox */}
      <AnimatePresence>
        {lightboxImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImg(null)}
            className="fixed inset-0 z-[200] bg-obsidian/95 flex items-center justify-center p-4 cursor-zoom-out"
            role="dialog"
            aria-modal="true"
            aria-label="Full-size photo"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative max-w-3xl w-full max-h-[85vh]"
              onClick={e => e.stopPropagation()}
            >
              <Image
                src={lightboxImg}
                alt="Full size photo"
                width={900}
                height={600}
                className="object-contain w-full h-auto max-h-[80vh]"
                style={{ borderRadius: 4 }}
              />
              <button
                onClick={() => setLightboxImg(null)}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-ivory/80 hover:text-ivory"
                aria-label="Close photo"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export function LoveStoryScene({ weddingId, guestId, initialMilestones }: LoveStorySceneProps) {
  const [milestones, setMilestones] = useState<StoryMilestone[]>(
    initialMilestones ?? DEMO_MILESTONES
  )
  const [tracked, setTracked] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)
  const inView     = useInView(sectionRef, { once: true, amount: 0.2 })

  // Lazy-load if not pre-fetched
  useEffect(() => {
    if (initialMilestones) return
    fetch(`/api/story?weddingId=${weddingId}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.milestones) && data.milestones.length > 0) {
          setMilestones(data.milestones)
        }
      })
      .catch(() => {})
  }, [weddingId, initialMilestones])

  // Track story viewed once it scrolls into view
  useEffect(() => {
    if (inView && !tracked) {
      setTracked(true)
      Events.storyViewed(weddingId, guestId)
    }
  }, [inView, tracked, weddingId, guestId])

  return (
    <section
      ref={sectionRef}
      id="section-story"
      className="relative py-20 px-6"
      aria-labelledby="story-heading"
    >
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mb-16"
      >
        <p
          className="font-body tracking-[0.3em] uppercase mb-3"
          style={{ fontSize: '0.65rem', color: 'rgba(12, 168, 110, 0.5)' }}
        >
          Our Story
        </p>
        <h2
          id="story-heading"
          className="font-display text-ivory/80 mb-4"
          style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 300, fontStyle: 'italic' }}
        >
          How it all began
        </h2>
        <GoldDivider className="mx-auto" />
      </motion.div>

      {/* Timeline */}
      <div className="max-w-2xl mx-auto space-y-10">
        {milestones.map((milestone, i) => (
          <MilestoneCard
            key={milestone.id}
            milestone={milestone}
            index={i}
            isLast={i === milestones.length - 1}
          />
        ))}
      </div>
    </section>
  )
}
