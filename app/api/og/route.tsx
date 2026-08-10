import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { getWeddingBySlug } from '@/lib/db/client'
import { arrayBufferToBase64 } from '@/lib/utils/binary'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug') ?? 'demo'
  const guestName = searchParams.get('name') ?? ''

  // Fetch wedding data
  const wedding = await getWeddingBySlug(slug)
  const name1 = wedding?.couple_names.name1 ?? 'The Couple'
  const name2 = wedding?.couple_names.name2 ?? ''
  const firstName = guestName.split(' ')[0]

  // Satori's remote-image fetch behavior for an <img src> is unverified and
  // uncontrollable, and this route backs guest-shared link previews — it must
  // never 500 or return a broken image for a bot crawling a random guest link.
  // Fetching and converting to a data URI ourselves, inside one timed try/catch
  // with every failure mode swallowed silently, is the only way to guarantee that.
  let hasPhoto = false
  let photoDataUri = ''

  if (wedding?.config.og_image_url) {
    try {
      const res = await fetch(wedding.config.og_image_url, { signal: AbortSignal.timeout(2500) })
      if (res.ok) {
        const buffer = await res.arrayBuffer()
        if (buffer.byteLength > 0) {
          photoDataUri = `data:image/jpeg;base64,${arrayBufferToBase64(buffer)}`
          hasPhoto = true
        }
      }
    } catch {
      // Never surface — an errored fetch here would be a spam vector
      // (triggerable by anyone pasting a guest's link) with no couple-facing benefit.
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0A0A0B 0%, #1A1A1C 50%, #0A0A0B 100%)',
          position: 'relative',
          fontFamily: 'Georgia, serif',
        }}
      >
        {hasPhoto && (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img
            src={photoDataUri}
            alt=""
            width={1200}
            height={630}
            style={{
              position: 'absolute',
              inset: 0,
              width: 1200,
              height: 630,
              objectFit: 'cover',
            }}
          />
        )}
        {hasPhoto && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              background: 'radial-gradient(ellipse 85% 72% at 50% 50%, rgba(8,12,10,0.82) 0%, rgba(8,12,10,0.64) 40%, rgba(8,12,10,0.50) 70%, rgba(8,12,10,0.42) 100%)',
            }}
          />
        )}

        {/* Decorative corner elements */}
        <div
          style={{
            position: 'absolute',
            top: 30,
            left: 30,
            right: 30,
            bottom: 30,
            // hasPhoto===false branch must stay byte-identical to the pre-photo-feature
            // literal so a wedding with no cover photo renders pixel-for-pixel unchanged.
            border: `1px solid ${hasPhoto ? 'rgba(201, 168, 76, 0.35)' : 'rgba(201, 168, 76, 0.15)'}`,
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 36,
            left: 36,
            right: 36,
            bottom: 36,
            border: `0.5px solid ${hasPhoto ? 'rgba(201, 168, 76, 0.18)' : 'rgba(201, 168, 76, 0.08)'}`,
            display: 'flex',
          }}
        />

        {/* Gold radial glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${hasPhoto ? 'rgba(201, 168, 76, 0.16)' : 'rgba(201, 168, 76, 0.1)'} 0%, transparent 70%)`,
            display: 'flex',
          }}
        />

        {/* Wax seal icon — matches the in-app emerald seal */}
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: '#0B5240',
            border: '2px solid rgba(12, 168, 110, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 28,
            fontSize: 20,
            color: '#3DD9A0',
            fontStyle: 'italic',
          }}
        >
          {name1[0] ?? 'S'}{name2[0] ?? ''}
        </div>

        {/* Guest name (personalized) */}
        {firstName && (
          <p
            style={{
              fontSize: 18,
              color: 'rgba(12, 168, 110, 0.65)',
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              marginBottom: 20,
              fontFamily: 'Georgia, serif',
            }}
          >
            For {firstName}
          </p>
        )}

        {/* Couple names */}
        <h1
          style={{
            fontSize: 64,
            color: '#3DD9A0',
            fontWeight: 300,
            letterSpacing: '0.06em',
            marginBottom: 0,
            textAlign: 'center',
          }}
        >
          {name1}
        </h1>
        <p
          style={{
            fontSize: 32,
            color: 'rgba(61, 217, 160, 0.45)',
            fontStyle: 'italic',
            fontWeight: 300,
            marginBottom: 0,
            letterSpacing: '0.1em',
          }}
        >
          &amp;
        </p>
        <h1
          style={{
            fontSize: 64,
            color: '#3DD9A0',
            fontWeight: 300,
            letterSpacing: '0.06em',
            marginBottom: 28,
            textAlign: 'center',
          }}
        >
          {name2}
        </h1>

        {/* Divider */}
        <div
          style={{
            width: 120,
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(12, 168, 110, 0.55), transparent)',
            marginBottom: 24,
          }}
        />

        {/* Lock message */}
        <p
          style={{
            fontSize: 18,
            color: 'rgba(250, 247, 242, 0.4)',
            letterSpacing: '0.1em',
            fontFamily: 'Georgia, serif',
            textAlign: 'center',
          }}
        >
          {firstName ? `A personal message, just for you.` : `Something beautiful awaits.`}
        </p>
        <p
          style={{
            fontSize: 15,
            color: 'rgba(12, 168, 110, 0.5)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginTop: 8,
          }}
        >
          Tap to open →
        </p>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
