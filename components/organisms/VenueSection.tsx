'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { GoldDivider } from '@/components/atoms/GoldText'
import type { WeddingConfig, EventScheduleItem } from '@/lib/db/types'

interface VenueSectionProps {
  venue:         string
  venueAddress?: string
  city:          string
  config:        WeddingConfig
  schedule:      EventScheduleItem[]
}

function ScheduleItem({
  item, index, isLast,
}: { item: EventScheduleItem; index: number; isLast: boolean }) {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="flex gap-4 group"
    >
      {/* Timeline column */}
      <div className="flex flex-col items-center flex-shrink-0 pt-1" style={{ width: 44 }}>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(12,168,110,0.15), rgba(12,168,110,0.05))',
            border: '1px solid rgba(12,168,110,0.3)',
          }}
          aria-hidden="true"
        >
          {item.emoji ?? '•'}
        </div>
        {!isLast && (
          <div
            className="w-px flex-1 mt-2 min-h-8"
            style={{ background: 'linear-gradient(to bottom, rgba(12,168,110,0.25), rgba(12,168,110,0.04))' }}
          />
        )}
      </div>

      {/* Content */}
      <div className="pb-8 min-w-0">
        <div className="flex items-baseline gap-3 mb-1 flex-wrap">
          <p
            className="font-body text-emerald-DEFAULT/70 flex-shrink-0"
            style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}
          >
            {item.time_label}
          </p>
          <h4
            className="font-display text-ivory/85"
            style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', fontWeight: 300, fontStyle: 'italic' }}
          >
            {item.title}
          </h4>
        </div>
        {item.description && (
          <p className="font-body text-ivory/45 text-sm leading-relaxed">{item.description}</p>
        )}
        {item.location && (
          <p className="font-body text-ivory/30 text-xs mt-1 flex items-center gap-1">
            <svg width="10" height="12" viewBox="0 0 12 14" fill="none" aria-hidden="true">
              <path d="M6 0C2.68 0 0 2.68 0 6C0 10.5 6 14 6 14C6 14 12 10.5 12 6C12 2.68 9.32 0 6 0ZM6 8C4.9 8 4 7.1 4 6C4 4.9 4.9 4 6 4C7.1 4 8 4.9 8 6C8 7.1 7.1 8 6 8Z" fill="rgba(12,168,110,0.4)" />
            </svg>
            {item.location}
          </p>
        )}
      </div>
    </motion.div>
  )
}

export function VenueSection({ venue, venueAddress, city, config, schedule }: VenueSectionProps) {
  const showMap      = config.show_venue_map && !!config.google_maps_url
  const showSchedule = config.show_schedule && schedule.length > 0
  const hasDressCode = !!config.dress_code

  if (!showMap && !showSchedule && !hasDressCode) return null

  return (
    <section id="section-venue" className="relative py-20 px-6" aria-labelledby="venue-heading">
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mb-16"
      >
        <p className="font-body tracking-[0.3em] uppercase mb-3"
          style={{ fontSize: '0.65rem', color: 'rgba(12, 168, 110, 0.5)' }}>
          Details
        </p>
        <h2 id="venue-heading"
          className="font-display text-ivory/80 mb-4"
          style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 300, fontStyle: 'italic' }}>
          The Celebration
        </h2>
        <GoldDivider className="mx-auto" />
      </motion.div>

      <div className="max-w-2xl mx-auto space-y-14">

        {/* ── Venue + Map ── */}
        {(venue || showMap) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="font-body text-xs tracking-[0.25em] uppercase text-emerald-DEFAULT/50 mb-4">
              Venue
            </p>
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(12,168,110,0.12)' }}>
              {/* Map embed */}
              {showMap && (
                <div className="relative overflow-hidden" style={{ height: 220 }}>
                  <iframe
                    src={`${config.google_maps_url}&output=embed`}
                    width="100%"
                    height="220"
                    style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg)', width: '100%' }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`Map to ${venue}`}
                    aria-label={`Google Maps directions to ${venue}`}
                  />
                </div>
              )}
              {/* Venue details */}
              <div className="p-5" style={{ background: 'rgba(12,168,110,0.03)' }}>
                <p
                  className="font-display text-ivory/85 mb-1"
                  style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', fontWeight: 300, fontStyle: 'italic' }}
                >
                  {venue}
                </p>
                {venueAddress && (
                  <p className="font-body text-ivory/40 text-sm">{venueAddress}</p>
                )}
                <p className="font-body text-ivory/30 text-xs mt-0.5">{city}</p>

                {showMap && (
                  <a
                    href={config.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-4 text-xs text-emerald-DEFAULT/70 hover:text-emerald-DEFAULT transition-colors font-body tracking-wider"
                    aria-label={`Open directions to ${venue} in Google Maps`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                    </svg>
                    Get Directions
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Event Schedule ── */}
        {showSchedule && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="font-body text-xs tracking-[0.25em] uppercase text-emerald-DEFAULT/50 mb-6">
              Programme
            </p>
            <div>
              {schedule.map((item, i) => (
                <ScheduleItem
                  key={item.id}
                  item={item}
                  index={i}
                  isLast={i === schedule.length - 1}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Dress Code ── */}
        {hasDressCode && config.dress_code && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="font-body text-xs tracking-[0.25em] uppercase text-emerald-DEFAULT/50 mb-4">
              Dress Code
            </p>
            <div
              className="rounded-lg p-6"
              style={{
                background: 'rgba(12,168,110,0.03)',
                border: '1px solid rgba(12,168,110,0.12)',
              }}
            >
              {/* Title with fabric icon */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-base"
                  style={{ background: 'rgba(12,168,110,0.1)', border: '1px solid rgba(12,168,110,0.2)' }}
                  aria-hidden="true"
                >
                  👗
                </div>
                <p
                  className="font-display text-ivory/85"
                  style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', fontWeight: 300, fontStyle: 'italic' }}
                >
                  {config.dress_code.title}
                </p>
              </div>

              {config.dress_code.description && (
                <p className="font-body text-ivory/50 text-sm leading-relaxed mb-4">
                  {config.dress_code.description}
                </p>
              )}

              {/* Colour swatches */}
              {config.dress_code.colors && config.dress_code.colors.length > 0 && (
                <div>
                  <p className="font-body text-xs tracking-wider uppercase text-ivory/25 mb-3">
                    Colour palette
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {config.dress_code.colors.map((c, i) => (
                      <div key={i} className="flex flex-col items-center gap-1.5">
                        <div
                          className="w-10 h-10 rounded-full shadow-md"
                          style={{
                            background: c.color,
                            border: '2px solid rgba(255,255,255,0.08)',
                          }}
                          aria-label={c.label}
                          role="img"
                        />
                        <span className="font-body text-ivory/40" style={{ fontSize: '0.6rem', letterSpacing: '0.1em' }}>
                          {c.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}
