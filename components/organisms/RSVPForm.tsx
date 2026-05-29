'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Events } from '@/lib/analytics/events'
import { vibrate, HAPTIC } from '@/lib/animations/timelines'
import { cn } from '@/lib/utils'

// ──────────────────────────────────────────────────────────────
// Zod Schema
// ──────────────────────────────────────────────────────────────
const rsvpSchema = z.object({
  name:       z.string().min(2, 'Please enter your full name').max(100),
  email:      z.string().email('Please enter a valid email').optional().or(z.literal('')),
  phone:      z.string().min(7, 'Please enter a valid phone number').optional().or(z.literal('')),
  status:     z.enum(['attending', 'declined']),
  party_size: z.number().min(1).max(20).default(1),
  dietary:    z.string().max(200).optional().or(z.literal('')),
  note:       z.string().max(500).optional().or(z.literal('')),
})

type RSVPData = z.infer<typeof rsvpSchema>

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────
interface RSVPFormProps {
  guestId?:         string
  guestName?:       string
  weddingId:        string
  allowPlusOne?:    boolean
  maxPartySize?:    number
  collectDietary?:  boolean
  onSuccess?:       (status: 'attending' | 'declined') => void
  /** Pre-existing RSVP status from the database — skips the form for returning guests */
  existingStatus?:  'attending' | 'declined' | 'pending'
}

type FormState = 'idle' | 'submitting' | 'success' | 'error'

