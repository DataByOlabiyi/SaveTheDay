import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getWeddingsByUser, getUserProfile } from '@/lib/db/client'
import type { Wedding, WeddingStatus, UserProfile } from '@/lib/db/types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Studio | Save The Day',
  robots: { index: false, follow: false },
}

function StatusBadge({ status }: { status: WeddingStatus }) {
  const map = {
    draft:     { label: 'Draft', classes: 'bg-white/5 text-ivory/40' },
    ready:     { label: 'Ready', classes: 'bg-blue-500/10 text-blue-400' },
    published: { label: 'Live',  classes: 'bg-emerald-500/10 text-emerald-400' },
  }
  const { label, classes } = map[status] ?? map.draft
  return (
    <span className={`font-body text-xs tracking-widest uppercase px-2 py-1 rounded-sm ${classes}`}>
      {label}
    </span>
  )
}

function WeddingCard({ wedding }: { wedding: Wedding }) {
  const date = new Date(wedding.wedding_date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  return (
    <Link
      href={`/studio/${wedding.slug}`}
      className="group block border border-white/5 hover:border-white/10 rounded-sm p-6 transition-colors"
      style={{ background: 'rgba(255,255,255,0.01)' }}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="font-display text-xl text-ivory group-hover:text-gold transition-colors">
            {wedding.couple_names.name1} & {wedding.couple_names.name2}
          </h2>
          <p className="font-body text-ivory/30 text-xs mt-1">{date}</p>
        </div>
        <StatusBadge status={wedding.status} />
      </div>
      <div className="flex items-center gap-3 text-ivory/20 text-xs font-body mb-4">
        <span>{wedding.venue}</span>
        <span>·</span>
        <span>{wedding.city}</span>
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <span className="font-body text-xs text-ivory/20">/e/{wedding.slug}</span>
        <span className="font-body text-xs text-gold/50 group-hover:text-gold transition-colors">Open</span>
      </div>
    </Link>
  )
}

function NavBar({ profile }: { profile: UserProfile | null }) {
  const isPlanner = profile?.account_type === 'planner'
  return (
    <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link href="/" className="font-display text-gold text-xl italic tracking-wide">
          Save The Day
        </Link>
        {isPlanner && (
          <span className="font-body text-xs text-ivory/20 border border-white/10 px-2 py-0.5 rounded-sm tracking-widest uppercase">
            Planner
          </span>
        )}
      </div>
      <div className="flex items-center gap-5">
        <Link href="/account" className="font-body text-ivory/30 text-xs hover:text-gold transition-colors tracking-wide">
          Account
        </Link>
        <Link href="/e/demo-wedding" target="_blank" className="font-body text-ivory/30 text-xs hover:text-gold transition-colors tracking-wide">
          View demo
        </Link>
        <form action="/auth/signout" method="POST">
          <button type="submit" className="font-body text-ivory/30 text-xs hover:text-ivory/60 transition-colors">
            Sign out
          </button>
        </form>
      </div>
    </nav>
  )
}

function EmptyState() {
  return (
    <div
      className="text-center py-20 border border-white/5 border-dashed rounded-sm"
      style={{ background: 'radial-gradient(ellipse at center, rgba(201,168,76,0.02) 0%, transparent 70%)' }}
    >
      <span className="font-display text-gold text-4xl block mb-4 italic">S</span>
      <h2 className="font-display text-2xl text-ivory mb-3">Create your first wedding</h2>
      <p className="font-body text-ivory/30 text-sm mb-8 max-w-xs mx-auto leading-relaxed">
        Set up a Save-the-Date page in minutes. Add photos and guests from the Studio.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          href="/create"
          className="font-body text-obsidian bg-gold hover:bg-gold-light text-sm tracking-widest uppercase px-8 py-4 transition-colors inline-block rounded-sm"
        >
          Get started
        </Link>
        <Link
          href="/e/demo-wedding"
          target="_blank"
          className="font-body border border-white/10 hover:border-white/20 text-ivory/40 hover:text-ivory/70 text-sm tracking-wide px-8 py-4 transition-colors inline-block rounded-sm"
        >
          See a live demo
        </Link>
      </div>
    </div>
  )
}

export default async function StudioPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/studio/login')

  const [weddings, profile] = await Promise.all([
    getWeddingsByUser(user.id),
    getUserProfile(user.id),
  ])

  // Staff/admin accounts belong in /admin, not /studio
  if (profile?.role === 'admin' || profile?.role === 'super_admin') {
    redirect('/admin')
  }

  const isPlanner = profile?.account_type === 'planner'

  // Couple with one wedding → go straight to it
  if (!isPlanner && weddings.length === 1) {
    redirect(`/studio/${weddings[0].slug}`)
  }

  const published = weddings.filter(w => w.status === 'published').length
  const drafts    = weddings.filter(w => w.status === 'draft').length
  const ready     = weddings.filter(w => w.status === 'ready').length

  return (
    <div className="min-h-screen bg-obsidian">
      <NavBar profile={profile} />

      <div className={`mx-auto px-6 py-12 ${isPlanner ? 'max-w-6xl' : 'max-w-4xl'}`}>

        {isPlanner ? (
          <>
            <div className="flex items-start justify-between mb-8">
              <div>
                <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-1">Planner Studio</p>
                <h1 className="font-display text-3xl text-ivory">{profile?.business_name || 'Your Portfolio'}</h1>
              </div>
              <Link
                href="/create"
                className="font-body text-obsidian bg-gold hover:bg-gold-light text-sm tracking-widest uppercase px-5 py-3 transition-colors rounded-sm shrink-0"
              >
                + Add client
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {[
                { label: 'Total events', value: weddings.length },
                { label: 'Live',         value: published },
                { label: 'Ready',        value: ready },
                { label: 'In progress',  value: drafts },
              ].map(stat => (
                <div key={stat.label} className="border border-white/5 rounded-sm px-5 py-4" style={{ background: 'rgba(255,255,255,0.01)' }}>
                  <p className="font-display text-3xl text-ivory mb-1">{stat.value}</p>
                  <p className="font-body text-ivory/30 text-xs tracking-wide">{stat.label}</p>
                </div>
              ))}
            </div>
            {weddings.length === 0 ? <EmptyState /> : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {weddings.map(w => <WeddingCard key={w.id} wedding={w} />)}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-10">
              <div>
                <h1 className="font-display text-3xl text-ivory">My Weddings</h1>
                <p className="font-body text-ivory/30 text-sm mt-1">
                  {weddings.length === 0 ? 'No weddings yet.' : `${weddings.length} wedding${weddings.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              <Link
                href="/create"
                className="font-body text-obsidian bg-gold hover:bg-gold-light text-sm tracking-widest uppercase px-5 py-3 transition-colors rounded-sm shrink-0"
              >
                + New
              </Link>
            </div>
            {weddings.length === 0 ? <EmptyState /> : (
              <div className="grid gap-4 md:grid-cols-2">
                {weddings.map(w => <WeddingCard key={w.id} wedding={w} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
