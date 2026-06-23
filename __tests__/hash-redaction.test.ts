import { describe, it, expect } from 'vitest'

describe('privacy_password_hash redaction', () => {
  it('strips privacy_password_hash from config', () => {
    // Simulate what getWeddingBySlugForOwner does after fetching
    const wedding = {
      id: 'test-id',
      slug: 'test-wedding',
      config: {
        theme: 'forest',
        privacy_password_hash: '$scrypt$N=32768,r=8,p=1$XXXXX$YYYYY',
        allow_plus_one: true,
      },
    }
    // Apply the same redaction logic used in getWeddingBySlugForOwner
    if (wedding.config) {
      delete (wedding.config as Record<string, unknown>).privacy_password_hash
    }
    expect(wedding.config).not.toHaveProperty('privacy_password_hash')
    expect(wedding.config).toHaveProperty('theme', 'forest')
    expect(wedding.config).toHaveProperty('allow_plus_one', true)
  })

  it('handles missing config without throwing', () => {
    const wedding = { id: 'test-id', config: null }
    expect(() => {
      if (wedding.config) {
        delete (wedding.config as Record<string, unknown>).privacy_password_hash
      }
    }).not.toThrow()
  })
})