export function RSVPForm({
  guestId,
  guestName,
  weddingId,
  allowPlusOne    = true,
  maxPartySize    = 6,
  collectDietary  = true,
  onSuccess,
  existingStatus,
}: RSVPFormProps) {
  const alreadyResponded =
    existingStatus === 'attending' || existingStatus === 'declined'

  const [formState, setFormState]   = useState<FormState>(alreadyResponded ? 'success' : 'idle')
  const [chosenStatus, setChosenStatus] = useState<'attending' | 'declined' | null>(
    alreadyResponded ? existingStatus : null
  )

  // For anonymous guests: check localStorage to prevent blank form on return visits
  useEffect(() => {
    if (alreadyResponded) return
    try {
      const stored = localStorage.getItem(`rsvp_${weddingId}`)
      if (!stored) return
      const { status } = JSON.parse(stored) as { status: string }
      if (status === 'attending' || status === 'declined') {
        setFormState('success')
        setChosenStatus(status)
      }
    } catch {}
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RSVPData>({
    resolver: zodResolver(rsvpSchema),
    defaultValues: {
      name:       guestName ?? '',
      status:     'attending',
      party_size: 1,
    },
  })

  const currentStatus = watch('status')
  const partySize     = watch('party_size')

  const onSubmit = async (data: RSVPData) => {
    setFormState('submitting')

    try {
      const response = await fetch('/api/rsvp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...data, guestId, weddingId }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error ?? 'Something went wrong')
      }

      setFormState('success')
      setChosenStatus(data.status)
      vibrate(HAPTIC.RSVP_SUCCESS)
      Events.rsvpSubmitted(weddingId, guestId ?? 'anonymous', data.status)
      onSuccess?.(data.status)
      try { localStorage.setItem(`rsvp_${weddingId}`, JSON.stringify({ status: data.status })) } catch {}

      toast.success(
        data.status === 'attending'
          ? "We can't wait to celebrate with you! 🥂"
          : "We'll miss you. Thank you for letting us know.",
        { duration: 5000 }
      )
    } catch (error) {
      setFormState('error')
      vibrate(HAPTIC.ERROR)
      toast.error(
        error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        { duration: 4000 }
      )
      setTimeout(() => setFormState('idle'), 1000)
    }
  }

  if (formState === 'success') {
    return <RSVPSuccess status={chosenStatus!} guestName={guestName} />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
        aria-label="RSVP Form"
      >
        {/* ── Attending / Declined ── */}
        <fieldset>
          <legend className="rsvp-label mb-3">Will you be joining us?</legend>
          <div className="grid grid-cols-2 gap-3">
            {(['attending', 'declined'] as const).map(status => (
              <button
                key={status}
                type="button"
                role="radio"
                aria-checked={currentStatus === status}
                onClick={() => setValue('status', status)}
                className={cn(
                  'py-3 px-4 text-sm tracking-widest uppercase transition-all duration-200',
                  currentStatus === status
                    ? status === 'attending'
                      ? 'bg-emerald-DEFAULT text-obsidian font-medium'
                      : 'bg-forest text-ivory border border-forest'
                    : 'bg-transparent text-ivory/50 border border-white/10 hover:border-white/20'
                )}
              >
                {status === 'attending' ? 'Joyfully Accept' : 'Regretfully Decline'}
              </button>
            ))}
          </div>
        </fieldset>

        {/* ── Name ── */}
        <div>
          <label htmlFor="rsvp-name" className="rsvp-label">Your Full Name</label>
          <input
            id="rsvp-name"
            type="text"
            autoComplete="name"
            className={cn('rsvp-input', errors.name && 'border-red-400/50')}
            placeholder="As it appears on your invitation"
            {...register('name')}
          />
          {errors.name && (
            <p className="mt-1.5 text-xs text-red-400">{errors.name.message}</p>
          )}
        </div>

        {/* ── Email ── */}
        <div>
          <label htmlFor="rsvp-email" className="rsvp-label">
            Email <span className="text-ivory/30">(optional)</span>
          </label>
          <input
            id="rsvp-email"
            type="email"
            autoComplete="email"
            className={cn('rsvp-input', errors.email && 'border-red-400/50')}
            placeholder="For your confirmation"
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>
          )}
        </div>

        {/* ── WhatsApp / Phone ── */}
        <div>
          <label htmlFor="rsvp-phone" className="rsvp-label">
            WhatsApp Number <span className="text-ivory/30">(optional)</span>
          </label>
          <div className="flex">
            {/* Country prefix button */}
            <span
              className="flex items-center px-3 font-body text-sm text-ivory/50 shrink-0"
              style={{
                background:   'rgba(12,168,110,0.04)',
                border:       '1px solid rgba(12,168,110,0.2)',
                borderRight:  'none',
                letterSpacing: '0.04em',
              }}
              aria-hidden="true"
            >
              🇳🇬 +234
            </span>
            <input
              id="rsvp-phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              className="rsvp-input flex-1 min-w-0"
              style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
              placeholder="080 0000 0000"
              {...register('phone')}
            />
          </div>
        </div>

        {/* ── Party size stepper (attending only) ── */}
        <AnimatePresence>
          {allowPlusOne && currentStatus === 'attending' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <div>
                  <p className="font-body text-sm text-ivory/70">Number of guests</p>
                  <p className="font-body text-ivory/25 mt-0.5" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                    Including yourself
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Minus */}
                  <button
                    type="button"
                    aria-label="Remove a guest"
                    disabled={partySize <= 1}
                    onClick={() => setValue('party_size', Math.max(1, partySize - 1))}
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150',
                      partySize <= 1
                        ? 'border border-white/10 text-ivory/20 cursor-not-allowed'
                        : 'border border-emerald-DEFAULT/50 text-emerald-DEFAULT hover:bg-emerald-DEFAULT/10'
                    )}
                  >
                    <svg width="12" height="2" viewBox="0 0 12 2" fill="currentColor">
                      <rect width="12" height="2" rx="1" />
                    </svg>
                  </button>

                  {/* Count */}
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={partySize}
                      initial={{ opacity: 0, y: -8, scale: 0.85 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.85 }}
                      transition={{ duration: 0.18 }}
                      className="font-display text-ivory/90 w-8 text-center"
                      style={{ fontSize: '1.4rem', fontWeight: 300 }}
                    >
                      {partySize}
                    </motion.span>
                  </AnimatePresence>

                  {/* Plus */}
                  <button
                    type="button"
                    aria-label="Add a guest"
                    disabled={partySize >= maxPartySize}
                    onClick={() => setValue('party_size', Math.min(maxPartySize, partySize + 1))}
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150',
                      partySize >= maxPartySize
                        ? 'border border-white/10 text-ivory/20 cursor-not-allowed'
                        : 'border border-emerald-DEFAULT/50 text-emerald-DEFAULT hover:bg-emerald-DEFAULT/10'
                    )}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                      <rect x="5" y="0" width="2" height="12" rx="1" />
                      <rect x="0" y="5" width="12" height="2" rx="1" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Dietary requirements ── */}
        <AnimatePresence>
          {collectDietary && currentStatus === 'attending' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
            >
              <label htmlFor="rsvp-dietary" className="rsvp-label">
                Dietary Requirements <span className="text-ivory/30">(optional)</span>
              </label>
              <input
                id="rsvp-dietary"
                type="text"
                className="rsvp-input"
                placeholder="e.g. vegetarian, halal, no nuts"
                {...register('dietary')}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Personal note ── */}
        <div>
          <label htmlFor="rsvp-note" className="rsvp-label">
            A message for the couple <span className="text-ivory/30">(optional)</span>
          </label>
          <textarea
            id="rsvp-note"
            rows={3}
            className="rsvp-input resize-none"
            placeholder="Share your excitement…"
            {...register('note')}
          />
        </div>

        {/* ── Submit ── */}
        <motion.button
          type="submit"
          disabled={formState === 'submitting'}
          className={cn(
            'btn-gold w-full py-4 relative overflow-hidden',
            formState === 'submitting' && 'opacity-70 cursor-not-allowed'
          )}
          whileTap={{ scale: formState === 'submitting' ? 1 : 0.98 }}
          animate={formState === 'submitting' ? { opacity: [0.7, 0.9, 0.7] } : {}}
          transition={{ duration: 1, repeat: formState === 'submitting' ? Infinity : 0 }}
        >
          {formState === 'submitting' ? (
            <span className="flex items-center justify-center gap-2">
              <SubmitSpinner />
              Sending…
            </span>
          ) : (
            currentStatus === 'attending'
              ? 'Confirm Attendance'
              : 'Send My Reply'
          )}
        </motion.button>

        <p className="text-center text-xs text-ivory/25 leading-relaxed">
          Your information is used only to coordinate your attendance.
          We do not share your details with third parties.
        </p>
      </form>
    </motion.div>
  )
}

