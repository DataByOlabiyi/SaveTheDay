import { describe, it, expect } from 'vitest'
import { buildGoogleMapsEmbedUrl } from '@/lib/utils/venue'

describe('buildGoogleMapsEmbedUrl', () => {
  it('builds an embed URL with venue, address, and city all present', () => {
    const url = buildGoogleMapsEmbedUrl('The Grand Hall', '123 Main St', 'Lagos')
    expect(url).toBe('https://maps.google.com/maps?q=The%20Grand%20Hall%2C%20123%20Main%20St%2C%20Lagos&output=embed')
  })

  it('omits the address segment when venueAddress is undefined', () => {
    const url = buildGoogleMapsEmbedUrl('The Grand Hall', undefined, 'Lagos')
    expect(url).toBe('https://maps.google.com/maps?q=The%20Grand%20Hall%2C%20Lagos&output=embed')
  })

  it('encodeURIComponent-escapes special characters', () => {
    const url = buildGoogleMapsEmbedUrl('Bella & Beau\'s Garden', '5th Ave, Suite #2', 'New York')
    expect(url).toBe(
      'https://maps.google.com/maps?q=' +
        encodeURIComponent("Bella & Beau's Garden, 5th Ave, Suite #2, New York") +
        '&output=embed'
    )
    expect(url).not.toContain('&output=embed&output=embed')
    expect(url).toContain('output=embed')
  })
})
