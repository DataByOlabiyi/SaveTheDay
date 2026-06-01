// Shared helper: verify the requesting user is an admin or super_admin
// Returns the user + role, or null if unauthorized.

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/db/client'
import type { UserRole } from '@/lib/db/types'

export interface AdminIdentity {
  id:    string
  email: string
  role:  UserRole
}

export async function requireAdmin(
  minRole: 'admin' | 'super_admin' = 'admin'
): Promise<AdminIdentity | null> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const db = createAdminClient()
  const { data: profile } = await db
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (profile?.role ?? 'user') as UserRole

  if (minRole === 'super_admin' && role !== 'super_admin') return null
  if (minRole === 'admin' && role !== 'admin' && role !== 'super_admin') return null

  return { id: user.id, email: user.email ?? '', role }
}
