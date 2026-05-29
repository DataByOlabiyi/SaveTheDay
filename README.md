# Save The Day 🥂
### *"The digital ceremony that starts before the wedding."*

> A luxury, cinematic, mobile-first Save the Date experience for Nigerian weddings and the diaspora. Built for couples who understand that how you invite people is the first statement your wedding makes.

---

## What This Is (And Why It Exists)

Most digital wedding invitations are WhatsApp image blasts or generic Canva PDFs. They communicate: *"Here is information."*

**Save The Day** communicates: *"You have been personally summoned to something sacred and beautiful."*

The guest doesn't receive an invitation. They **earn** it — by tapping through a cinematic sequence that treats the save-the-date itself as the first act of the wedding.

---

## The Experience: Beat by Beat

When a guest taps your WhatsApp link, this is what happens:

```
T+0s      Black screen. One gold particle drifts upward.          → Curiosity
T+3s      A candle flame materialises from nothing.               → Stillness
T+6s      A wax-sealed envelope drifts in from below.             → Anticipation
T+7.5s    "Tap to open" appears.                                  → Permission
[TAP]     Seal cracks. Particles burst. Haptic fires.             → Reward
T+8s      Envelope unfolds. Names appear, letter by letter.       → Recognition
[SCROLL]  Cinematic photo montage with caption overlays.          → Emotion
          Date fades in. Venue. City.                             → Excitement
          "Temi, you're invited."                                 → Belonging
          RSVP button pulses once, gently.                        → Conversion
[RSVP]    Shareable card generated.                               → Viral loop
```

This is **not** a form with a pretty background. Every decision — the 3-second silence before anything appears, the haptic feedback on seal crack, the staggered character animation for names — is an intentional signal that tells the guest: *this couple takes beauty seriously.*

---

## Tech Stack Explained

| Layer | Tool | Why |
|-------|------|-----|
| **Framework** | Next.js 14 (App Router) | Server-side rendering = fast first paint on Nigerian 4G. Built-in image optimisation. Edge runtime for personalisation. |
| **Styling** | Tailwind CSS + custom CSS | Design tokens for the luxury palette. Custom keyframes for the motion language. Zero-overhead in production. |
| **Animations** | GSAP + Framer Motion | GSAP handles complex timeline sequencing (envelope, seal, particles). Framer Motion handles React component states (RSVP form, transitions). |
| **Particles** | Canvas API (custom) | Native Canvas — no library overhead. 60fps ambient particles on low-end Android. |
| **Database** | Supabase (PostgreSQL) | Real-time capable, Row Level Security, free tier handles 500+ weddings. |
| **Media** | Cloudinary | Adaptive image/video delivery. Auto WebP/AVIF conversion. Responsive transformations at the URL level. |
| **Hosting** | Vercel | Global CDN. Nigerian users route through the London PoP. Zero-config deployment. |
| **OG Images** | Vercel OG / `@vercel/og` | Dynamic Open Graph images generated at the edge. Each guest gets a personalised "For Temi" preview image on WhatsApp. |
| **Forms** | React Hook Form + Zod | Type-safe form validation. No library bloat. |
| **Analytics** | Vercel Analytics | Privacy-first. See opens, completions, RSVP rates, geography — without needing a cookie banner. |

---

## Project Architecture

