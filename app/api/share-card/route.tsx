import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { getWeddingBySlug } from '@/lib/db/client'

export const runtime = 'edge'

/**
 * GET /api/share-card?slug=demo-wedding&name=Temi+Johnson&status=attending
 *
 * Generates a square 1080×1080 "I'll be there" shareable card image.
 * Used in the post-RSVP section so guests can share to their stories.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug      = searchParams.get('slug') ?? 'demo-wedding'
  const guestName = searchParams.get('name') ?? ''
  const status    = searchParams.get('status') ?? 'attending'

  const wedding   = await getWeddingBySlug(slug)
  const name1     = wedding?.couple_names.name1 ?? 'The Couple'
  const name2     = wedding?.couple_names.name2 ?? ''
  const firstName = guestName.split(' ')[0]

  // Format date like "22 August 2026"
  const dateStr = wedding?.wedding_date
    ? new Date(wedding.wedding_date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : ''

  const isAttending = status === 'attending'

  return new ImageResponse(
    (
      <div
        style={{
          width: '1080px',
          height: '1080px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg, #080C0A 0%, #0D1F16 50%, #080C0A 100%)',
          fontFamily: 'Georgia, serif',
          position: 'relative',
        }}
      >
        {/* Outer decorative border */}
        <div
          style={{
            position: 'absolute',
            inset: 40,
            border: '1px solid rgba(12, 168, 110, 0.18)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 48,
            border: '0.5px solid rgba(12, 168, 110, 0.07)',
            display: 'flex',
          }}
        />

        {/* Radial glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(12, 168, 110, 0.09) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Wax seal monogram */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: '#0B5240',
            border: '2px solid rgba(12, 168, 110, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
            fontSize: 26,
            color: '#3DD9A0',
            fontStyle: 'italic',
          }}
        >
          {name1[0]}{name2[0]}
        </div>

        {/* Status headline */}
        <p
          style={{
            fontSize: 22,
            color: 'rgba(12, 168, 110, 0.65)',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            marginBottom: 28,
            fontFamily: 'Georgia, serif',
          }}
        >
          {isAttending
            ? (firstName ? `${firstName} will be there` : 'We will be there')
            : 'With love & best wishes'}
        </p>

        {/* Couple names */}
        <p
          style={{
            fontSize: 72,
            color: '#3DD9A0',
            fontWeight: 300,
            letterSpacing: '0.05em',
            marginBottom: 0,
            textAlign: 'center',
            lineHeight: 1,
          }}
        >
          {name1}
        </p>
        <p
          style={{
            fontSize: 36,
            color: 'rgba(61, 217, 160, 0.45)',
            fontStyle: 'italic',
            fontWeight: 300,
            marginBottom: 0,
            letterSpacing: '0.12em',
          }}
        >
          &amp;
        </p>
        <p
          style={{
            fontSize: 72,
            color: '#3DD9A0',
            fontWeight: 300,
            letterSpacing: '0.05em',
            marginBottom: 36,
            textAlign: 'center',
            lineHeight: 1,
          }}
        >
          {name2}
        </p>

        {/* Divider line */}
        <div
          style={{
            width: 140,
            height: 1,
            background:
              'linear-gradient(90deg, transparent, rgba(12, 168, 110, 0.55), transparent)',
            marginBottom: 28,
          }}
        />

        {/* Date + venue */}
        {dateStr && (
          <p
            style={{
              fontSize: 22,
              color: 'rgba(250, 247, 242, 0.45)',
              letterSpacing: '0.1em',
              fontFamily: 'Georgia, serif',
              marginBottom: 6,
            }}
          >
            {dateStr}
          </p>
        )}
        {wedding?.venue && (
          <p
            style={{
              fontSize: 18,
              color: 'rgba(250, 247, 242, 0.25)',
              letterSpacing: '0.06em',
              fontStyle: 'italic',
            }}
          >
            {wedding.venue}, {wedding.city}
          </p>
        )}

        {/* Branding footer */}
        <p
          style={{
            position: 'absolute',
            bottom: 60,
            fontSize: 13,
            color: 'rgba(12, 168, 110, 0.3)',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
          }}
        >
          savetheday.ng
        </p>
      </div>
    ),
    { width: 1080, height: 1080 }
  )
}
