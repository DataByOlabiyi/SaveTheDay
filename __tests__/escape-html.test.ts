import { describe, it, expect } from 'vitest'

// Mirror the escapeHtml function from app/api/rsvp/route.ts
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
}

describe('escapeHtml for email safety', () => {
  it('escapes <script> tags', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('escapes & ampersands', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry')
  })

  it('escapes double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;')
  })

  it('escapes single quotes', () => {
    expect(escapeHtml("O'Brien")).toBe('O&#x27;Brien')
  })

  it('preserves plain safe text', () => {
    expect(escapeHtml('Adaeze and Emeka')).toBe('Adaeze and Emeka')
  })
})
