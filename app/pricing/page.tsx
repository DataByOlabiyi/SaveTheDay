import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Pricing — Save The Day',
  description: 'Save The Day is completely free during our launch. Create your digital wedding invitation with every feature included.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Pricing — Save The Day',
    description: 'Every feature. No credit card. Free during launch.',
  },
}

const features = [
  'Cinematic envelope & seal experience',
  'Personalised guest invitation links',
  'RSVP collection with meal & dietary choices',
  'Love story timeline',
  'Wedding gallery & guest photo uploads',
  'Multi-track music player',
  'Guestbook with emoji reactions',
  'Wedding schedule & venue details',
  'Gift registry integration',
  'Countdown timer',
  'Analytics — opens, RSVPs, engagement',
  'QR code sharing',
  'Add-to-calendar (Google, Apple, Outlook)',
  'Guest reminder messages',
  'Post-wedding thank-you messages',
  'Password-protected private weddings',
  'Multiple invitation themes',
  'PWA — installable on any device',
]

const faqs = [
  {
    q: 'Is this actually free?',
    a: 'Yes — completely free during our launch period. Every feature is included with no hidden limits and no credit card required.',
  },
  {
    q: 'Will it stay free?',
    a: 'We plan to introduce paid plans in the future. When we do, we will give existing couples plenty of notice and a generous transition period.',
  },
  {
    q: 'Are there guest limits?',
    a: 'No limits during the launch period. Invite as many guests as you need.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'No. Save The Day runs entirely in the browser. Guests open their invitation on any device with no app download required.',
  },
  {
    q: 'What happens to my invitation after the wedding?',
    a: 'Your invitation stays live after the date. Guests can still view photos, the guestbook, and memories at any time.',
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-obsidian text-ivory">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto">
        <Link
          href="/"
          className="font-display text-ivory/80 hover:text-ivory transition-colors"
          style={{ fontSize: '1.05rem', fontWeight: 300, letterSpacing: '0.12em' }}
        >
          Save The Day
        </Link>
        <Link
          href="/signup"
          className="font-body text-xs tracking-widest uppercase px-5 py-2.5 border border-gold/40 text-gold/70 hover:text-gold hover:border-gold transition-all"
        >
          Get Started
        </Link>
      </nav>

      {/* Hero */}
      <header className="text-center px-6 pt-16 pb-20 max-w-2xl mx-auto">
        <p className="font-body text-xs tracking-[0.3em] uppercase text-emerald-DEFAULT/60 mb-5">Pricing</p>
        <h1
          className="font-display text-gold-gradient mb-5"
          style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)', fontWeight: 300, letterSpacing: '0.04em', lineHeight: 1.15 }}
        >
          Free during launch
        </h1>
        <p className="font-body text-ivory/50 leading-relaxed" style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.05rem)' }}>
          Every feature included. No credit card. No limits.<br className="hidden sm:block" />
          Create your invitation and share it with your guests today.
        </p>
      </header>

      {/* Single plan card */}
      <section className="px-4 pb-24 max-w-lg mx-auto">
        <div
          className="relative flex flex-col rounded-sm p-8"
          style={{
            background: 'linear-gradient(135deg, rgba(12,168,110,0.08), rgba(201,168,76,0.05))',
            border: '1px solid rgba(201,168,76,0.25)',
          }}
        >
          {/* Badge */}
          <span
            className="absolute -top-3 left-1/2 -translate-x-1/2 font-body text-obsidian px-3 py-0.5"
            style={{
              fontSize: '0.6rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              background: 'linear-gradient(90deg, #C9A84C, #F0D080)',
              borderRadius: 2,
            }}
          >
            Launch offer
          </span>

          <p className="font-body text-xs tracking-[0.2em] uppercase text-ivory/40 mb-3">Everything</p>

          <div className="mb-4">
            <span
              className="font-display"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 3.25rem)', fontWeight: 300, letterSpacing: '0.02em', color: 'rgba(201,168,76,0.9)' }}
            >
              Free
            </span>
            <span className="font-body text-ivory/30 text-xs ml-2 tracking-wide">during launch</span>
          </div>

          <p className="font-body text-ivory/45 text-sm leading-relaxed mb-6">
            Every feature we offer, included from day one. No tiers, no upgrades required.
          </p>

          <Link
            href="/signup"
            className="block text-center font-body text-xs tracking-widest uppercase py-3 px-4 mb-8 transition-all bg-gold/90 text-obsidian hover:bg-gold"
          >
            Create your invitation
          </Link>

          <ul className="space-y-2.5">
            {features.map(f => (
              <li key={f} className="flex items-start gap-2.5">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mt-0.5 flex-shrink-0" aria-hidden="true">
                  <circle cx="6" cy="6" r="5.5" stroke="rgba(12,168,110,0.5)" />
                  <path d="M3.5 6l1.8 1.8 3.2-3.6" stroke="rgba(12,168,110,0.8)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="font-body text-ivory/60 text-sm leading-snug">{f}</span>
              </li>
            ))}
          </ul>

          <p className="font-body text-ivory/20 text-xs mt-8 text-center tracking-wide">
            Paid plans will be introduced in the future with advance notice.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 pb-24 max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <p className="font-body text-xs tracking-[0.3em] uppercase text-ivory/25 mb-3">Questions</p>
          <div className="w-12 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent mx-auto" />
        </div>
        <dl className="space-y-8">
          {faqs.map(({ q, a }) => (
            <div key={q}>
              <dt className="font-body text-ivory/80 text-sm font-medium mb-2 tracking-wide">{q}</dt>
              <dd className="font-body text-ivory/45 text-sm leading-relaxed">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* CTA strip */}
      <section className="border-t border-white/5 py-20 px-6 text-center">
        <p
          className="font-display text-ivory/70 mb-6"
          style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', fontWeight: 300, fontStyle: 'italic', letterSpacing: '0.04em' }}
        >
          Ready to create something unforgettable?
        </p>
        <Link
          href="/signup"
          className="inline-block font-body text-xs tracking-widest uppercase px-8 py-4 bg-gold/90 text-obsidian hover:bg-gold transition-colors"
        >
          Start free today
        </Link>
        <p className="font-body text-ivory/20 text-xs mt-4 tracking-wide">
          No credit card required
        </p>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 text-center border-t border-white/5">
        <div className="flex items-center justify-center gap-6 font-body text-ivory/20 text-xs tracking-widest">
          <Link href="/" className="hover:text-ivory/40 transition-colors uppercase">Home</Link>
          <Link href="/terms" className="hover:text-ivory/40 transition-colors uppercase">Terms</Link>
          <Link href="/privacy" className="hover:text-ivory/40 transition-colors uppercase">Privacy</Link>
        </div>
        <p className="font-body text-ivory/10 text-xs mt-4 tracking-wider">
          &copy; {new Date().getFullYear()} Save The Day
        </p>
      </footer>
    </div>
  )
}
