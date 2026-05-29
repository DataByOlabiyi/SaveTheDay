// Loading skeleton for the personalized guest invitation
// Shown while Next.js resolves the wedding + guest data server-side
export default function GuestLoading() {
  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        {/* Rotating ring — matches the obsidian envelope aesthetic */}
        <div className="relative w-14 h-14">
          {/* Static outer ring */}
          <div
            className="absolute inset-0 rounded-full"
            style={{ border: '1px solid rgba(201, 168, 76, 0.08)' }}
          />
          {/* Animated arc */}
          <svg
            className="absolute inset-0 animate-spin"
            style={{ animationDuration: '2s' }}
            viewBox="0 0 56 56"
            fill="none"
          >
            <circle
              cx="28"
              cy="28"
              r="26"
              stroke="url(#spinGrad)"
              strokeWidth="1"
              strokeLinecap="round"
              strokeDasharray="40 123"
            />
            <defs>
              <linearGradient id="spinGrad" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
          {/* Centre dot — understated pulse */}
          <div
            className="absolute inset-0 m-auto w-1.5 h-1.5 rounded-full animate-pulse"
            style={{
              background: 'rgba(201, 168, 76, 0.4)',
              animationDuration: '2s',
            }}
          />
        </div>

        {/* Wordmark */}
        <p
          className="font-body tracking-[0.4em] uppercase"
          style={{ fontSize: '0.6rem', color: 'rgba(201, 168, 76, 0.3)' }}
        >
          Opening your invitation
        </p>
      </div>
    </div>
  )
}
