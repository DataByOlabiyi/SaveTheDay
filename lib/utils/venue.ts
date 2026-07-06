export function buildGoogleMapsEmbedUrl(venue: string, venueAddress: string | undefined, city: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent([venue, venueAddress, city].filter(Boolean).join(', '))}&output=embed`
}