```
save-the-day/
│
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root: fonts, meta, toast provider
│   ├── page.tsx                  # Root: redirects to demo wedding
│   ├── not-found.tsx             # 404: "This invitation has expired"
│   │
│   ├── [weddingSlug]/            # Generic wedding experience
│   │   └── page.tsx
│   ├── [weddingSlug]/[guestSlug]/ # Personalised experience
│   │   └── page.tsx
│   │
│   ├── admin/[weddingSlug]/      # Couple's dashboard (secret-protected)
│   │   └── page.tsx
│   │
│   └── api/
│       ├── rsvp/route.ts         # POST: save RSVP to Supabase
│       ├── analytics/route.ts    # POST: track events
│       ├── guest/mark-opened/    # POST: mark invitation as opened
│       │   └── route.ts
│       └── og/route.tsx          # GET: dynamic OG image generation
│
├── components/
│   ├── atoms/                    # Smallest UI units
│   │   ├── ParticleField.tsx     # Canvas particle system (ambient + burst)
│   │   ├── FlameIcon.tsx         # SVG animated candle flame
│   │   ├── GoldText.tsx          # Gradient/shimmer text + divider
│   │   └── CountdownUnit.tsx     # Single countdown digit with flip
│   │
│   ├── molecules/                # Composed units
│   │   ├── CountdownTimer.tsx    # Full countdown clock
│   │   ├── NameReveal.tsx        # Staggered character entrance animation
│   │   └── RSVPButton.tsx        # CTA with ripple + glow pulse
│   │
│   ├── organisms/                # Full feature sections
│   │   ├── EnvelopeScene.tsx     # Complete envelope + seal interaction
│   │   ├── MontageScene.tsx      # Auto-advancing photo slideshow
│   │   └── RSVPForm.tsx          # Full RSVP form with validation
│   │
│   ├── scenes/
│   │   └── TheUnveilingPage.tsx  # Master orchestrator — assembles all scenes
│   │
│   └── admin/
│       └── AdminDashboard.tsx    # Guest list + analytics dashboard
│
├── lib/
│   ├── db/
│   │   ├── client.ts             # Supabase queries (public + admin)
│   │   └── types.ts              # TypeScript interfaces for all DB tables
│   ├── animations/
│   │   └── timelines.ts          # Timing constants, easings, haptic patterns
│   ├── personalization/
│   │   └── guest.ts              # Name formatting, countdown, OG metadata
│   ├── analytics/
│   │   └── events.ts             # Client-side analytics tracker
│   └── utils.ts                  # cn(), Cloudinary URL builder, ICS generator
│
├── supabase/
│   └── schema.sql                # Complete database schema + demo seed data
│
├── public/                       # Static assets
├── middleware.ts                 # Edge: admin auth + security headers
├── next.config.js                # Image domains, compression, security headers
├── tailwind.config.ts            # Design system tokens + animation keyframes
└── vercel.json                   # Deployment + CDN cache rules
```

---

## How the Animation System Works

### The Motion Language

Every animation in this app obeys four principles:

1. **Decelerate to signal luxury.** Fast things feel cheap. Slow things feel considered. The envelope arrives in 1.2 seconds. Names take 2.4 seconds to fully appear. The 3-second silence at the start is the most deliberate design decision in the entire product.

2. **Physics over linearity.** We don't use `ease` or `linear`. We use `cubic-bezier(0.22, 1, 0.36, 1)` — an "expo out" curve that decelerates dramatically, like an object settling under gravity.

3. **Stagger is rhythm.** Characters in a name don't all appear at once. Each one enters 80ms after the last. This creates a reading rhythm that feels handwritten.

4. **Rest is communication.** Between every 3–4 animated beats, there's a still moment. Information is delivered one piece at a time, never competing with itself.

### The Timeline

```
lib/animations/timelines.ts exports:

TIMELINE   — ms offsets for every beat in the intro sequence
EASINGS    — named cubic-bezier curves
DURATIONS  — micro/fast/medium/slow/verySlow/ambient
PARTICLES  — config for ambient field vs seal burst
NAME_STAGGER — character animation params
HAPTIC     — vibration patterns for each interaction
```

### The Particle System

There are two particle modes, both using the Canvas API:

- **Ambient field** — 50–60 particles drift upward continuously, randomly placed, with opacity fade-in/fade-out lifecycle. Runs throughout the experience.
- **Seal burst** — 40 particles radiate outward from the seal's exact screen position at the moment of tap. One-shot, 800ms, fires the `onBurstComplete` callback when done.

Both degrade gracefully: if Canvas isn't supported, nothing crashes — the experience continues without particles.

---

## Personalisation Architecture

### URL Structure

```
https://savetheday.ng/adaeze-emeka-2025              → Generic experience
https://savetheday.ng/adaeze-emeka-2025/temi-johnson → Personalised for Temi
```

The `weddingSlug` maps to a row in the `weddings` table. The `guestSlug` maps to a row in the `guests` table. Both are resolved in `generateMetadata` and the page component using server-side Supabase queries.

### What "Personalised" Means

- The OG preview image on WhatsApp reads **"For Temi"** — her name is in the image
- The experience shows **"For Temi"** before the names
- After the names, the message reads **"Temi, you're invited"**
- The personal note says **"Adaeze & Emeka can't imagine this day without you"**
- Her RSVP is pre-linked to her guest record in the database

If a guest visits without a `guestSlug` (or with an invalid one), the experience gracefully degrades to the generic version — no errors, no broken states.

### At Scale

- **< 500 guests**: URL slugs work perfectly. No auth needed.
- **500–5000 guests**: Add Redis/Upstash caching of guest lookups at the edge.
- **> 5000 guests**: Migrate to Supabase Edge Functions for sub-10ms personalization.

