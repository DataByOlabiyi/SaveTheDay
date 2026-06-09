'use client'

import { useRef, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { GoldDivider } from '@/components/atoms/GoldText'
import type { BankDetail } from '@/lib/db/types'

interface GiftRegistryProps {
  registryUrl?:  string
  registryNote?: string
  bankDetails?:  BankDetail[]
  coupleName1:   string
  coupleName2:   string
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦', GBP: '£', USD: '$', EUR: '€', GHS: '₵', KES: 'KSh',
}

function formatCopyText(bank: BankDetail): string {
  const lines = [
    bank.bank_name,
    bank.account_number,
    bank.account_name,
  ]
  if (bank.currency) lines.push(bank.currency)
  return lines.join(' · ')
}

export function GiftRegistry({ registryUrl, registryNote, bankDetails, coupleName1, coupleName2 }: GiftRegistryProps) {
  const ref              = useRef<HTMLDivElement>(null)
  const inView           = useInView(ref, { once: true, margin: '-60px' })
  const [copied, setCopied] = useState<string | null>(null)

  const copyDetails = async (bank: BankDetail, key: string) => {
    const text = formatCopyText(bank)
    try { await navigator.clipboard.writeText(text) } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(key)
    setTimeout(() => setCopied(null), 2200)
  }

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
            style={{ border: '1px dashed rgba(201,168,76,0.25)' }}
          />
          <div
            className="absolute inset-2 rounded-full flex items-center justify-center text-2xl"
            style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)' }}
          >
            🎁
          </div>
        </div>

        <p className="font-body tracking-[0.3em] uppercase mb-3"
          style={{ fontSize: '0.65rem', color: 'rgba(201,168,76,0.5)' }}>
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

        {/* ── Bank details ── */}
        {bankDetails && bankDetails.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="w-full mt-8 text-left space-y-3"
          >
            <p className="font-body text-xs tracking-[0.25em] uppercase text-center mb-4"
              style={{ color: 'rgba(201,168,76,0.5)' }}>
              Bank Transfer
            </p>
            {bankDetails.map((bank, i) => {
              const copyKey = `bank-${i}`
              const isCopied = copied === copyKey
              const currencySymbol = bank.currency ? CURRENCY_SYMBOLS[bank.currency] : null

              return (
                <div
                  key={i}
                  className="rounded-lg p-4"
                  style={{ background: 'rgba(201,168,76,0.03)', border: '1px solid rgba(201,168,76,0.12)' }}
                >
                  {/* Header row: label + currency badge */}
                  <div className="flex items-center justify-between mb-2">
                    {bank.label && (
                      <p className="font-body text-xs tracking-wider uppercase"
                        style={{ color: 'rgba(250,247,242,0.25)' }}>
                        {bank.label}
                      </p>
                    )}
                    {bank.currency && (
                      <span
                        className="font-body text-xs px-2 py-0.5 rounded-full ml-auto"
                        style={{
                          background: 'rgba(201,168,76,0.08)',
                          border: '1px solid rgba(201,168,76,0.2)',
                          color: 'rgba(201,168,76,0.7)',
                          letterSpacing: '0.1em',
                        }}
                      >
                        {currencySymbol} {bank.currency}
                      </span>
                    )}
                  </div>

                  <p className="font-body text-sm text-ivory/60 mb-1">{bank.bank_name}</p>

                  {/* Account number + copy button */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-ivory/90"
                        style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)', fontWeight: 300, letterSpacing: '0.06em' }}>
                        {bank.account_number}
                      </p>
                      <p className="font-body text-xs text-ivory/40 mt-0.5">{bank.account_name}</p>
                    </div>
                    <button
                      onClick={() => copyDetails(bank, copyKey)}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs transition-all"
                      style={{
                        background: isCopied ? 'rgba(201,168,76,0.15)' : 'rgba(201,168,76,0.06)',
                        border: `1px solid ${isCopied ? 'rgba(201,168,76,0.35)' : 'rgba(201,168,76,0.15)'}`,
                        color: isCopied ? '#C9A84C' : 'rgba(250,247,242,0.4)',
                      }}
                      aria-label={`Copy details for ${bank.bank_name}`}
                    >
                      <AnimatePresence mode="wait">
                        {isCopied ? (
                          <motion.span key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            ✓ Copied
                          </motion.span>
                        ) : (
                          <motion.span key="copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            Copy
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  </div>

                  {/* Per-account note */}
                  {bank.note && (
                    <p className="font-body text-xs mt-3 leading-relaxed"
                      style={{ color: 'rgba(201,168,76,0.45)', fontStyle: 'italic' }}>
                      {bank.note}
                    </p>
                  )}
                </div>
              )
            })}
          </motion.div>
        )}
      </motion.div>
    </section>
  )
}
