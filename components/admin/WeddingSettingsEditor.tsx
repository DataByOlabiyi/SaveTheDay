'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { INVITATION_THEMES } from '@/lib/themes'
import type { Wedding, WeddingConfig, DressCodeColor, Accommodation } from '@/lib/db/types'

/* ─────────────────────────────────────────────────────────
   SVG Icon helper — viewBox 0 0 24 24, Heroicons outline
   ───────────────────────────────────────────────────────── */
function Icon({ paths, className = '' }: { paths: string[]; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`w-[15px] h-[15px] flex-shrink-0 ${className}`}
      aria-hidden
    >
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────
   Feature toggle groups
   ───────────────────────────────────────────────────────── */
const TOGGLE_GROUPS: {
  label: string
  items: { key: keyof WeddingConfig; label: string; description: string; paths: string[] }[]
}[] = [
  {
    label: 'Content Sections',
    items: [
      {
        key: 'show_countdown',
        label: 'Countdown Timer',
        description: 'Show the countdown on the invitation page',
        paths: ['M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0'],
      },
      {
        key: 'show_story',
        label: 'Love Story',
        description: "Display the couple's story timeline",
        paths: ['M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z'],
      },
      {
        key: 'show_gallery',
        label: 'Photo Gallery',
        description: 'Show the pre-wedding gallery',
        paths: ['M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2 1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2'],
      },
      {
        key: 'show_schedule',
        label: 'Event Schedule',
        description: 'Display the day-of programme',
        paths: ['M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2'],
      },
      {
        key: 'show_venue_map',
        label: 'Venue Map',
        description: 'Embed Google Maps for directions',
        paths: [
          'M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
          'M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0',
        ],
      },
      {
        key: 'show_accommodations',
        label: 'Accommodation',
        description: 'Show nearby hotel recommendations for guests',
        paths: ['M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z', 'M9 22V12h6v10'],
      },
      {
        key: 'show_gift_registry',
        label: 'Gift Registry',
        description: 'Show gift registry link',
        paths: ['M20 12v10H4V12M22 7H2v5h20V7zM12 22V7m0 0H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zm0 0h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7'],
      },
    ],
  },
  {
    label: 'Guest Experience',
    items: [
      {
        key: 'show_guestbook',
        label: 'Guestbook',
        description: 'Allow guests to leave messages',
        paths: ['M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8'],
      },
      {
        key: 'allow_plus_one',
        label: 'Allow +1',
        description: 'Let guests bring a plus one',
        paths: ['M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM3 20a6 6 0 0 1 12 0v1H3v-1'],
      },
      {
        key: 'collect_dietary',
        label: 'Dietary Info',
        description: 'Ask for dietary requirements at RSVP',
        paths: ['M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0-1 1.73M9 12h6m-6 4h3'],
      },
      {
        key: 'collect_meal_choice',
        label: 'Meal Choice',
        description: 'Let guests select their meal at RSVP',
        paths: ['M18 8h1a4 4 0 0 1 0 8h-1', 'M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z', 'M6 1v3M10 1v3M14 1v3'],
      },
    ],
  },
  {
    label: 'Media & Privacy',
    items: [
      {
        key: 'allow_downloads',
        label: 'Photo Downloads',
        description: 'Allow guests to download gallery photos',
        paths: ['M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-4-4 4m0 0-4-4m4 4V4'],
      },
      {
        key: 'watermark_downloads',
        label: 'Watermark Downloads',
        description: 'Apply watermark to downloaded photos',
        paths: ['M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285'],
      },
      {
        key: 'is_private',
        label: 'Private Wedding',
        description: 'Require a password to view the invitation',
        paths: ['M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25'],
      },
    ],
  },
]

/* ─────────────────────────────────────────────────────────
   Toggle Switch — spring-animated, emerald glow when on
   ───────────────────────────────────────────────────────── */
interface ToggleSwitchProps {
  checked:  boolean
  onChange: (v: boolean) => void
  label:    string
  id:       string
}

function ToggleSwitch({ checked, onChange, label, id }: ToggleSwitchProps) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={(e) => { e.stopPropagation(); onChange(!checked) }}
      aria-label={label}
      className={[
        'relative inline-flex items-center flex-shrink-0',
        'h-6 w-11 rounded-full p-[3px]',
        'transition-all duration-300 ease-out',
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-emerald-DEFAULT focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian',
        checked
          ? 'bg-gradient-to-r from-emerald-DEFAULT to-emerald-light shadow-[0_0_16px_rgba(12,168,110,0.5),inset_0_1px_0_rgba(255,255,255,0.15)]'
          : 'bg-white/[0.07] border border-white/[0.09] shadow-inner',
      ].join(' ')}
    >
      <motion.span
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 520, damping: 36, mass: 0.8 }}
        className={[
          'inline-block h-[18px] w-[18px] rounded-full flex-shrink-0',
          'transition-colors duration-200',
          checked
            ? 'bg-white shadow-[0_1px_4px_rgba(0,0,0,0.25)]'
            : 'bg-white/20 shadow-[0_1px_3px_rgba(0,0,0,0.2)]',
        ].join(' ')}
      />
    </button>
  )
}