---

## The Database Schema

### `weddings`
One row per couple. Contains the `config` JSONB column which drives feature flags:
```json
{
  "show_countdown": true,
  "show_guestbook": false,
  "allow_plus_one": true,
  "collect_dietary": true,
  "rsvp_deadline": "2026-09-15",
  "montage_images": ["cloudinary-public-id-1", "..."],
  "montage_video": "cloudinary-video-id"
}
```

### `guests`
One row per invited guest. `opened_at` is set the first time they open the invitation. `rsvp_status` transitions: `pending` → `attending` | `declined`.

### `analytics_events`
Event stream. Every significant interaction appends a row:
- `opened` — first page load
- `seal_tapped` — the envelope was opened
- `video_watched` — montage reached 50% completion
- `rsvp_submitted` — RSVP form was submitted
- `shared` — WhatsApp share was clicked

This gives the couple a real funnel: *opened → seal tapped → video watched → RSVP submitted → shared*.

---

## Performance: Why It Works on Nigerian Networks

### The Critical Path Problem

On a 4G connection in Lagos (~10–20 Mbps with ~100ms latency), the browser needs to:
1. Resolve DNS
2. Open TCP connection
3. TLS handshake
4. Download the HTML
5. Parse HTML, discover resources
6. Download CSS, fonts, JavaScript
7. Render first pixel

Every millisecond matters. Here's how we optimised each step:

| Technique | Impact |
|-----------|--------|
| Next.js SSR | HTML delivered with content on first request — no blank screen |
| Critical CSS inlined | CSS for the above-fold content is in `<head>` — no render-blocking stylesheet |
| Font preloading | `rel="preload"` on fonts + `font-display: swap` — text shows immediately |
| WebP/AVIF images | 40–60% smaller than JPEG/PNG at the same quality |
| Code splitting | Each scene's JS only loads when it's about to be displayed |
| Video lazy loading | Video never loads until the user taps play — poster image only |
| Service Worker | On return visits, the entire experience loads from cache — instant |
| Vercel CDN | Static assets served from London PoP ~50ms from Lagos |

