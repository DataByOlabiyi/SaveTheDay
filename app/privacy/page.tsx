import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy | Save The Day',
  description: 'Privacy Policy for Save The Day — how we collect, use, and protect your data.',
  robots: { index: true, follow: true },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-obsidian text-ivory">
      <nav className="border-b border-white/5 px-6 py-4">
        <Link href="/" className="font-display text-gold text-xl italic tracking-wide">
          Save The Day
        </Link>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-16 space-y-10">
        <header>
          <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-3">Legal</p>
          <h1 className="font-display text-4xl text-ivory mb-3">Privacy Policy</h1>
          <p className="font-body text-ivory/30 text-sm">Last updated: June 2026</p>
        </header>

        <Section title="1. Information We Collect">
          We collect: your email address when you sign up; wedding details you enter
          (couple names, date, venue); guest information you add (names, email, phone);
          usage data such as which pages are viewed and when invitations are opened.
        </Section>

        <Section title="2. How We Use Your Information">
          We use your information to: provide the Save The Day service; send you
          magic link sign-in emails; notify you when guests RSVP (if email
          notifications are enabled); improve the service. We do not sell your data
          to third parties.
        </Section>

        <Section title="3. Guest Data">
          When you add guests, their names and contact details are stored securely
          and used only to generate personalised invitation links and track RSVPs
          for your event. Guest data is visible only to you (the couple/planner) and
          is not shared with other users.
        </Section>

        <Section title="4. Data Storage">
          Your data is stored on Supabase infrastructure (hosted on AWS). Data is
          encrypted in transit (TLS) and at rest. Authentication is handled by
          Supabase Auth.
        </Section>

        <Section title="5. Cookies and Sessions">
          We use cookies to maintain your login session. No advertising or tracking
          cookies are set. You can clear cookies at any time via your browser settings,
          which will sign you out.
        </Section>

        <Section title="6. Data Retention">
          Your wedding data is retained for as long as your account is active.
          You may request deletion of your account and associated data by contacting us.
        </Section>

        <Section title="7. Third-Party Services">
          We use the following third-party services: Supabase (database and auth),
          Cloudinary (photo storage, optional), Resend (RSVP email notifications,
          optional), Vercel (hosting). Each has their own privacy policy.
        </Section>

        <Section title="8. Your Rights">
          Depending on your jurisdiction, you may have the right to access, correct,
          or delete your personal data. Contact us at{' '}
          <a href="mailto:hello@savetheday.app" className="text-gold/70 hover:text-gold transition-colors">
            hello@savetheday.app
          </a>{' '}
          to exercise these rights.
        </Section>

        <Section title="9. Changes to This Policy">
          We may update this policy. We will notify you of significant changes by
          email or via the service.
        </Section>

        <Section title="10. Contact">
          For privacy questions or data requests, contact{' '}
          <a href="mailto:hello@savetheday.app" className="text-gold/70 hover:text-gold transition-colors">
            hello@savetheday.app
          </a>.
        </Section>

        <div className="pt-8 border-t border-white/5 flex gap-6">
          <Link href="/terms" className="font-body text-ivory/30 text-sm hover:text-ivory/60 transition-colors">
            Terms of Service
          </Link>
          <Link href="/" className="font-body text-ivory/30 text-sm hover:text-ivory/60 transition-colors">
            Back to home
          </Link>
        </div>
      </article>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-lg text-ivory mb-3">{title}</h2>
      <p className="font-body text-ivory/50 text-sm leading-relaxed">{children}</p>
    </section>
  )
}
