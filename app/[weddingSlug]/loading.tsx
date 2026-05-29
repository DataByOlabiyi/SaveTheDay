// Loading skeleton — shown while the page data fetches
// Matches the exact layout so there's no layout shift
export default function Loading() {
  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center">
      {/* Centered monogram pulse — matches the intro animation */}
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-12 h-12 rounded-full animate-pulse-gold flex items-center justify-center"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(201, 168, 76, 0.1) 0%, transparent 70%)',
            border: '1px solid rgba(201, 168, 76, 0.1)',
          }}
        >
          <span
            className="font-display text-gold-DEFAULT"
            style={{ fontSize: '1.25rem', fontStyle: 'italic', opacity: 0.4 }}
          >
            S
          </span>
        </div>
      </div>
    </div>
  )
}