**Target metrics (Lighthouse mobile):**
- Performance: > 90
- FCP: < 1.5s on 4G
- LCP: < 2.5s
- CLS: < 0.05

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- A [Cloudinary](https://cloudinary.com) account (free tier works)
- A [Vercel](https://vercel.com) account for deployment

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in your Supabase and Cloudinary credentials.

### 3. Set up the database

In your Supabase project, open the SQL editor and run:

```sql
-- Paste the contents of supabase/schema.sql
```

This creates all tables, indexes, RLS policies, and seeds a demo wedding.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000/demo-wedding](http://localhost:3000/demo-wedding) to see the demo.

To see a personalised experience:
[http://localhost:3000/demo-wedding/temi-johnson](http://localhost:3000/demo-wedding/temi-johnson)

To see the admin dashboard:
[http://localhost:3000/admin/demo-wedding?secret=your-admin-secret](http://localhost:3000/admin/demo-wedding?secret=your-admin-secret)

---

## Adding a Real Wedding

### 1. Insert the wedding into Supabase

```sql
INSERT INTO weddings (slug, couple_names, wedding_date, venue, venue_address, city, config)
VALUES (
  'chioma-tobi-2026',
  '{"name1": "Chioma", "name2": "Tobi"}',
  '2026-12-12 14:00:00+01',
  'Landmark Event Centre',
  'Plot 2, Water Corporation Road, Victoria Island',
  'Lagos',
  '{
    "show_countdown": true,
    "show_guestbook": true,
    "allow_plus_one": true,
    "collect_dietary": true,
    "rsvp_deadline": "2026-11-01",
    "montage_images": ["your-cloudinary-id-1", "your-cloudinary-id-2"]
  }'
);
```

### 2. Upload couple photos to Cloudinary

Upload 5–8 couple photos to Cloudinary. Use the public IDs in the `montage_images` array above.

For best results:
- Use portrait/square photos (4:5 or 1:1 ratio)
- Ensure faces are not at the very top (the gradient overlay covers the bottom 30%)
- Prefer warm-toned photos — they harmonise with the gold palette

### 3. Add guests

```sql
-- Bulk insert from CSV using Supabase's CSV import, or insert directly:
INSERT INTO guests (wedding_id, name, slug, phone, email)
SELECT
  w.id,
  unnest(ARRAY['Aisha Bello', 'Kunle Adeyemi', 'Ngozi Obi']),
  unnest(ARRAY['aisha-bello', 'kunle-adeyemi', 'ngozi-obi']),
  unnest(ARRAY['+2348011111111', '+2348022222222', '+2348033333333']),
  unnest(ARRAY['aisha@example.com', NULL, 'ngozi@example.com'])
FROM weddings w WHERE w.slug = 'chioma-tobi-2026';
```

### 4. Send WhatsApp invitations

For each guest, the personal link is:
```
https://your-domain.com/chioma-tobi-2026/aisha-bello
```

You can export all guest links from the admin dashboard:
```
https://your-domain.com/admin/chioma-tobi-2026?secret=YOUR_ADMIN_SECRET
```

---

## Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Or connect to GitHub and enable auto-deploy
```

In Vercel's dashboard, add all environment variables from `.env.local`.

### Custom Domain

In Vercel → Domains, add `savetheday.ng` (or your domain). Update `NEXT_PUBLIC_APP_URL` to your production URL.

### Post-deployment checklist

- [ ] Supabase environment variables set in Vercel
- [ ] `NEXT_PUBLIC_APP_URL` set to production URL
- [ ] `ADMIN_SECRET` set to a random string (use `openssl rand -base64 32`)
- [ ] Cloudinary cloud name set
- [ ] Database schema applied in Supabase SQL editor
- [ ] Demo wedding loads at `your-domain.com/demo-wedding`
- [ ] OG image generates at `your-domain.com/api/og?slug=demo-wedding`
- [ ] RSVP submits successfully (check Supabase table for new rows)

---

## The Tier System

| Tier | Price | What You Build |
|------|-------|----------------|
| **Starter** | ₦15,000 | Animated envelope + countdown + RSVP link (embedded Typeform) |
| **Premium** | ₦45,000+ | Full experience + personalised guest links + custom RSVP + photo montage + admin dashboard |
| **Luxury** | ₦120,000+ | Video montage + ambient score + WhatsApp Business API + QR check-in + real-time guestbook |

The codebase supports all three tiers. Feature flags in the `config` JSONB column control what's enabled per wedding.

---

## Roadmap

### V2 (Next)
- [ ] Video montage with Cloudinary adaptive streaming
- [ ] Ambient audio score via Tone.js (user-initiated to satisfy iOS)
- [ ] Real-time guestbook (Supabase Realtime)
- [ ] Couple self-service builder (upload photos, enter details, preview)
- [ ] Analytics dashboard with funnel visualisation

### V3 (Platform)
- [ ] QR code check-in system
- [ ] WhatsApp Business API integration (send invitations directly)
- [ ] AI-personalised video greetings (ElevenLabs + video overlay)
- [ ] Post-wedding gallery (experience continues after the day)
- [ ] White-label for wedding planners

---

## Design Decisions Worth Noting

**Why Cormorant Garamond?**
It's the thinnest, most delicate serif available on Google Fonts. At weight 300, the letters feel like they're drawn rather than printed. It's used for names, dates, and moments where the words themselves are the design.

**Why the 3 seconds of silence?**
Every other digital experience begins immediately. Opening Instagram, WhatsApp, any app — content fills your screen in milliseconds. Three seconds of almost-nothing is disorienting in 2026. That disorientation is the point. It tells the brain: *this is different, pay attention.* Perfume ads use this technique. So does the Met Gala. Luxury doesn't rush.

**Why wax seal and not fingerprint/face ID?**
A wax seal is a physical metaphor that translates perfectly to a tap gesture. It has cultural weight — it signals that something important was sealed inside, meant for you. It also scales: it works on a Tecno Spark the same way it works on an iPhone 15 Pro.

**Why not use Three.js or WebGL?**
Battery drain. Low-end phones in Nigeria run hot. WebGL forces the GPU to work continuously. Our Canvas-based particles and CSS 3D transforms use the CPU for brief bursts, then idle. The experience feels premium without killing the phone.

**Why no autoplay audio?**
iOS Safari blocks audio that starts without user gesture — this has been true since iOS 9 and Apple has never changed it. We detect the first meaningful tap (which on our site is the seal crack) and use that as the audio context unlock. This means audio begins at the most emotionally resonant moment anyway.

---

## License

Built for commercial use. Resell rights included for wedding vendors and planners.

---

*"The digital ceremony that starts before the wedding."*

**Save The Day** — [savetheday.ng](https://savetheday.ng)