/* ─────────────────────────────────────────────────────────
   Main Editor Component
   ───────────────────────────────────────────────────────── */
interface WeddingSettingsEditorProps {
  wedding:  Wedding
  onSaved?: (updated: Wedding) => void
}

export function WeddingSettingsEditor({ wedding, onSaved }: WeddingSettingsEditorProps) {
  const router = useRouter()
  const [config, setConfig] = useState<WeddingConfig>({
    ...{
      show_countdown: true, show_guestbook: true, show_story: true,
      show_gallery: true, show_schedule: true, show_venue_map: false,
      show_gift_registry: false, allow_plus_one: true, collect_dietary: true,
      allow_downloads: true, show_post_uploads: false,
    },
    ...wedding.config,
  })
  const [name1, setName1]         = useState(wedding.couple_names.name1)
  const [name2, setName2]         = useState(wedding.couple_names.name2)
  const [weddingDate, setWeddingDate] = useState(
    wedding.wedding_date ? wedding.wedding_date.split('T')[0] : ''
  )
  const [venue, setVenue]         = useState(wedding.venue)
  const [venueAddress, setVenueAddr] = useState(wedding.venue_address ?? '')
  const [city, setCity]           = useState(wedding.city)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState<string | null>(null)

  // Slug editor state
  const [slug, setSlug]               = useState(wedding.slug)
  const [slugSaving, setSlugSaving]   = useState(false)
  const [slugSaved, setSlugSaved]     = useState(false)
  const [slugError, setSlugError]     = useState<string | null>(null)
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const setToggle = (key: keyof WeddingConfig) => (val: boolean) =>
    setConfig(prev => ({ ...prev, [key]: val }))

  const setConfigField = <K extends keyof WeddingConfig>(key: K, value: WeddingConfig[K]) =>
    setConfig(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/wedding', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingId:    wedding.id,
          couple_names: { name1: name1.trim(), name2: name2.trim() },
          wedding_date: weddingDate || undefined,
          venue,
          venue_address: venueAddress || null,
          city,
          config,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Save failed')
      }

      const data = await res.json()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      onSaved?.(data.wedding)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleSlugSave = async () => {
    const trimmed = slug.trim()
    if (trimmed === wedding.slug) return

    setSlugSaving(true)
    setSlugError(null)

    try {
      const res = await fetch('/api/admin/wedding', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weddingId: wedding.id, slug: trimmed }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to update URL')
      }

      setSlugSaved(true)
      setTimeout(() => setSlugSaved(false), 2000)
      // Redirect to new admin URL since the slug changed
      router.push(`/studio/${trimmed}`)
    } catch (err) {
      setSlugError(err instanceof Error ? err.message : 'Failed to update URL')
    } finally {
      setSlugSaving(false)
    }
  }

  return (
    <div className="space-y-8">

      {/* ── Wedding URL ── */}
      <div className="admin-card p-5">
        <h3 className="text-xs tracking-widest uppercase text-ivory/30 mb-1">Wedding URL</h3>
        <p className="text-[11px] text-ivory/25 mb-5">
          This is the link guests use to open their invitation.
        </p>

        <div className="mb-4">
          <label className="rsvp-label">URL Slug</label>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-ivory/25 flex-shrink-0 hidden sm:block">
              {appUrl}/
            </span>
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="name1-and-name2"
              className="rsvp-input flex-1 font-mono text-sm"
            />
          </div>
          <p className="text-[11px] text-ivory/20 mt-1 font-mono break-all">
            {appUrl}/{slug}
          </p>
        </div>

        {slug !== wedding.slug && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/[0.07] px-4 py-3 mb-4">
            <p className="text-xs text-red-400 leading-relaxed">
              <span className="font-semibold">Heads up:</span> Changing this URL will break all existing guest links that have already been shared. Only do this before sending out invitations.
            </p>
          </div>
        )}

        {slugError && (
          <p className="text-xs text-red-400 mb-3">{slugError}</p>
        )}

        <motion.button
          onClick={handleSlugSave}
          disabled={slugSaving || slug.trim() === wedding.slug || slug.trim().length < 3}
          className="btn-gold w-full py-3"
          whileTap={{ scale: 0.98 }}
        >
          {slugSaving ? 'Updating…' : slugSaved ? '✓ Updated' : 'Update URL'}
        </motion.button>
      </div>

      {/* ── Invitation Theme ── */}
      <div className="admin-card p-5">
        <h3 className="text-xs tracking-widest uppercase text-ivory/30 mb-1">Invitation Theme</h3>
        <p className="text-[11px] text-ivory/25 mb-5">
          Choose the accent colour palette for your invitation. All guests see this theme.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {INVITATION_THEMES.map(theme => {
            const isSelected = (config.invitation_theme ?? 'emerald') === theme.id
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => setConfigField('invitation_theme', theme.id)}
                className={[
                  'relative text-left p-3.5 rounded-xl transition-all duration-200',
                  isSelected
                    ? 'ring-2 ring-offset-2 ring-offset-[#09090B]'
                    : 'hover:bg-white/[0.04] border border-white/[0.07]',
                ].join(' ')}
                style={isSelected ? {
                  background: `rgba(${theme.raw}, 0.07)`,
                  border: `1px solid rgba(${theme.raw}, 0.25)`,
                  outline: `2px solid ${theme.accent}`,
                  outlineOffset: '2px',
                } : { background: 'rgba(255,255,255,0.02)' }}
              >
                {/* Swatch row */}
                <div className="flex gap-1 mb-3">
                  {theme.swatch.map((color, i) => (
                    <div
                      key={i}
                      className="flex-1 h-1.5 rounded-full"
                      style={{ background: color, opacity: i === 2 ? 0.6 : 1 }}
                    />
                  ))}
                </div>
                {/* Accent dot + name */}
                <div className="flex items-center gap-2 mb-0.5">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: theme.accent }}
                  />
                  <p className="font-body text-xs text-ivory/80 font-medium">{theme.name}</p>
                </div>
                <p className="font-body text-[10px] text-ivory/30 leading-snug pl-4">
                  {theme.description}
                </p>
                {isSelected && (
                  <div
                    className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: theme.accent }}
                  >
                    <svg width="8" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Couple & Event ── */}
      <div className="admin-card p-5">
        <h3 className="text-xs tracking-widest uppercase text-ivory/30 mb-5">Couple &amp; Event</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="rsvp-label">Partner 1</label>
              <input
                type="text"
                value={name1}
                onChange={e => setName1(e.target.value)}
                placeholder="Adaeze"
                maxLength={60}
                className="rsvp-input"
              />
            </div>
            <div>
              <label className="rsvp-label">Partner 2</label>
              <input
                type="text"
                value={name2}
                onChange={e => setName2(e.target.value)}
                placeholder="Emeka"
                maxLength={60}
                className="rsvp-input"
              />
            </div>
          </div>
          <div>
            <label className="rsvp-label">Wedding Date</label>
            <input
              type="date"
              value={weddingDate}
              onChange={e => setWeddingDate(e.target.value)}
              className="rsvp-input [color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      {/* ── Venue Details ── */}
      <div className="admin-card p-5">
        <h3 className="text-xs tracking-widest uppercase text-ivory/30 mb-5">Venue Details</h3>
        <div className="space-y-4">
          {[
            { label: 'Venue Name', value: venue,       setter: setVenue,    placeholder: 'The Grand Ballroom' },
            { label: 'Address',   value: venueAddress, setter: setVenueAddr, placeholder: '123 Park Avenue' },
            { label: 'City',      value: city,          setter: setCity,     placeholder: 'London, New York, Lagos…' },
          ].map(({ label, value, setter, placeholder }) => (
            <div key={label}>
              <label className="rsvp-label">{label}</label>
              <input
                type="text"
                value={value}
                onChange={e => setter(e.target.value)}
                placeholder={placeholder}
                className="rsvp-input"
              />
            </div>
          ))}
          <div>
            <label className="rsvp-label">Google Maps URL</label>
            <input
              type="url"
              value={config.google_maps_url ?? ''}
              onChange={e => setConfigField('google_maps_url', e.target.value || undefined)}
              placeholder="https://maps.google.com/..."
              className="rsvp-input"
            />
            <p className="text-xs text-ivory/20 mt-1">Paste the "Share → Copy link" URL from Google Maps</p>
          </div>
        </div>
      </div>

      {/* ── Dress Code ── */}
      <div className="admin-card p-5">
        <h3 className="text-xs tracking-widest uppercase text-ivory/30 mb-5">Dress Code</h3>
        <div className="space-y-4">
          <div>
            <label className="rsvp-label">Dress Code Title</label>
            <input
              type="text"
              value={config.dress_code?.title ?? ''}
              onChange={e => setConfigField('dress_code', {
                ...config.dress_code, title: e.target.value,
              } as WeddingConfig['dress_code'])}
              placeholder="Black Tie / Smart Casual / All White"
              className="rsvp-input"
            />
          </div>
          <div>
            <label className="rsvp-label">Description (optional)</label>
            <textarea
              value={config.dress_code?.description ?? ''}
              onChange={e => setConfigField('dress_code', {
                ...config.dress_code,
                title: config.dress_code?.title ?? '',
                description: e.target.value,
              })}
              placeholder="Please avoid red outfits reserved for the wedding party"
              className="rsvp-input resize-none"
              rows={2}
            />
          </div>
          <div>
            <label className="rsvp-label">Aso-ebi / Fabric Vendor (optional)</label>
            <input
              type="text"
              value={config.dress_code?.vendor_name ?? ''}
              onChange={e => setConfigField('dress_code', {
                ...config.dress_code,
                title: config.dress_code?.title ?? '',
                vendor_name: e.target.value || undefined,
              })}
              placeholder="e.g. Libas Fabrics, Lekki"
              className="rsvp-input"
            />
          </div>
          <div>
            <label className="rsvp-label">Vendor Phone / WhatsApp (optional)</label>
            <input
              type="text"
              value={config.dress_code?.vendor_contact ?? ''}
              onChange={e => setConfigField('dress_code', {
                ...config.dress_code,
                title: config.dress_code?.title ?? '',
                vendor_contact: e.target.value || undefined,
              })}
              placeholder="+234 800 000 0000"
              className="rsvp-input"
            />
          </div>

          {/* Colour swatches editor */}
          <div>
            <label className="rsvp-label">Colour Palette (optional)</label>
            <div className="space-y-2">
              {(config.dress_code?.colors ?? []).map((c: DressCodeColor, i: number) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={c.color}
                    onChange={e => {
                      const colors = [...(config.dress_code?.colors ?? [])]
                      colors[i] = { ...colors[i], color: e.target.value }
                      setConfigField('dress_code', { ...config.dress_code, title: config.dress_code?.title ?? '', colors })
                    }}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={c.label}
                    onChange={e => {
                      const colors = [...(config.dress_code?.colors ?? [])]
                      colors[i] = { ...colors[i], label: e.target.value }
                      setConfigField('dress_code', { ...config.dress_code, title: config.dress_code?.title ?? '', colors })
                    }}
                    placeholder="Colour name"
                    className="rsvp-input flex-1 py-1.5"
                  />
                  <button
                    onClick={() => {
                      const colors = (config.dress_code?.colors ?? []).filter((_, ci) => ci !== i)
                      setConfigField('dress_code', { ...config.dress_code, title: config.dress_code?.title ?? '', colors })
                    }}
                    className="text-ivory/30 hover:text-red-400 transition-colors"
                    aria-label="Remove colour"
                  >×</button>
                </div>
              ))}
              <button
                onClick={() => {
                  const colors = [...(config.dress_code?.colors ?? []), { color: '#C9A84C', label: '' }]
                  setConfigField('dress_code', { ...config.dress_code, title: config.dress_code?.title ?? '', colors })
                }}
                className="text-xs text-emerald-DEFAULT/60 hover:text-emerald-DEFAULT transition-colors"
              >
                + Add colour
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Accommodation ── */}
      <div className="admin-card p-5">
        <h3 className="text-xs tracking-widest uppercase text-ivory/30 mb-1">Accommodation</h3>
        <p className="text-[11px] text-ivory/25 mb-5">
          Add nearby hotels for your guests. Each one gets a &ldquo;Get Directions&rdquo; link.
        </p>
        <div className="space-y-4">
          {(config.accommodations ?? []).map((acc: Accommodation, i: number) => (
            <div
              key={i}
              className="rounded-xl p-4 space-y-3"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-ivory/40 tracking-wider uppercase">Hotel {i + 1}</p>
                <button
                  onClick={() => {
                    const list = (config.accommodations ?? []).filter((_, ci) => ci !== i)
                    setConfigField('accommodations', list.length ? list : undefined)
                  }}
                  className="text-ivory/25 hover:text-red-400 transition-colors text-xs"
                  aria-label="Remove hotel"
                >
                  Remove
                </button>
              </div>
              {[
                { label: 'Hotel Name', field: 'name' as keyof Accommodation, placeholder: 'Transcorp Hilton' },
                { label: 'Address', field: 'address' as keyof Accommodation, placeholder: '1 Aguiyi Ironsi St, Abuja' },
                { label: 'Price Range (optional)', field: 'price_range' as keyof Accommodation, placeholder: '₦50,000 – ₦80,000 / night' },
                { label: 'Phone / WhatsApp (optional)', field: 'phone' as keyof Accommodation, placeholder: '+234 800 000 0000' },
                { label: 'Booking Link (optional)', field: 'booking_url' as keyof Accommodation, placeholder: 'https://...' },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label className="rsvp-label">{label}</label>
                  <input
                    type="text"
                    value={(acc[field] as string) ?? ''}
                    onChange={e => {
                      const list = [...(config.accommodations ?? [])]
                      list[i] = { ...list[i], [field]: e.target.value || undefined }
                      setConfigField('accommodations', list)
                    }}
                    placeholder={placeholder}
                    className="rsvp-input py-2"
                  />
                </div>
              ))}
            </div>
          ))}
          {(config.accommodations ?? []).length < 3 && (
            <button
              onClick={() => {
                const list = [...(config.accommodations ?? []), { name: '', address: '' }]
                setConfigField('accommodations', list)
              }}
              className="text-xs text-emerald-DEFAULT/60 hover:text-emerald-DEFAULT transition-colors"
            >
              + Add hotel
            </button>
          )}
        </div>
      </div>

      {/* ── Copy & Links ── */}
      <div className="admin-card p-5">
        <h3 className="text-xs tracking-widest uppercase text-ivory/30 mb-5">Copy &amp; Links</h3>
        <div className="space-y-4">
          {[
            { label: 'Intro Text', key: 'intro_text' as keyof WeddingConfig, placeholder: 'The beginning of forever' },
            { label: 'Wedding Hashtag', key: 'hashtag' as keyof WeddingConfig, placeholder: '#MojiAndOlabiyiForever' },
            { label: 'Gift Registry URL', key: 'gift_registry_url' as keyof WeddingConfig, placeholder: 'https://...' },
            { label: 'Gift Registry Note', key: 'gift_registry_note' as keyof WeddingConfig, placeholder: 'Your presence is our greatest gift' },
          ].map(({ label, key, placeholder }) => (
            <div key={key as string}>
              <label className="rsvp-label">{label}</label>
              <input
                type="text"
                value={(config[key] as string) ?? ''}
                onChange={e => setConfigField(key, e.target.value || undefined)}
                placeholder={placeholder}
                className="rsvp-input"
              />
            </div>
          ))}
          <div>
            <label className="rsvp-label">RSVP Deadline</label>
            <input
              type="date"
              value={config.rsvp_deadline ?? ''}
              onChange={e => setConfigField('rsvp_deadline', e.target.value || undefined)}
              className="rsvp-input"
            />
          </div>
        </div>
      </div>

      {/* ── RSVP Settings ── */}
      <div className="admin-card p-5">
        <h3 className="text-xs tracking-widest uppercase text-ivory/30 mb-1">RSVP Settings</h3>
        <p className="text-[11px] text-ivory/25 mb-5">
          Configure meal choices and which events guests are attending.
        </p>
        <div className="space-y-5">
          {/* Meal options */}
          <div>
            <label className="rsvp-label">Meal Options (optional)</label>
            <p className="text-[11px] text-ivory/20 mb-2">One per line. If set, guests choose a meal at RSVP.</p>
            <textarea
              value={(config.meal_options ?? []).join('\n')}
              onChange={e => {
                const lines = e.target.value.split('\n').map(l => l.trim()).filter(Boolean)
                setConfigField('meal_options', lines.length ? lines : undefined)
              }}
              placeholder={"Chicken\nFish\nVegetarian"}
              className="rsvp-input resize-none font-mono text-sm"
              rows={4}
            />
          </div>
          {/* Event names for multi-event attendance */}
          <div>
            <label className="rsvp-label">Events / Ceremonies (optional)</label>
            <p className="text-[11px] text-ivory/20 mb-2">One per line. Guests select which events they&apos;ll attend.</p>
            <textarea
              value={(config.rsvp_events ?? []).join('\n')}
              onChange={e => {
                const lines = e.target.value.split('\n').map(l => l.trim()).filter(Boolean)
                setConfigField('rsvp_events', lines.length ? lines : undefined)
              }}
              placeholder={"Traditional Introduction\nChurch Ceremony\nReception"}
              className="rsvp-input resize-none font-mono text-sm"
              rows={4}
            />
          </div>
        </div>
      </div>

      {/* ── Gift / Bank Details ── */}
      <div className="admin-card p-5">
        <h3 className="text-xs tracking-widest uppercase text-ivory/30 mb-1">Gift &amp; Bank Details</h3>
        <p className="text-[11px] text-ivory/25 mb-5">
          Add bank account details guests can copy directly from the invitation.
        </p>
        <div className="space-y-4">
          {(config.bank_details ?? []).map((bank, i) => (
            <div
              key={i}
              className="rounded-xl p-4 space-y-3"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-ivory/40 tracking-wider uppercase">Account {i + 1}</p>
                <button
                  onClick={() => {
                    const list = (config.bank_details ?? []).filter((_, ci) => ci !== i)
                    setConfigField('bank_details', list.length ? list : undefined)
                  }}
                  className="text-ivory/25 hover:text-red-400 transition-colors text-xs"
                  aria-label="Remove account"
                >
                  Remove
                </button>
              </div>
              {[
                { label: 'Bank Name', field: 'bank_name', placeholder: 'First Bank, GTBank, Zenith…' },
                { label: 'Account Number', field: 'account_number', placeholder: '0123456789' },
                { label: 'Account Name', field: 'account_name', placeholder: 'Adaeze Okafor' },
                { label: 'Label (optional)', field: 'label', placeholder: 'e.g. Bride, Groom, Joint' },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label className="rsvp-label">{label}</label>
                  <input
                    type="text"
                    value={(bank as unknown as Record<string, string>)[field] ?? ''}
                    onChange={e => {
                      const list = [...(config.bank_details ?? [])]
                      list[i] = { ...list[i], [field]: e.target.value }
                      setConfigField('bank_details', list)
                    }}
                    placeholder={placeholder}
                    className="rsvp-input py-2"
                  />
                </div>
              ))}
              {/* Currency */}
              <div>
                <label className="rsvp-label">Currency (optional)</label>
                <select
                  value={bank.currency ?? ''}
                  onChange={e => {
                    const list = [...(config.bank_details ?? [])]
                    list[i] = { ...list[i], currency: (e.target.value as import('@/lib/db/types').BankCurrency) || undefined }
                    setConfigField('bank_details', list)
                  }}
                  className="rsvp-input py-2"
                >
                  <option value="">Select currency…</option>
                  <option value="NGN">₦ NGN — Nigerian Naira</option>
                  <option value="GBP">£ GBP — British Pound</option>
                  <option value="USD">$ USD — US Dollar</option>
                  <option value="EUR">€ EUR — Euro</option>
                  <option value="GHS">₵ GHS — Ghanaian Cedi</option>
                  <option value="KES">KSh KES — Kenyan Shilling</option>
                </select>
              </div>
              {/* Per-account note */}
              <div>
                <label className="rsvp-label">Note (optional)</label>
                <input
                  type="text"
                  value={bank.note ?? ''}
                  onChange={e => {
                    const list = [...(config.bank_details ?? [])]
                    list[i] = { ...list[i], note: e.target.value || undefined }
                    setConfigField('bank_details', list)
                  }}
                  placeholder="e.g. For our honeymoon in Santorini 🌅"
                  maxLength={80}
                  className="rsvp-input py-2"
                />
              </div>
            </div>
          ))}
          <button
            onClick={() => {
              const list = [...(config.bank_details ?? []), { bank_name: '', account_number: '', account_name: '' }]
              setConfigField('bank_details', list)
            }}
            className="text-xs text-emerald-DEFAULT/60 hover:text-emerald-DEFAULT transition-colors"
          >
            + Add bank account
          </button>
        </div>
      </div>

      {/* ── Feature Toggles ── */}
      <div className="admin-card p-5">
        <h3 className="text-xs tracking-widest uppercase text-ivory/30 mb-6">Feature Toggles</h3>

        <div className="space-y-7">
          {TOGGLE_GROUPS.map((group, gi) => (
            <div key={group.label}>

              {/* divider between groups */}
              {gi > 0 && (
                <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-7" />
              )}

              {/* group label */}
              <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-emerald-DEFAULT/55 mb-2 px-1">
                {group.label}
              </p>

              {/* toggle rows */}
              <div className="space-y-[2px]">
                {group.items.map(({ key, label, description, paths }) => {
                  const isActive = !!(config[key] as boolean)
                  return (
                    <div
                      key={key as string}
                      onClick={() => setToggle(key)(!isActive)}
                      className={[
                        'group flex items-center gap-3 px-3 py-2.5 rounded-xl -mx-3 cursor-pointer',
                        'transition-colors duration-150 select-none',
                        isActive
                          ? 'bg-emerald-DEFAULT/[0.07]'
                          : 'hover:bg-white/[0.03]',
                      ].join(' ')}
                    >
                      {/* icon badge */}
                      <div className={[
                        'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                        'transition-all duration-200',
                        isActive
                          ? 'bg-emerald-DEFAULT/20 text-emerald-light'
                          : 'bg-white/[0.05] text-ivory/30 group-hover:bg-white/[0.08] group-hover:text-ivory/50',
                      ].join(' ')}>
                        <Icon paths={paths} />
                      </div>

                      {/* text */}
                      <div className="flex-1 min-w-0">
                        <p className={[
                          'text-sm leading-tight transition-colors duration-200',
                          isActive
                            ? 'text-ivory/90'
                            : 'text-ivory/50 group-hover:text-ivory/70',
                        ].join(' ')}>
                          {label}
                        </p>
                        <p className="text-[11px] text-ivory/25 mt-0.5 leading-snug">
                          {description}
                        </p>
                      </div>

                      {/* toggle */}
                      <ToggleSwitch
                        id={`toggle-${key as string}`}
                        checked={isActive}
                        onChange={setToggle(key)}
                        label={label}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save button */}
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
        aria-label="Save wedding settings"
      >
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
      </motion.button>
    </div>
  )
}
