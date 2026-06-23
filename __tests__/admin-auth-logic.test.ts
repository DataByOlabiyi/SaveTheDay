import { describe, it, expect } from 'vitest'
import type { UserRole } from '@/lib/db/types'

// ──────────────────────────────────────────────────────────────
// Admin role authorisation logic
//
// Extracted from lib/utils/adminAuth.ts (requireAdmin) and
// middleware.ts (role checks).
//
// The actual requireAdmin() function calls Supabase and cannot run
// in node/vitest. These tests cover the pure decision logic.
// ──────────────────────────────────────────────────────────────

/** Returns true when the role satisfies the minimum requirement. */
function roleHasMinimum(role: UserRole, minRole: 'admin' | 'super_admin'): boolean {
  if (minRole === 'super_admin') return role === 'super_admin'
  return role === 'admin' || role === 'super_admin'
}

describe('roleHasMinimum', () => {
  it('super_admin satisfies minRole=super_admin', () => {
    expect(roleHasMinimum('super_admin', 'super_admin')).toBe(true)
  })

  it('admin does NOT satisfy minRole=super_admin', () => {
    expect(roleHasMinimum('admin', 'super_admin')).toBe(false)
  })

  it('user does NOT satisfy minRole=super_admin', () => {
    expect(roleHasMinimum('user', 'super_admin')).toBe(false)
  })

  it('admin satisfies minRole=admin', () => {
    expect(roleHasMinimum('admin', 'admin')).toBe(true)
  })

  it('super_admin satisfies minRole=admin (escalation)', () => {
    expect(roleHasMinimum('super_admin', 'admin')).toBe(true)
  })

  it('user does NOT satisfy minRole=admin', () => {
    expect(roleHasMinimum('user', 'admin')).toBe(false)
  })
})

// ── Middleware role check ──────────────────────────────────────
// Mirrors middleware.ts line 52: role !== 'admin' && role !== 'super_admin'
function isAdminRole(role: string): boolean {
  return role === 'admin' || role === 'super_admin'
}

describe('isAdminRole (middleware role guard)', () => {
  it('recognises "admin"', () => {
    expect(isAdminRole('admin')).toBe(true)
  })

  it('recognises "super_admin"', () => {
    expect(isAdminRole('super_admin')).toBe(true)
  })

  it('rejects "user"', () => {
    expect(isAdminRole('user')).toBe(false)
  })

  it('rejects empty string (missing profile fallback)', () => {
    expect(isAdminRole('')).toBe(false)
  })

  it('rejects unknown role strings', () => {
    expect(isAdminRole('ADMIN')).toBe(false)   // case-sensitive
    expect(isAdminRole('Admin')).toBe(false)
    expect(isAdminRole('moderator')).toBe(false)
  })
})
