import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Pricing — Save The Day',
  description: 'Simple, transparent pricing for luxury digital wedding invitations. Start free, upgrade when you\'re ready.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Pricing — Save The Day',
    description: 'Simple, transparent pricing for luxury digital wedding invitations.',
  },
}

const tiers = [
  {
    name: 'Free',
    price: null,
    priceLabel: '₦0',
    period: 'forever',
    description: 'Everything you need to create and share a beautiful invitation.',
    cta: 'Get Started Free',
    ctaHref: '/signup',
    highlight: false,
    features: [
      'Cinematic envelope experience',
      'Personalised guest links',
      'RSVP collection',
      'Up to 50 guests',
      'Basic analytics',
      'Guestbook',
      'Save The Day branding',
    ],
    missing: [
      'Custom hashtag',
      'Gallery & photo uploads',
      'Love story timeline',
      'Music player',
      'QR code',
      'Priority support',
    ],
  },
  {
    name: 'Classic',
    price: 15000,
    priceLabel: '₦15,000',
    period: 'one-time',
    description: 'The complete experience for your wedding day.',
    cta: 'Choose Classic',
    ctaHref: '/signup',
    highlight: true,
    badge: 'Most Popular',
    features: [
      'Everything in Free',
      'Up to 300 guests',
      'Gallery & guest photo uploads',
      'Love story timeline',
      'Music player (multi-track)',
      'Custom hashtag',
      'QR code sharing',
      'Schedule & venue map',
      'Gift registry integration',
      'Reminder messages',
      'Advanced analytics',
      'No Save The Day branding',
    ],
    missing: [
      'Custom domain',
      'Priority support',
    ],
  },
  {
    name: 'Premium',
    price: 25000,
    priceLabel: '₦25,000',
    period: 'one-time',
    description: 'For couples who want every detail to be perfect.',
    cta: 'Choose Premium',
    ctaHref: '/signup',
    highlight: false,
    features: [
      'Everything in Classic',
      'Unlimited guests',
      'Custom domain support',
      'White-glove onboarding',
      'Priority support (24 h)',
      'Early access to new features',
    ],
    missing: [],
  },
]

const faqs = [
  {
    q: 'When do I pay?',
    a: 'You start completely free. You only need to upgrade before publishing your invitation and sending it to guests.',
  },
  {
    q: 'Is this a subscription?',
    a: 'No. Classic and Premium are one-time payments per wedding — no monthly fees.',
  },
  {
    q: 'Can I try before upgrading?',
    a: 'Yes. Build your entire invitation on the Free plan first. Upgrade only when you\'re ready to go live.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept cards, bank transfers, and USSD via Paystack. All major Nigerian banks are supported.',
  },
  {
    q: 'Can I change my plan later?',
    a: 'You can upgrade from Free to Classic or Premium at any time. Plans are per-wedding.',
  },
  {
    q: 'Do you offer a refund?',
    a: 'We offer a full refund within 7 days of payment if you haven\'t published your invitation.',
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
          Simple, honest pricing
        </h1>
        <p className="font-body text-ivory/50 leading-relaxed" style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.05rem)' }}>
          Start free. Upgrade only when you&apos;re ready to send.<br className="hidden sm:block" />
          One wedding. One payment. No subscriptions.
        </p>
      </header>

      {/* Tiers */}
      <section className="px-4 pb-24 max-w-5xl mx-auto">
        <div className="grid gap-4 sm:grid-cols-3">
          {tiers.map(tier => (
            <div
              key={tier.name}
              className="relative flex flex-col rounded-sm p-7"
              style={{
                background: tier.highlight
                  ? 'linear-gradient(135deg, rgba(12,168,110,0.08), rgba(201,168,76,0.05))'
                  : 'rgba(255,255,255,0.025)',
                border: tier.highlight
                  ? '1px solid rgba(201,168,76,0.25)'
                  : '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {tier.badge && (
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
                  {tier.badge}
                </span>
              )}

              <p className="font-body text-xs tracking-[0.2em] uppercase text-ivory/40 mb-3">{tier.name}</p>

              <div className="mb-4">
                <span
                  className="font-display"
                  style={{
                    fontSize: 'clamp(2rem, 5vw, 2.75rem)',
                    fontWeight: 300,
                    letterSpacing: '0.02em',
                    color: tier.highlight ? 'rgba(201,168,76,0.9)' : 'rgba(250,247,240,0.85)',
                  }}
                >
                  {tier.priceLabel}
                </span>
                <span className="font-body text-ivory/30 text-xs ml-2 tracking-wide">{tier.period}</span>
              </div>

              <p className="font-body text-ivory/45 text-sm leading-relaxed mb-6">{tier.description}</p>

              <Link
                href={tier.ctaHref}
                className={`
                  block text-center font-body text-xs tracking-widest uppercase py-3 px-4 mb-7 transition-all
                  ${tier.highlight
                    ? 'bg-gold/90 text-obsidian hover:bg-gold'
                    : 'border border-white/15 text-ivory/60 hover:text-ivory hover:border-white/30'
                  }
                `}
              >
                {tier.cta}
              </Link>

              <ul className="space-y-2.5 flex-1">
                {tier.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mt-0.5 flex-shrink-0" aria-hidden="true">
                      <circle cx="6" cy="6" r="5.5" stroke="rgba(12,168,110,0.5)" />
                      <path d="M3.5 6l1.8 1.8 3.2-3.6" stroke="rgba(12,168,110,0.8)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="font-body text-ivory/60 text-sm leading-snug">{f}</span>
                  </li>
                ))}
                {tier.missing?.map(f => (
                  <li key={f} className="flex items-start gap-2.5">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mt-0.5 flex-shrink-0" aria-hidden="true">
                      <circle cx="6" cy="6" r="5.5" stroke="rgba(255,255,255,0.1)" />
                      <path d="M4 6h4" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                    <span className="font-body text-ivory/20 text-sm leading-snug line-through decoration-white/10">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
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
          Start Free Today
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
