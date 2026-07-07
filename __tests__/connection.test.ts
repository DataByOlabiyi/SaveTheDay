import { describe, it, expect } from 'vitest'
import { shouldPreloadImages } from '@/lib/utils/connection'

describe('shouldPreloadImages', () => {
  it('preloads when connection info is unavailable', () => {
    expect(shouldPreloadImages(undefined)).toBe(true)
  })

  it('skips preload when the user has enabled data saver', () => {
    expect(shouldPreloadImages({ saveData: true })).toBe(false)
  })

  it('skips preload on slow-2g and 2g', () => {
    expect(shouldPreloadImages({ effectiveType: 'slow-2g' })).toBe(false)
    expect(shouldPreloadImages({ effectiveType: '2g' })).toBe(false)
  })

  it('preloads on faster connections', () => {
    expect(shouldPreloadImages({ effectiveType: '3g' })).toBe(true)
    expect(shouldPreloadImages({ effectiveType: '4g' })).toBe(true)
    expect(shouldPreloadImages({ saveData: false, effectiveType: '4g' })).toBe(true)
  })
})
