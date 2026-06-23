import { describe, it, expect } from 'vitest'
import { sanitizeText } from '@/lib/utils/sanitize'

describe('guestbook entry sanitization', () => {
  it('strips HTML tags from guest name', () => {
    // sanitizeText strips the tags but not the tag body text
    expect(sanitizeText('<script>alert("xss")</script>John')).toBe('alert("xss")John')
  })

  it('strips HTML tags from message', () => {
    expect(sanitizeText('<img src=x onerror=alert(1)>Hello!')).toBe('Hello!')
  })

  it('strips javascript: protocol', () => {
    expect(sanitizeText('javascript:alert(1)')).toBe('alert(1)')
  })

  it('strips inline event handlers', () => {
    // sanitizeText removes the "onclick=" prefix but not the handler body
    expect(sanitizeText('onclick=alert(1) hello')).toBe('alert(1) hello')
  })

  it('preserves normal text', () => {
    const msg = 'Congratulations on your big day! 🎉'
    expect(sanitizeText(msg)).toBe(msg)
  })
})
