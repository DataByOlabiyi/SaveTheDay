'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { GoldDivider } from '@/components/atoms/GoldText'

interface GiftRegistryProps {
  registryUrl?:  string
  registryNote?: string
  coupleName1:   string
  coupleName2:   string
}

export function GiftRegistry({ registryUrl, registryNote, coupleName1, coupleName2 }: GiftRegistryProps) {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section
      ref={ref}
      id="section-registry"
      className="relative py-20 px-6"
      aria-labelledby="registry-heading"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-sm mx-auto text-center"
      >
        {/* Decorative ring */}
        <div className="relative w-16 h-16 mx-auto mb-8" aria-hidden="true">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full"
            style={{ border: '1px dashed rgba(12,168,110,0.25)' }}
          />
          <div
            className="absolute inset-2 rounded-full flex items-center justify-center text-2xl"
            style={{ background: 'rgba(12,168,110,0.06)', border: '1px solid rgba(12,168,110,0.15)' }}
          >
            🎁
          </div>
        </div>

        <p className="font-body tracking-[0.3em] uppercase mb-3"
          style={{ fontSize: '0.65rem', color: 'rgba(12, 168, 110, 0.5)' }}>
          Gift Registry
        </p>
        <h2 id="registry-heading"
          className="font-display text-ivory/80 mb-4"
          style={{ fontSize: 'clamp(1.25rem, 3.5vw, 2rem)', fontWeight: 300, fontStyle: 'italic' }}>
          A gift for the journey ahead
        </h2>
        <GoldDivider className="mb-6" />

        <p className="font-body text-ivory/45 text-sm leading-relaxed mb-8">
          {registryNote ??
            `Your presence at our wedding is the greatest gift we could ask for. If you would like to celebrate with a gift, ${coupleName1} & ${coupleName2} have shared a registry below.`}
        </p>

        {registryUrl && (
          <motion.a
            href={registryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold inline-flex items-center gap-2"
            whileTap={{ scale: 0.97 }}
            aria-label="View gift registry (opens in new tab)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
            </svg>
            View Registry
          </motion.a>
        )}
      </motion.div>
    </section>
  )
}
