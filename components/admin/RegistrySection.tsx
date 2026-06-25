'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { Wedding, GiftRegistryItem, BankDetail } from '@/lib/db/types'

interface RegistrySectionProps {
  wedding: Wedding
  onSaved: (updated: Wedding) => void
}

const CURRENCIES: { value: string; label: string }[] = [
  { value: 'NGN', label: '₦ NGN — Nigerian Naira' },
  { value: 'GBP', label: '£ GBP — British Pound' },
  { value: 'USD', label: '$ USD — US Dollar' },
  { value: 'EUR', label: '€ EUR — Euro' },
  { value: 'GHS', label: '₵ GHS — Ghanaian Cedi' },
  { value: 'KES', label: 'KSh KES — Kenyan Shilling' },
]

function CurrencyDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const current = CURRENCIES.find(c => c.value === value)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="rsvp-input py-2 flex items-center justify-between w-full text-left"
        style={{ color: current ? undefined : 'rgba(250,247,242,0.2)' }}
      >
        <span>{current ? current.label : 'Select currency…'}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1 z-20 rounded-xl overflow-hidden py-1"
          style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
        >
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false) }}
            className="w-full text-left px-3 py-2 font-body text-xs text-ivory/30 hover:bg-white/5 transition-colors"
          >
            None
          </button>
          {CURRENCIES.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => { onChange(c.value); setOpen(false) }}
              className={`w-full text-left px-3 py-2 font-body text-xs hover:bg-white/5 transition-colors ${c.value === value ? 'text-gold' : 'text-ivory/60'}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function RegistrySection({ wedding, onSaved }: RegistrySectionProps) {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const registryUrl = `${appUrl}/e/${wedding.slug}/registry`

  const [items, setItems]   = useState<GiftRegistryItem[]>(wedding.config.gift_registry_items ?? [])
  const [banks, setBanks]   = useState<BankDetail[]>(wedding.config.bank_details ?? [])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const addItem = () => {
    setItems(prev => [...prev, { id: crypto.randomUUID(), name: '', price_range: '', link: '' }])
  }

  const updateItem = (id: string, field: keyof GiftRegistryItem, value: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const addBank = () => {
    setBanks(prev => [...prev, { bank_name: '', account_number: '', account_name: '' }])
  }

  const updateBank = (i: number, field: keyof BankDetail, value: string) => {
    setBanks(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value || undefined } as BankDetail
      return next
    })
  }

  const removeBank = (i: number) => {
    setBanks(prev => prev.filter((_, ci) => ci !== i))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const cleanItems = items
        .filter(item => item.name.trim())
        .map(item => ({
          id:          item.id,
          name:        item.name.trim(),
          price_range: item.price_range?.trim() || undefined,
          link:        item.link?.trim() || undefined,
        }))

      const cleanBanks = banks
        .filter(b => b.bank_name.trim() && b.account_number.trim() && b.account_name.trim())
        .map(b => ({
          bank_name:      b.bank_name.trim(),
          account_number: b.account_number.trim(),
          account_name:   b.account_name.trim(),
          label:          b.label?.trim() || undefined,
          currency:       b.currency || undefined,
          note:           b.note?.trim() || undefined,
        }))

      const res = await fetch('/api/admin/wedding', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingId: wedding.id,
          config: {
            gift_registry_items: cleanItems.length ? cleanItems : undefined,
            bank_details:        cleanBanks.length  ? cleanBanks  : undefined,
          },
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Save failed')
      }

      const data = await res.json()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      onSaved(data.wedding)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="mb-2">
        <h2 className="font-display text-2xl text-ivory/90 italic mb-1">Gift Registry</h2>
        <p className="font-body text-sm text-ivory/40">Add wish list items and bank accounts. Guests visit a dedicated registry page.</p>
      </div>

      {/* Registry page link */}
      {wedding.config.show_gift_registry && (
        <div
          className="flex items-center justify-between gap-4 rounded-2xl px-5 py-4"
          style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.12)' }}
        >
          <div className="min-w-0">
            <p className="font-body text-xs tracking-widest uppercase text-gold/50 mb-0.5">Registry page</p>
            <p className="font-mono text-xs text-ivory/40 truncate">{registryUrl}</p>
          </div>
          <a
            href={registryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 font-body text-xs tracking-widest uppercase px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', color: 'rgba(201,168,76,0.7)' }}
          >
            Preview
          </a>
        </div>
      )}

      {/* Wish List */}
      <div className="admin-card p-5">
        <h3 className="text-xs tracking-widest uppercase text-ivory/30 mb-1">Wish List</h3>
        <p className="text-[11px] text-ivory/25 mb-5">
          Add specific items you&apos;d love to receive. Guests can browse and click through to buy.
        </p>
        <div className="space-y-4">
          {items.map((item, i) => (
            <div
              key={item.id}
              className="rounded-xl p-4 space-y-3"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-ivory/40 tracking-wider uppercase">Item {i + 1}</p>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-ivory/25 hover:text-red-400 transition-colors text-xs"
                >
                  Remove
                </button>
              </div>
              <div>
                <label className="rsvp-label">Item Name *</label>
                <input
                  type="text"
                  value={item.name}
                  onChange={e => updateItem(item.id, 'name', e.target.value)}
                  placeholder="e.g. KitchenAid Stand Mixer"
                  maxLength={200}
                  className="rsvp-input"
                />
              </div>
              <div>
                <label className="rsvp-label">Price Range (optional)</label>
                <input
                  type="text"
                  value={item.price_range ?? ''}
                  onChange={e => updateItem(item.id, 'price_range', e.target.value)}
                  placeholder="e.g. ₦80,000 – ₦120,000"
                  maxLength={100}
                  className="rsvp-input"
                />
              </div>
              <div>
                <label className="rsvp-label">Buy Link (optional)</label>
                <input
                  type="url"
                  value={item.link ?? ''}
                  onChange={e => updateItem(item.id, 'link', e.target.value)}
                  placeholder="https://..."
                  maxLength={500}
                  className="rsvp-input"
                />
              </div>
            </div>
          ))}
          {items.length < 50 && (
            <button
              onClick={addItem}
              className="text-xs text-emerald-DEFAULT/60 hover:text-emerald-DEFAULT transition-colors"
            >
              + Add item
            </button>
          )}
        </div>
      </div>

      {/* Bank Transfers */}
      <div className="admin-card p-5">
        <h3 className="text-xs tracking-widest uppercase text-ivory/30 mb-1">Bank Transfers</h3>
        <p className="text-[11px] text-ivory/25 mb-5">
          Guests can copy your account details directly from the registry page.
        </p>
        <div className="space-y-4">
          {banks.map((bank, i) => (
            <div
              key={i}
              className="rounded-xl p-4 space-y-3"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-ivory/40 tracking-wider uppercase">Account {i + 1}</p>
                <button
                  onClick={() => removeBank(i)}
                  className="text-ivory/25 hover:text-red-400 transition-colors text-xs"
                >
                  Remove
                </button>
              </div>
              {([
                { label: 'Bank Name',              field: 'bank_name',      placeholder: 'First Bank, GTBank, Zenith…' },
                { label: 'Account Number',         field: 'account_number', placeholder: '0123456789' },
                { label: 'Account Name',           field: 'account_name',   placeholder: 'Adaeze Okafor' },
                { label: 'Label (optional)',        field: 'label',          placeholder: 'e.g. Bride, Groom, Joint' },
              ] as { label: string; field: keyof BankDetail; placeholder: string }[]).map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label className="rsvp-label">{label}</label>
                  <input
                    type="text"
                    value={(bank[field] as string) ?? ''}
                    onChange={e => updateBank(i, field, e.target.value)}
                    placeholder={placeholder}
                    className="rsvp-input py-2"
                  />
                </div>
              ))}
              <div>
                <label className="rsvp-label">Currency (optional)</label>
                <CurrencyDropdown
                  value={bank.currency ?? ''}
                  onChange={v => updateBank(i, 'currency', v)}
                />
              </div>
              <div>
                <label className="rsvp-label">Note (optional)</label>
                <input
                  type="text"
                  value={bank.note ?? ''}
                  onChange={e => updateBank(i, 'note', e.target.value)}
                  placeholder="e.g. For our honeymoon fund"
                  maxLength={80}
                  className="rsvp-input py-2"
                />
              </div>
            </div>
          ))}
          {banks.length < 5 && (
            <button
              onClick={addBank}
              className="text-xs text-emerald-DEFAULT/60 hover:text-emerald-DEFAULT transition-colors"
            >
              + Add bank account
            </button>
          )}
        </div>
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-red-400 text-center"
        >
          {error}
        </motion.p>
      )}
      <motion.button
        onClick={handleSave}
        disabled={saving}
        className="btn-gold w-full py-3.5"
        whileTap={{ scale: 0.98 }}
      >
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Registry'}
      </motion.button>
    </div>
  )
}
