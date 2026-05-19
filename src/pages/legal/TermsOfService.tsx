/**
 * Terms of Service — static page.
 *
 * Linked from CandidateRegistration consent and the marketing footer.
 * Plain-English version. Replace with counsel-reviewed final before launch.
 */
import { Link } from "react-router-dom";
import { LogoMark } from "@/components/ui/logo-mark";

export default function TermsOfService() {
  return (
    <div className="min-h-dvh bg-paper-2 text-ink antialiased">
      <header className="bg-paper border-b border-rule">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" aria-label="FlowDot AI home">
            <LogoMark size="md" withWordmark />
          </Link>
          <Link to="/privacy" className="text-sm text-ink-soft hover:text-ink">
            Privacy
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-14">
        <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-3">
          Legal
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-ink mb-2">
          Terms of service
        </h1>
        <p className="text-sm text-muted mb-10">
          Last updated 14 May 2026. By using FlowDot AI you agree to these terms.
          They apply to both <em>workspace users</em> (recruiters, hiring managers)
          and <em>applicants</em> (people invited to take an assessment). Where the
          terms differ for the two groups, we say so explicitly.
        </p>

        <Section title="The service">
          <p>
            FlowDot AI provides AI-assisted finance hiring assessments. Workspaces
            create roles, invite applicants, and receive a Talent Analysis Graph
            (TAG) summarising each applicant's interview performance against a
            calibrated rubric. The TAG is decision support, not a hiring decision —
            the workspace remains responsible for whom they hire.
          </p>
        </Section>

        <Section title="Eligibility">
          <p>
            You must be at least 18 years old, legally able to enter into a
            contract in India, and using FlowDot AI for lawful purposes. Workspace
            accounts must be created on behalf of a real organisation.
          </p>
        </Section>

        <Section title="Your account">
          <ul className="list-disc pl-5 space-y-1 text-ink-soft">
            <li>Keep your login credentials confidential. Notify us immediately of any unauthorised access.</li>
            <li>One person per account. Don't share your login.</li>
            <li>You're responsible for all activity under your account.</li>
          </ul>
        </Section>

        <Section title="Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1 text-ink-soft">
            <li>Use FlowDot AI to discriminate unlawfully on the basis of caste, religion, gender, sexual orientation, disability, or any other protected category.</li>
            <li>Reverse-engineer the AI scoring rubric to coach applicants on it.</li>
            <li>Probe, scan, or test the vulnerability of our systems without prior written consent.</li>
            <li>Upload malware, illegal content, or content that violates someone else's rights.</li>
            <li>Use automated tools to create accounts, scrape data, or impersonate applicants.</li>
            <li>Re-sell access to FlowDot AI without our written agreement.</li>
          </ul>
        </Section>

        <Section title="Workspace data and applicant data">
          <p>
            Workspaces own the role definitions, blueprints, ratings, notes, and
            shortlists they create. Applicants own their resumes, transcripts, and
            TAG outputs. FlowDot AI has a limited licence to process this data
            solely to operate the service, as described in our{' '}
            <Link to="/privacy" className="text-gold-ink underline">privacy policy</Link>.
          </p>
          <p>
            Workspaces must have a lawful basis (typically consent) for inviting
            applicants. By sending an invitation through FlowDot AI, the workspace
            warrants that it has obtained that consent.
          </p>
        </Section>

        <Section title="Pricing and billing">
          <p>
            Free tier and paid plans are offered. Pricing is shown in the in-app
            billing section once enabled. Charges are non-refundable except as
            required by law. We may change prices with 30 days' notice for new
            billing periods.
          </p>
        </Section>

        <Section title="Service availability">
          <p>
            We aim for 99.5% monthly uptime. We may schedule maintenance with
            advance notice. We are not liable for downtime caused by force majeure
            or third-party providers (Google Cloud, AssemblyAI, Cartesia, AWS).
          </p>
        </Section>

        <Section title="Termination">
          <p>
            You may delete your account at any time from{' '}
            <Link to="/settings" className="text-gold-ink underline">Settings</Link>{' '}
            (workspace) or your portal (applicant). We may suspend or terminate
            your account if you breach these terms, after notice and a chance to
            cure where reasonable. On termination, we delete your data per our
            retention policy.
          </p>
        </Section>

        <Section title="Disclaimers and liability">
          <p>
            FlowDot AI is provided "as is" without warranties of any kind, except
            those required by law. To the maximum extent permitted by Indian law,
            our aggregate liability for any claim is limited to the fees you paid
            us in the 12 months preceding the claim. Nothing in these terms
            limits liability that cannot be limited by law.
          </p>
        </Section>

        <Section title="Indemnity">
          <p>
            You agree to indemnify FlowDot AI against claims arising from your
            misuse of the service, your breach of these terms, or your violation
            of someone else's rights (including data protection law).
          </p>
        </Section>

        <Section title="Governing law and disputes">
          <p>
            These terms are governed by the laws of India. Disputes shall be
            resolved by the courts at Bengaluru, Karnataka, except where exclusive
            jurisdiction lies elsewhere by law. We prefer to talk first — write to{' '}
            <a className="text-gold-ink underline" href="mailto:legal@funnelhq.co">
              legal@funnelhq.co
            </a>{' '}
            before filing anything.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            We may update these terms; material changes are notified by email
            (workspace users) and on this page (applicants) at least 14 days
            before they take effect.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            <strong>Graydot Technologies Private Limited</strong>
            <br />
            <a className="text-gold-ink underline" href="mailto:legal@funnelhq.co">
              legal@funnelhq.co
            </a>
          </p>
        </Section>
      </main>

      <footer className="border-t border-rule bg-paper-2">
        <div className="max-w-3xl mx-auto px-6 py-6 text-xs text-muted flex flex-wrap gap-x-6 gap-y-2">
          <Link to="/" className="hover:text-ink">FlowDot AI</Link>
          <Link to="/privacy" className="hover:text-ink">Privacy</Link>
          <Link to="/terms" className="hover:text-ink">Terms</Link>
          <span>© 2026 Graydot Technologies Private Limited</span>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg md:text-xl font-semibold tracking-tight text-ink mb-3">
        {title}
      </h2>
      <div className="text-sm text-ink-soft leading-relaxed space-y-3">{children}</div>
    </section>
  );
}
