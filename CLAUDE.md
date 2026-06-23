# Save The Day — CLAUDE.md

This file governs all AI-assisted work on this codebase. Read it before touching anything.

---

## Default workflow rule

**For any non-trivial change, the full PM → Planner → Designer → Engineer → Tester → Reviewer workflow runs automatically.** You do not need to invoke it manually. The only exceptions are:

- Trivial fixes (typos, one-line patches where the cause and fix are both obvious)
- When the user explicitly says "skip the workflow"

If you are uncertain whether something is trivial, run the workflow.

---

## Stack (verified, not assumed)

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js App Router | 14.2.29 |
| Language | TypeScript | 5.6.3 |
| UI | React | 18.3.1 |
| Styling | Tailwind CSS | 3.4 + forms + typography plugins |
| Database / Auth | Supabase (PostgreSQL + RLS + Auth) | supabase-js 2.45 |
| Animations | Framer Motion | 11.11 |
| Animations (complex) | GSAP | 3.12 |
| Validation | Zod | 3.23 |
| Forms | React Hook Form | 7.53 |
| AI | Anthropic SDK (`@anthropic-ai/sdk`) | 0.104 |
| Rate limiting | Upstash Redis | ratelimit 2.0 |
| Error monitoring | Sentry | 10.55 |
| Analytics | Vercel Analytics | 1.4 |
| OG images | @vercel/og | 0.6 |
| PWA | @ducanh2912/next-pwa | 10.2 |
| Toasts | Sonner | 1.7 |
| Media storage | Cloudinary + Supabase Storage | — |
| Testing | Vitest | 4.1 (node env) |

---

## Architecture

### Routing namespaces

- `/e/[weddingSlug]/[guestSlug]` — canonical guest invitation page (personalized)
- `/e/[weddingSlug]` — generic invitation (no guest personalization)
- `/e/[weddingSlug]/gallery` — public gallery
- `/studio/[weddingSlug]` — couple/planner dashboard (auth required)
- `/admin/*` — platform admin (admin/super_admin role required)
- `/[weddingSlug]/*` and `/w/*` — legacy redirects to `/e/*`; do not add new pages here

### Supabase client rules

- **Anon client** (`supabase` from `lib/db/client.ts`) — public reads only; respects RLS
- **Admin client** (`createAdminClient()`) — bypasses RLS; use only in API routes and server components for writes or PII reads (guests table, analytics, etc.)
- **SSR client** (`createSupabaseServerClient()` from `lib/supabase/server.ts`) — session-aware; use in server components that need the authenticated user

### Auth flow

- Supabase Auth for couples/planners; session refreshed in middleware
- Admin role stored in `user_profiles.role` (values: `user`, `admin`, `super_admin`)
- Middleware enforces route guards: `/studio` requires auth, `/admin` requires admin role
- Password-protected weddings: scrypt hash stored in `wedding.config.privacy_password_hash` — **never returned to clients** (redacted in `getWeddingBySlug`)

### DB types

All database shapes live in `lib/db/types.ts`. These mirror the Supabase schema exactly. Do not invent parallel types — extend or reference what's there.

### Component hierarchy

```
atoms/       — pure presentational, no data fetching
molecules/   — interactive reusables (buttons, modals, players)
organisms/   — full page "scenes" with their own state
scenes/      — page-level orchestrators (TheUnveilingPage)
admin/       — Studio/dashboard components
```

---

## Hard rules — existing conventions you must preserve

