'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { GoldDivider } from '@/components/atoms/GoldText'
import { getTheme } from '@/lib/themes'
import { formatWeddingDate } from '@/lib/personalization/guest'
import type { Wedding, Guest, BankDetail } from '@/lib/db/types'

interface GiftRegistryPageProps {
  wedding: Wedding
  guest?:  Guest | null
  backHref: string
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦', GBP: '£', USD: '$', EUR: '€', GHS: '₵', KES: 'KSh',
}

function formatCopyText(bank: BankDetail): string {
  return [bank.bank_name, bank.account_number, bank.account_name]
    .concat(bank.currency ? [bank.currency] : [])
    .join(' · ')
}

export function GiftRegistryPage({ wedding, guest, backHref }: GiftRegistryPageProps) {
  const { couple_names, config, wedding_date, slug } = wedding
  const theme    = getTheme(config.invitation_theme)
  const dateStr  = wedding_date ? formatWeddingDate(wedding_date).full : null
  const items    = config.gift_registry_items ?? []
  const banks    = config.bank_details ?? []
  const hasItems = items.length > 0
  const hasBanks = banks.length > 0

  const [copied, setCopied] = useState<string | null>(null)

  const copyBank = async (bank: BankDetail, key: string) => {
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
    <div
      className="min-h-screen"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(9,9,11,0.95) 0%, #09090B 100%)',
        color: '#FAF7F2',
      }}
    >
      {/* ── Back link ── */}
      <div className="px-6 pt-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 font-body text-xs tracking-widest uppercase transition-colors"
          style={{ color: `rgba(${theme.raw},0.5)` }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to invitation
        </Link>
      </div>

      <div className="max-w-lg mx-auto px-6 py-16">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12"
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

          <p className="font-body tracking-[0.3em] uppercase mb-3" style={{ fontSize: '0.65rem', color: 'rgba(201,168,76,0.5)' }}>
            Gift Registry
          </p>
          <h1
            className="font-display text-ivory/90 mb-2"
            style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: 300, fontStyle: 'italic' }}
          >
            {couple_names.name1} &amp; {couple_names.name2}
          </h1>
          {dateStr && (
            <p className="font-body text-ivory/35 text-sm mb-6">{dateStr}</p>
          )}
          {guest && (
            <p className="font-body text-ivory/40 text-sm mb-6">
              For {guest.name}
            </p>
          )}
          <GoldDivider className="mb-6" />
          <p className="font-body text-ivory/45 text-sm leading-relaxed">
            {config.gift_registry_note ??
              `Your presence at our wedding is the greatest gift we could ask for. If you'd like to celebrate with a gift, we've shared some ideas below.`}
          </p>
        </motion.div>

        {/* ── Wish list ── */}
        {hasItems && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="mb-12"
          >
            <p className="font-body text-[10px] tracking-[0.25em] uppercase text-center mb-6" style={{ color: `rgba(${theme.raw},0.5)` }}>
              Wish List
            </p>
            <div className="space-y-3">
              {items.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * i, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-xl p-4 flex items-center justify-between gap-4"
                  style={{ background: `rgba(${theme.raw},0.04)`, border: `1px solid rgba(${theme.raw},0.12)` }}
                >
                  <div className="min-w-0">
                    <p className="font-body text-sm text-ivory/80 leading-snug">{item.name}</p>
                    {item.price_range && (
                      <p className="font-body text-xs mt-0.5" style={{ color: `rgba(${theme.raw},0.55)` }}>
                        {item.price_range}
                      </p>
                    )}
                  </div>
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 flex items-center gap-1.5 font-body text-xs px-3 py-1.5 rounded-lg transition-all"
                      style={{
                        background: `rgba(${theme.raw},0.06)`,
                        border: `1px solid rgba(${theme.raw},0.18)`,
                        color: `rgba(${theme.raw},0.7)`,
                      }}
                      aria-label={`View ${item.name} (opens in new tab)`}
                    >
                      View
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                      </svg>
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Bank transfers ── */}
        {hasBanks && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: hasItems ? 0.3 : 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="font-body text-[10px] tracking-[0.25em] uppercase text-center mb-6" style={{ color: 'rgba(201,168,76,0.5)' }}>
              Bank Transfer
            </p>
            <div className="space-y-3">
              {banks.map((bank, i) => {
                const copyKey      = `bank-${i}`
                const isCopied     = copied === copyKey
                const currencySymbol = bank.currency ? CURRENCY_SYMBOLS[bank.currency] : null

                return (
                  <div
                    key={i}
                    className="rounded-xl p-4"
                    style={{ background: 'rgba(201,168,76,0.03)', border: '1px solid rgba(201,168,76,0.12)' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      {bank.label && (
                        <p className="font-body text-xs tracking-wider uppercase" style={{ color: 'rgba(250,247,242,0.25)' }}>
                          {bank.label}
                        </p>
                      )}
                      {bank.currency && (
                        <span
                          className="font-body text-xs px-2 py-0.5 rounded-full ml-auto"
                          style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', color: 'rgba(201,168,76,0.7)', letterSpacing: '0.1em' }}
                        >
                          {currencySymbol} {bank.currency}
                        </span>
                      )}
                    </div>

                    <p className="font-body text-sm text-ivory/60 mb-1">{bank.bank_name}</p>

                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-ivory/90" style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)', fontWeight: 300, letterSpacing: '0.06em' }}>
                          {bank.account_number}
                        </p>
                        <p className="font-body text-xs text-ivory/40 mt-0.5">{bank.account_name}</p>
                      </div>
                      <button
                        onClick={() => copyBank(bank, copyKey)}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs transition-all"
                        style={{
                          background:   isCopied ? 'rgba(201,168,76,0.15)' : 'rgba(201,168,76,0.06)',
                          border:       `1px solid ${isCopied ? 'rgba(201,168,76,0.35)' : 'rgba(201,168,76,0.15)'}`,
                          color:        isCopied ? '#C9A84C' : 'rgba(250,247,242,0.4)',
                        }}
                        aria-label={`Copy details for ${bank.bank_name}`}
                      >
                        <AnimatePresence mode="wait">
                          {isCopied ? (
                            <motion.span key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>✓ Copied</motion.span>
                          ) : (
                            <motion.span key="copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Copy</motion.span>
                          )}
                        </AnimatePresence>
                      </button>
                    </div>

                    {bank.note && (
                      <p className="font-body text-xs mt-3 leading-relaxed" style={{ color: 'rgba(201,168,76,0.45)', fontStyle: 'italic' }}>
                        {bank.note}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {!hasItems && !hasBanks && (
          <div className="text-center py-12">
            <p className="font-body text-sm text-ivory/30">Registry details coming soon.</p>
          </div>
        )}

        {/* ── Footer link back ── */}
        <div className="text-center mt-16">
          <Link
            href={backHref}
            className="font-body text-xs tracking-widest uppercase transition-colors"
            style={{ color: 'rgba(250,247,242,0.2)' }}
          >
            ← {couple_names.name1} &amp; {couple_names.name2}&apos;s Invitation
          </Link>
        </div>
      </div>
    </div>
  )
}
