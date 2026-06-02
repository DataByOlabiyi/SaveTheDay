import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Save The Day - Luxury Digital Wedding Invitations',
  description: 'Create a stunning, personalized Save-the-Date your guests will never forget. Beautiful animations, RSVP tracking, and guest management - free.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Save The Day - Luxury Digital Wedding Invitations',
    description: 'Create a stunning Save-the-Date your guests will never forget.',
    type: 'website',
  },
}

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gold">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/>
      </svg>
    ),
    title: 'Cinematic Guest Experience',
    description: 'Animated envelope openings, personalized greetings, and a countdown your guests will screenshot.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gold">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    title: 'Personalized Guest Links',
    description: 'Every guest gets their own link with their name on the invitation and RSVP pre-filled.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gold">
        <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
    title: 'Real-time RSVP Tracking',
    description: "See who has opened their invite, who has RSVP'd, and follow up with those who haven't.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gold">
        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
      </svg>
    ),
    title: 'Gallery & Love Story',
    description: 'Share your photos, videos, and how-we-met story in a beautiful timeline format.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gold">
        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
    ),
    title: 'Instant Sharing',
    description: 'WhatsApp links, QR codes, and shareable cards ready the moment you publish.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gold">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    title: 'Full Analytics',
    description: 'Know exactly who opened your invite, when they viewed it, and how they engaged.',
  },
]

const steps = [
  { number: '01', title: 'Create your account', description: 'Sign up with your email. No password needed, just a magic link.' },
  { number: '02', title: 'Set up your wedding', description: 'Add your names, date, and venue. Your Save-the-Date page generates instantly.' },
  { number: '03', title: 'Share with your guests', description: 'Import your guest list and send personalized links via WhatsApp or email.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-obsidian text-ivory">

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/5 backdrop-blur-sm bg-obsidian/80">
        <span className="font-display text-gold text-xl italic tracking-wide">
          Save The Day
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="font-body text-ivory/60 text-sm tracking-wide hover:text-ivory transition-colors px-4 py-2"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="font-body text-obsidian text-sm tracking-wide bg-gold hover:bg-gold-light transition-colors px-5 py-2 rounded-sm"
          >
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 text-center max-w-4xl mx-auto">
        <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-6">
          Digital Wedding Invitations
        </p>
        <h1 className="font-display text-5xl md:text-7xl text-ivory leading-tight mb-6">
          A Save-the-Date<br />
          <span className="italic text-gold">they&apos;ll never forget</span>
        </h1>
        <p className="font-body text-ivory/50 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Create a stunning, personalized wedding invitation in minutes.
          Animated, shareable, and completely free.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="font-body bg-gold hover:bg-gold-light text-obsidian text-sm tracking-widest uppercase px-8 py-4 transition-colors w-full sm:w-auto text-center"
          >
            Create yours free
          </Link>
          <Link
            href="/e/demo-wedding"
            className="font-body border border-white/10 hover:border-white/20 text-ivory/60 hover:text-ivory text-sm tracking-widest uppercase px-8 py-4 transition-colors w-full sm:w-auto text-center"
          >
            See a live example
          </Link>
        </div>
        <p className="font-body text-ivory/20 text-xs tracking-widest uppercase mt-5">
          No credit card required
        </p>
      </section>

      {/* Divider */}
      <div className="max-w-xs mx-auto flex items-center gap-4 px-6">
        <div className="flex-1 h-px bg-white/5" />
        <span className="text-gold text-xs font-display italic">S</span>
        <div className="flex-1 h-px bg-white/5" />
      </div>

      {/* How it works */}
      <section className="py-24 px-6 max-w-5xl mx-auto">
        <p className="font-body text-gold text-xs tracking-[0.3em] uppercase text-center mb-4">
          How it works
        </p>
        <h2 className="font-display text-4xl text-ivory text-center mb-16">
          Up and running in minutes
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="relative">
              <span
                className="font-display text-7xl absolute -top-4 -left-2 select-none"
                style={{ color: 'rgba(201, 168, 76, 0.06)' }}
              >
                {step.number}
              </span>
              <div className="relative pt-6">
                <p className="font-body text-gold text-xs tracking-widest uppercase mb-2">
                  Step {step.number}
                </p>
                <h3 className="font-display text-xl text-ivory mb-3">{step.title}</h3>
                <p className="font-body text-ivory/40 text-sm leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <p className="font-body text-gold text-xs tracking-[0.3em] uppercase text-center mb-4">
          Everything you need
        </p>
        <h2 className="font-display text-4xl text-ivory text-center mb-16">
          Built for the way couples share today
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-6 border border-white/5 hover:border-white/10 transition-colors rounded-sm group"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'rgba(201, 168, 76, 0.08)', border: '1px solid rgba(201, 168, 76, 0.15)' }}
              >
                {feature.icon}
              </div>
              <h3 className="font-display text-lg text-ivory mb-2">{feature.title}</h3>
              <p className="font-body text-ivory/40 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Demo CTA */}
      <section className="py-24 px-6">
        <div
          className="max-w-3xl mx-auto text-center p-12 border border-white/5 rounded-sm"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(201, 168, 76, 0.04) 0%, transparent 70%)',
          }}
        >
          <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-4">
            See it in action
          </p>
          <h2 className="font-display text-4xl text-ivory mb-4">
            Experience it as a guest would
          </h2>
          <p className="font-body text-ivory/40 text-base mb-8 leading-relaxed">
            Open our live demo invitation. The same experience your guests will receive,
            complete with animations, RSVP, gallery, and love story.
          </p>
          <Link
            href="/e/demo-wedding"
            className="font-body border border-gold/40 hover:border-gold text-gold text-sm tracking-widest uppercase px-8 py-4 transition-colors inline-block"
          >
            Open demo invitation
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 text-center border-t border-white/5">
        <h2 className="font-display text-4xl md:text-5xl text-ivory mb-4">
          Ready to begin?
        </h2>
        <p className="font-body text-ivory/40 mb-10 text-lg">
          Create your wedding Save-the-Date in minutes. Free, forever.
        </p>
        <Link
          href="/signup"
          className="font-body bg-gold hover:bg-gold-light text-obsidian text-sm tracking-widest uppercase px-10 py-4 transition-colors inline-block"
        >
          Create yours free
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="font-display text-gold italic text-lg tracking-wide">
          Save The Day
        </span>
        <p className="font-body text-ivory/20 text-xs tracking-widest">
          Built with love, for love.
        </p>
        <div className="flex gap-6">
          <Link href="/login" className="font-body text-ivory/30 text-xs hover:text-ivory/60 transition-colors tracking-wide">
            Sign in
          </Link>
          <Link href="/e/demo-wedding" className="font-body text-ivory/30 text-xs hover:text-ivory/60 transition-colors tracking-wide">
            Demo
          </Link>
          <Link href="/terms" className="font-body text-ivory/30 text-xs hover:text-ivory/60 transition-colors tracking-wide">
            Terms
          </Link>
          <Link href="/privacy" className="font-body text-ivory/30 text-xs hover:text-ivory/60 transition-colors tracking-wide">
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  )
}
