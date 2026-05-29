import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getWeddingBySlug, getGuestsByWedding } from '@/lib/db/client'
import { AdminDashboard } from '@/components/admin/AdminDashboard'

// Never cache this page — guest list must always be fresh
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Admin Dashboard | Save The Day',
  robots: { index: false, follow: false },
}

interface PageProps {
  params: { weddingSlug: string }
  searchParams: { secret?: string }
}

export default async function AdminPage({ params, searchParams }: PageProps) {
  // Simple secret-based auth (use Supabase Auth in production)
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret || searchParams.secret !== adminSecret) {
    // Return a simple unauthorized message (not a redirect to avoid leaking slug)
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <div className="text-center">
          <p className="font-body text-ivory/40 text-sm tracking-widest uppercase">
            Unauthorized
          </p>
        </div>
      </div>
    )
  }

  const wedding = await getWeddingBySlug(params.weddingSlug)
  if (!wedding) notFound()

  const guests = await getGuestsByWedding(wedding.id)

  return <AdminDashboard wedding={wedding} guests={guests} adminSecret={searchParams.secret} />
}
