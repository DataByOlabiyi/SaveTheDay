'use client'

const CHECKS = [
  { key: 'length',    label: 'At least 8 characters',    test: (p: string) => p.length >= 8 },
  { key: 'uppercase', label: 'One uppercase letter (A–Z)', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lowercase', label: 'One lowercase letter (a–z)', test: (p: string) => /[a-z]/.test(p) },
  { key: 'number',    label: 'One number (0–9)',           test: (p: string) => /[0-9]/.test(p) },
]

const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_BAR   = ['', 'bg-red-500', 'bg-amber-500', 'bg-yellow-400', 'bg-green-500']
const STRENGTH_TEXT  = ['', 'text-red-400', 'text-amber-400', 'text-yellow-300', 'text-green-400']

interface Props {
  password: string
}

export default function PasswordStrength({ password }: Props) {
  if (!password) return null

  const results = CHECKS.map(c => ({ ...c, passed: c.test(password) }))
  const score   = results.filter(r => r.passed).length

  return (
    <div className="mt-3 space-y-3">
      {/* Strength bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-body text-ivory/30 text-[11px] tracking-wide">Password strength</span>
          {score > 0 && (
            <span className={`font-body text-[11px] ${STRENGTH_TEXT[score]}`}>
              {STRENGTH_LABEL[score]}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className={`h-0.5 flex-1 rounded-full transition-colors duration-300 ${
                i <= score ? STRENGTH_BAR[score] : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Requirement checklist */}
      <ul className="space-y-1.5">
        {results.map(r => (
          <li key={r.key} className="flex items-center gap-2">
            {r.passed ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400 shrink-0">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ivory/20 shrink-0">
                <circle cx="12" cy="12" r="9" />
              </svg>
            )}
            <span className={`font-body text-xs transition-colors ${r.passed ? 'text-ivory/50' : 'text-ivory/25'}`}>
              {r.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
