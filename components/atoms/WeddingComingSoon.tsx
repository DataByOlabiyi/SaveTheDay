import { GoldDivider } from '@/components/atoms/GoldText'

export function WeddingComingSoon() {
  return (
    <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center px-6 text-center">
      <p className="font-body text-eyebrow text-ivory/30 mb-8 tracking-[0.25em] uppercase">
        Coming Soon
      </p>

      <h1 className="font-display text-3xl text-ivory/80 italic mb-3">
        Invitation Being Prepared
      </h1>

      <p className="font-body text-sm text-ivory/40 max-w-xs leading-relaxed mb-8">
        The couple is putting the finishing touches on their invitation. Check back soon.
      </p>

      <GoldDivider />
    </div>
  )
}