// ──────────────────────────────────────────────────────────────
// Success State
// ──────────────────────────────────────────────────────────────
function RSVPSuccess({
  status,
  guestName,
}: {
  status: 'attending' | 'declined'
  guestName?: string
}) {
  const firstName = guestName?.split(' ')[0] ?? 'you'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="text-center py-8"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
        className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, rgba(12, 168, 110, 0.15), rgba(12, 168, 110, 0.05))',
          border:     '1px solid rgba(12, 168, 110, 0.3)',
        }}
      >
        <motion.svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <motion.path
            d="M5 13l4 4L19 7"
            stroke="#0CA86E"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          />
        </motion.svg>
      </motion.div>

      {status === 'attending' ? (
        <>
          <h3
            className="font-display text-gold-gradient mb-2"
            style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: 300, letterSpacing: '0.06em' }}
          >
            We'll see you there
          </h3>
          <p className="font-body text-ivory/60 text-sm leading-relaxed max-w-xs mx-auto">
            Your attendance has been confirmed, {firstName}.
            Get ready for a day you'll never forget.
          </p>
        </>
      ) : (
        <>
          <h3
            className="font-display text-ivory/80 mb-2"
            style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: 300, letterSpacing: '0.06em' }}
          >
            We'll miss you
          </h3>
          <p className="font-body text-ivory/50 text-sm leading-relaxed max-w-xs mx-auto">
            Thank you for letting us know, {firstName}.
            We'll be thinking of you.
          </p>
        </>
      )}
    </motion.div>
  )
}

function SubmitSpinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
