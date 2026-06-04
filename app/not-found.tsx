import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center px-6 text-center">
      <div
        className="w-16 h-16 rounded-full mx-auto mb-8 flex items-center justify-center"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(201, 168, 76, 0.1) 0%, transparent 70%)',
          border: '1px solid rgba(201, 168, 76, 0.15)',
        }}
      >
        <span
          className="font-display text-gold"
          style={{ fontSize: '1.5rem', fontStyle: 'italic' }}
        >
          404
        </span>
      </div>

      <h1
        className="font-display text-ivory/60 mb-3"
        style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: 300, letterSpacing: '0.06em' }}
      >
        Page not found
      </h1>
      <p className="font-body text-ivory/30 text-sm max-w-xs leading-relaxed mb-8">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>

      <div className="divider-gold mb-8" />

      <div className="flex gap-6 mb-8">
        <Link
          href="/"
          className="font-body text-ivory/40 text-xs tracking-widest uppercase hover:text-ivory/70 transition-colors"
        >
          Home
        </Link>
        <Link
          href="/studio"
          className="font-body text-gold/60 text-xs tracking-widest uppercase hover:text-gold transition-colors"
        >
          Dashboard
        </Link>
      </div>

      <p className="font-body text-ivory/15 text-xs tracking-widest uppercase">
        Save The Day
      </p>
    </div>
  )
}
