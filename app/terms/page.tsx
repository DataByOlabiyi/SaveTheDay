import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service | Save The Day',
  description: 'Terms of Service for Save The Day — luxury digital wedding invitations.',
  robots: { index: true, follow: true },
}

export default function TermsPage() {
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
          <h1 className="font-display text-4xl text-ivory mb-3">Terms of Service</h1>
          <p className="font-body text-ivory/30 text-sm">Last updated: June 2026</p>
        </header>

        <Section title="1. Acceptance of Terms">
          By creating an account or using Save The Day, you agree to these Terms of Service.
          If you do not agree, do not use the service.
        </Section>

        <Section title="2. Description of Service">
          Save The Day provides a platform for creating and sharing digital wedding
          Save-the-Date pages, managing guest lists, collecting RSVPs, and sharing
          photos and stories with invited guests.
        </Section>

        <Section title="3. Account Responsibility">
          You are responsible for maintaining the security of your account and all
          activity that occurs under it. You must provide a valid email address and
          keep your contact information current.
        </Section>

        <Section title="4. Acceptable Use">
          You agree not to use the service to send spam, engage in harassment, upload
          illegal content, or attempt to gain unauthorised access to any part of the
          service. We reserve the right to terminate accounts that violate these terms.
        </Section>

        <Section title="5. Content">
          You retain ownership of content you upload (photos, text, guest data). By
          uploading content you grant Save The Day a licence to store and display it
          as necessary to provide the service. You are responsible for ensuring you
          have the right to use all content you upload.
        </Section>

        <Section title="6. Guest Data">
          When you add guests to your wedding, you are responsible for having
          appropriate consent to share their contact information with us. Guest data
          is used solely to provide personalised invitations and RSVP tracking for
          your event.
        </Section>

        <Section title="7. Service Availability">
          We aim for high availability but do not guarantee uninterrupted access.
          We may modify or discontinue features with reasonable notice.
        </Section>

        <Section title="8. Limitation of Liability">
          Save The Day is provided &quot;as is&quot; without warranties of any kind.
          To the maximum extent permitted by law, we are not liable for indirect,
          incidental, or consequential damages arising from your use of the service.
        </Section>

        <Section title="9. Changes to Terms">
          We may update these terms from time to time. Continued use of the service
          after changes constitutes acceptance of the new terms.
        </Section>

        <Section title="10. Contact">
          For questions about these terms, contact us at{' '}
          <a href="mailto:hello@savetheday.app" className="text-gold/70 hover:text-gold transition-colors">
            hello@savetheday.app
          </a>.
        </Section>

        <div className="pt-8 border-t border-white/5 flex gap-6">
          <Link href="/privacy" className="font-body text-ivory/30 text-sm hover:text-ivory/60 transition-colors">
            Privacy Policy
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
