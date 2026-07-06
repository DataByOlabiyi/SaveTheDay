import { describe, it, expect } from 'vitest'
import { isIOSStandaloneDisplay } from '@/lib/utils/platform'

const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const IPAD_UA   = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
const DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

describe('isIOSStandaloneDisplay', () => {
  it('returns true for iPhone in standalone display mode', () => {
    expect(isIOSStandaloneDisplay(IPHONE_UA, true)).toBe(true)
  })

  it('returns false for iPhone not in standalone display mode', () => {
    expect(isIOSStandaloneDisplay(IPHONE_UA, false)).toBe(false)
  })

  it('returns false for Android in standalone display mode', () => {
    expect(isIOSStandaloneDisplay(ANDROID_UA, true)).toBe(false)
  })

  it('returns false for desktop in standalone display mode', () => {
    expect(isIOSStandaloneDisplay(DESKTOP_UA, true)).toBe(false)
  })

  it('returns true for iPad in standalone display mode', () => {
    expect(isIOSStandaloneDisplay(IPAD_UA, true)).toBe(true)
  })

  it('returns false for empty user agent', () => {
    expect(isIOSStandaloneDisplay('', true)).toBe(false)
  })
})
