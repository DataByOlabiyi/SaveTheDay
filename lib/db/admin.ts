import { createAdminClient } from './client'
import type { AdminAuditLog, UserProfile, Wedding } from './types'

// ── Platform stats ────────────────────────────────────────────

export interface PlatformStats {
  total_users:     number
  total_weddings:  number
  published:       number
  drafts:          number
  total_guests:    number
  total_rsvps:     number
  signups_7d:      number
  signups_30d:     number
  weddings_7d:     number
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const db = createAdminClient()
  const now = new Date()
  const day7  = new Date(now.getTime() - 7  * 86400000).toISOString()
  const day30 = new Date(now.getTime() - 30 * 86400000).toISOString()

  const [
    { count: total_users },
    { count: total_weddings },
    { count: published },
    { count: drafts },
    { count: total_guests },
    { count: total_rsvps },
    { count: signups_7d },
    { count: signups_30d },
    { count: weddings_7d },
  ] = await Promise.all([
    db.from('user_profiles').select('id', { count: 'exact', head: true }),
    db.from('weddings').select('id', { count: 'exact', head: true }),
    db.from('weddings').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    db.from('weddings').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    db.from('guests').select('id', { count: 'exact', head: true }),
    db.from('guests').select('id', { count: 'exact', head: true }).neq('rsvp_status', 'pending'),
    db.from('user_profiles').select('id', { count: 'exact', head: true }).gte('created_at', day7),
    db.from('user_profiles').select('id', { count: 'exact', head: true }).gte('created_at', day30),
    db.from('weddings').select('id', { count: 'exact', head: true }).gte('created_at', day7),
  ])

  return {
    total_users:    total_users    ?? 0,
    total_weddings: total_weddings ?? 0,
    published:      published      ?? 0,
    drafts:         drafts         ?? 0,
    total_guests:   total_guests   ?? 0,
    total_rsvps:    total_rsvps    ?? 0,
    signups_7d:     signups_7d     ?? 0,
    signups_30d:    signups_30d    ?? 0,
    weddings_7d:    weddings_7d    ?? 0,
  }
}

// ── All users ─────────────────────────────────────────────────

export interface AdminUserRow extends UserProfile {
  wedding_count: number
}

export async function getAllUsers(
  page = 0,
  pageSize = 50,
  search = ''
): Promise<{ users: AdminUserRow[]; total: number }> {
  const db     = createAdminClient()
  const offset = page * pageSize

  let query = db
    .from('user_profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
  }

  const { data, count, error } = await query
  if (error || !data) return { users: [], total: 0 }

  // Fetch wedding counts separately — embedded count requires a PostgREST-visible FK
  // which may not exist if weddings.user_id references auth.users rather than user_profiles
  const userIds = (data as UserProfile[]).map(u => u.id)
  const weddingCounts: Record<string, number> = {}
  if (userIds.length > 0) {
    const { data: weddingRows } = await db
      .from('weddings')
      .select('user_id')
      .in('user_id', userIds)
    for (const w of weddingRows ?? []) {
      weddingCounts[w.user_id] = (weddingCounts[w.user_id] ?? 0) + 1
    }
  }

  const users: AdminUserRow[] = (data as UserProfile[]).map(u => ({
    ...u,
    wedding_count: weddingCounts[u.id] ?? 0,
  }))

  return { users, total: count ?? 0 }
}

// ── All weddings ──────────────────────────────────────────────

export interface AdminWeddingRow extends Wedding {
  guest_count: number
  owner_email: string
}

export async function getAllWeddings(
  page = 0,
  pageSize = 50,
  search = ''
): Promise<{ weddings: AdminWeddingRow[]; total: number }> {
  const db     = createAdminClient()
  const offset = page * pageSize

  // Use embedded count for guests; fetch owner emails in parallel
  let query = db
    .from('weddings')
    .select('*, guests(count)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (search) {
    query = query.or(`slug.ilike.%${search}%,city.ilike.%${search}%,venue.ilike.%${search}%,couple_names->>name1.ilike.%${search}%,couple_names->>name2.ilike.%${search}%`)
  }

  const { data, count, error } = await query
  if (error || !data) return { weddings: [], total: 0 }

  const userIds = [...new Set(data.map((w: { user_id?: string }) => w.user_id).filter(Boolean) as string[])]
  const { data: profiles } = await db
    .from('user_profiles')
    .select('id, email')
    .in('id', userIds)

  const emailMap: Record<string, string> = {}
  for (const p of profiles ?? []) {
    emailMap[p.id] = p.email
  }

  const weddings: AdminWeddingRow[] = (data as Array<Wedding & { guests: [{ count: number }] }>).map(w => {
    if (w.config) {
      delete (w.config as unknown as Record<string, unknown>).privacy_password_hash
    }
    return {
      ...w,
      guest_count: w.guests?.[0]?.count ?? 0,
      owner_email: emailMap[w.user_id ?? ''] ?? '—',
    }
  })

  return { weddings, total: count ?? 0 }
}

// ── Team members ──────────────────────────────────────────────

export async function getTeamMembers(): Promise<UserProfile[]> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('user_profiles')
    .select('*')
    .in('role', ['admin', 'super_admin'])
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return data as UserProfile[]
}

export async function setUserRole(
  userId: string,
  role: 'user' | 'admin'
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient()
  const { error } = await db
    .from('user_profiles')
    .update({ role })
    .eq('id', userId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ── Audit log ─────────────────────────────────────────────────

export async function writeAuditLog(entry: {
  admin_id:      string
  admin_email:   string
  action:        string
  resource_type: string
  resource_id:   string
  details?:      Record<string, unknown>
}): Promise<void> {
  try {
    const db = createAdminClient()
    await db.from('admin_audit_log').insert(entry)
  } catch { /* Non-fatal */ }
}

export async function getAuditLog(
  page = 0,
  pageSize = 50
): Promise<{ entries: AdminAuditLog[]; total: number }> {
  const db     = createAdminClient()
  const offset = page * pageSize
  const { data, count, error } = await db
    .from('admin_audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (error || !data) return { entries: [], total: 0 }
  return { entries: data as AdminAuditLog[], total: count ?? 0 }
}

// ── Admin delete operations ───────────────────────────────────

export async function adminDeleteWedding(
  weddingId: string
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient()
  const { error } = await db.from('weddings').delete().eq('id', weddingId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function adminDeleteUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  // Deleting from auth.users cascades to user_profiles and weddings (via FK)
  const db = createAdminClient()
  const { error } = await db.auth.admin.deleteUser(userId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
