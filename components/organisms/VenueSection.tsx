'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { GoldDivider } from '@/components/atoms/GoldText'
import { buildGoogleMapsEmbedUrl } from '@/lib/utils/venue'
import type { WeddingConfig, EventScheduleItem, Accommodation } from '@/lib/db/types'

interface VenueSectionProps {
  venue:         string
  venueAddress?: string
  city:          string
  config:        WeddingConfig
  schedule:      EventScheduleItem[]
}

function ScheduleItem({
  item, index,
}: { item: EventScheduleItem; index: number; isLast: boolean }) {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="flex items-center gap-4 rounded-xl px-4 py-3.5"
        style={{
          background: 'rgba(12,168,110,0.04)',
          border: '1px solid rgba(12,168,110,0.10)',
        }}
      >
        {/* Emoji */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
          style={{
            background: 'rgba(12,168,110,0.08)',
            border: '1px solid rgba(12,168,110,0.18)',
          }}
          aria-hidden="true"
        >
          {item.emoji ?? '◆'}
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p
            className="font-body flex-shrink-0"
            style={{ fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(12,168,110,0.65)' }}
          >
            {item.time_label}
          </p>
          <h4
            className="font-display text-ivory/85 truncate"
            style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)', fontWeight: 300, fontStyle: 'italic', lineHeight: 1.3 }}
          >
            {item.title}
          </h4>
          {item.description && (
            <p className="font-body text-ivory/40 text-xs leading-relaxed mt-0.5 truncate">{item.description}</p>
          )}
        </div>

        {/* Location badge */}
        {item.location && (
          <p className="font-body text-ivory/25 text-xs flex-shrink-0 hidden sm:block">{item.location}</p>
        )}
      </div>
    </motion.div>
  )
}

export function VenueSection({ venue, venueAddress, city, config, schedule }: VenueSectionProps) {
  const showMap           = config.show_venue_map && !!config.google_maps_url
  const mapsUrl           = config.google_maps_url
    || `https://maps.google.com/?q=${encodeURIComponent([venue, venueAddress, city].filter(Boolean).join(', '))}`
  const mapEmbedUrl       = buildGoogleMapsEmbedUrl(venue, venueAddress, city)
  const showSchedule      = config.show_schedule && schedule.length > 0
  const hasDressCode      = !!config.dress_code
  const accommodations    = config.show_accommodations ? (config.accommodations ?? []) : []
  const hasAccommodations = accommodations.length > 0

  if (!venue && !showMap && !showSchedule && !hasDressCode && !hasAccommodations) return null

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
                    src={mapEmbedUrl}
                    width="100%"
                    height="220"
                    style={{ border: 0, width: '100%' }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`Map to ${venue}`}
                    aria-label={`Google Maps directions to ${venue}`}
                  />
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ boxShadow: 'inset 0 0 0 1px rgba(12,168,110,0.15), inset 0 0 32px 6px rgba(8,12,10,0.35)' }}
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

                <a
                  href={mapsUrl}
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
            <div className="space-y-3">
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
        {/* ── Accommodation ── */}
        {hasAccommodations && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="font-body text-xs tracking-[0.25em] uppercase text-emerald-DEFAULT/50 mb-4">
              Accommodation
            </p>
            <div className="space-y-4">
              {accommodations.map((acc: Accommodation, i: number) => (
                <div
                  key={i}
                  className="rounded-lg overflow-hidden"
                  style={{ border: '1px solid rgba(12,168,110,0.12)' }}
                >
                  <div className="p-5" style={{ background: 'rgba(12,168,110,0.03)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-display text-ivory/85 mb-0.5"
                          style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)', fontWeight: 300, fontStyle: 'italic' }}
                        >
                          {acc.name}
                        </p>
                        <p className="font-body text-ivory/40 text-sm">{acc.address}</p>
                        {acc.price_range && (
                          <p className="font-body text-ivory/30 text-xs mt-1">{acc.price_range}</p>
                        )}
                      </div>
                      {acc.phone && (
                        <a
                          href={`https://wa.me/${acc.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 text-emerald-DEFAULT/60 hover:text-emerald-DEFAULT transition-colors"
                          aria-label={`Call ${acc.name}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 0 0 2 2.18 2 2 0 014 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                          </svg>
                        </a>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-4">
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(acc.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-emerald-DEFAULT/70 hover:text-emerald-DEFAULT transition-colors font-body tracking-wider"
                        aria-label={`Get directions to ${acc.name}`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                        </svg>
                        Get Directions
                      </a>
                      {acc.booking_url && (
                        <a
                          href={acc.booking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-ivory/40 hover:text-ivory/70 transition-colors font-body tracking-wider"
                          aria-label={`Book ${acc.name}`}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          Book Now
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

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

              {/* Aso-ebi vendor */}
              {config.dress_code.vendor_name && (
                <div
                  className="mt-4 pt-4 flex items-start gap-3"
                  style={{ borderTop: '1px solid rgba(12,168,110,0.1)' }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-sm"
                    style={{ background: 'rgba(12,168,110,0.1)', border: '1px solid rgba(12,168,110,0.2)' }}
                    aria-hidden="true"
                  >
                    🧵
                  </div>
                  <div>
                    <p className="font-body text-xs tracking-wider uppercase text-ivory/25 mb-0.5">
                      Fabric / Aso-ebi vendor
                    </p>
                    <p className="font-body text-sm text-ivory/70">{config.dress_code.vendor_name}</p>
                    {config.dress_code.vendor_contact && (
                      <a
                        href={`https://wa.me/${config.dress_code.vendor_contact.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-1 text-xs text-emerald-DEFAULT/70 hover:text-emerald-DEFAULT transition-colors font-body"
                      >
                        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor" aria-hidden="true">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.859L.058 23.617a.5.5 0 00.61.637l5.939-1.55A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.7-.505-5.25-1.385l-.378-.214-3.527.921.937-3.451-.233-.384A9.955 9.955 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                        </svg>
                        {config.dress_code.vendor_contact}
                      </a>
                    )}
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