1. **Zod validation on every API route.** No exceptions. Validate before touching the DB.
2. **`sanitizeText()` on all user-supplied strings before DB writes.** This is a security boundary, not optional.
3. **Rate limit all public-facing API routes** using `checkRateLimitAsync`.
4. **Named exports everywhere** except Next.js page/layout files (which use default exports as required).
5. **`'use client'` at the very top** of any component that uses hooks, browser APIs, or event handlers.
6. **Import alias `@/`** for all non-relative imports from the project root.
7. **Tailwind only** for styling. No inline style objects except for dynamic values (gradients, transforms) that cannot be expressed as Tailwind classes.
8. **No new Tailwind colors.** Use the existing palette: `obsidian`, `charcoal`, `emerald-*`, `ivory`, `cream`, `forest-*`, `gold-*`.
9. **TypeScript strict mode** is on. No `any` unless interfacing with an untyped third-party response (and only in the narrowest scope possible).
10. **Privacy password hash** (`config.privacy_password_hash`) must be stripped from every wedding object before it leaves a server component or API response. The only place it may appear is inside `getWeddingForPasswordCheck`.
11. **Guest PII** (phone, email, dietary) lives in the `guests` table and must only be read via the admin client. Never expose these fields through the anon client.
12. **Migrations** live in `supabase/migrations/`. Never modify existing migration files. New migrations get the next numbered prefix.
13. **Tests** use Vitest (`vitest run` / `vitest`). Test files go in `__tests__/`. Node environment only — no jsdom.
14. **No comments that explain what the code does.** Only write a comment when the WHY is non-obvious (hidden constraint, workaround, invariant).

---

## Risky areas — handle with care

### 1. Auth middleware (`middleware.ts`)
The Edge middleware that enforces all route guards. A bug here locks users out or exposes protected routes. Changes must be tested manually against all role combinations (unauthenticated, `user`, `admin`, `super_admin`).

### 2. Password gate (`lib/utils/password.ts`, `getWeddingForPasswordCheck`)
Scrypt hash verification for private weddings. The hash lives in `config.privacy_password_hash` inside a JSONB column. If the redaction in `getWeddingBySlug` is ever removed or bypassed, the hash leaks to the client.

### 3. RLS policies (`supabase/migrations/`)
10+ migration files define RLS across guests, weddings, analytics, guestbook, etc. Gaps in RLS are silent — no error, just wrong data access. Any new table needs RLS policies from day one.

### 4. RSVP route (`app/api/rsvp/route.ts`)
The most security-sensitive public endpoint. Processes guest data, checks block status, enforces per-guest plus-one overrides, sends couple emails. Rate-limited and Turnstile-gated. Test all branches before modifying.

### 5. Admin client singleton (`lib/db/client.ts` `_adminClient`)
The service-role client is a module-level singleton. It must never be initialised without `SUPABASE_SERVICE_ROLE_KEY`. Do not call `createAdminClient()` in client components or anywhere the service key is unavailable.

### 6. Subscription enforcement gap
Migration 008 created the `subscriptions` table (starter/premium/luxury tiers, Paystack references). **No code yet enforces tier limits** (wedding count, guest count). When billing goes live, enforcement must be added to `createWedding` and guest import — this is a known planned gap, not an oversight.

### 7. AI story endpoint (`app/api/ai/story/route.ts`)
Uses `claude-haiku-4-5-20251001` with an 8s timeout inside a Vercel function (10s hard limit). Thin margin. Do not add synchronous work inside this function before the AI call.

### 8. Legacy route duplication
`/[weddingSlug]/*`, `/w/*`, and `/e/*` all exist. The first two redirect to `/e/*`. Do not add new functionality to the legacy namespaces — they are redirect-only.

### 9. Demo wedding fallback
`getWeddingBySlug('demo-wedding')` returns in-memory data when the DB row is unavailable. Changes to `DEMO_WEDDING` in `lib/db/demo.ts` affect the live demo.

### 10. Minimal test coverage
Only `__tests__/utils.test.ts` exists, covering pure utility functions. There are no component tests, API route tests, or integration tests. Any code change that touches auth, payments, RSVP, or data writes should be manually verified and, where possible, accompanied by a new utility-level test.

---

## Definition of done

A task is done when:

- [ ] TypeScript compiles cleanly: `npm run type-check`
- [ ] Lint passes: `npm run lint`
- [ ] Existing tests pass: `npm run test`
- [ ] Any new pure-function logic has a corresponding Vitest test
- [ ] Security rules respected: Zod validation, `sanitizeText`, rate limiting on all new public API routes
- [ ] No new Tailwind colors, no `any`, no `console.log` left in production paths
- [ ] The feature has been visually verified in the browser (start with `npm run dev`)
- [ ] Risky areas above have been checked if the change touches them
