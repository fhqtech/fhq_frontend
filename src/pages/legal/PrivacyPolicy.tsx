/**
 * Privacy Policy — DPDP-aware static page.
 *
 * Linked from CandidateRegistration consent and the marketing footer.
 * Copy is intentionally short, plain-English, and reviewed against
 * India's Digital Personal Data Protection Act (DPDP), 2023.
 *
 * NOT a substitute for legal review. Update with counsel before launch.
 */
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogoMark } from "@/components/ui/logo-mark";

function LanguageToggle() {
  const { t, i18n } = useTranslation("privacy");
  const setLng = (lng: string) => {
    void i18n.changeLanguage(lng);
    document.documentElement.lang = lng;
  };
  const current = i18n.resolvedLanguage || "en";
  return (
    <div className="flex items-center gap-2 text-sm" role="group" aria-label={t("languageToggle.label")}>
      <button
        onClick={() => setLng("en")}
        className={current === "en" ? "font-semibold text-ink" : "text-muted hover:text-ink"}
        aria-pressed={current === "en"}
      >
        {t("languageToggle.english")}
      </button>
      <span className="text-rule">·</span>
      <button
        onClick={() => setLng("hi")}
        className={current === "hi" ? "font-semibold text-ink" : "text-muted hover:text-ink"}
        aria-pressed={current === "hi"}
      >
        {t("languageToggle.hindi")}
      </button>
    </div>
  );
}

export default function PrivacyPolicy() {
  const { t } = useTranslation("privacy");
  return (
    <div className="min-h-dvh bg-paper-2 text-ink antialiased">
      <header className="bg-paper border-b border-rule">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" aria-label="FlowDot AI home">
            <LogoMark size="md" withWordmark />
          </Link>
          <div className="flex items-center gap-4">
            <LanguageToggle />
            <Link to="/terms" className="text-sm text-ink-soft hover:text-ink">
              Terms
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-14">
        <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-3">
          {t("kicker")}
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-ink mb-2">
          {t("title")}
        </h1>
        <p className="text-sm text-muted mb-3">
          {t("lastUpdated")} {t("intro")}
        </p>
        <p className="text-sm text-ink-soft mb-10 p-4 bg-paper border border-rule rounded-md">
          {t("summary")}
        </p>
        <p className="text-xs text-muted mb-10 italic">{t("fullPolicyNote")}</p>

        <Section title="Who we are">
          <p>
            FlowDot AI is operated by <strong>Graydot Technologies Private Limited</strong>,
            registered in India. We provide AI-assisted hiring tools to finance teams
            and process the personal data of two distinct user groups: <em>workspace
            users</em> (recruiters, hiring managers) and <em>applicants</em> (people
            taking AI assessments).
          </p>
          <p>
            For DPDP purposes, FlowDot AI is the <strong>Data Fiduciary</strong> for
            workspace user accounts. For applicant data, FlowDot AI acts as a{' '}
            <strong>Data Processor</strong> on behalf of the workspace that invited
            the applicant.
          </p>
        </Section>

        <Section title="What we collect">
          <h3 className="font-semibold text-ink mt-4 mb-1">From workspace users</h3>
          <ul className="list-disc pl-5 space-y-1 text-ink-soft">
            <li>Email address, name, password hash (or Google OAuth identity).</li>
            <li>Workspace name, billing address (when billing is enabled).</li>
            <li>Usage events (which features you used, when) — for analytics.</li>
          </ul>

          <h3 className="font-semibold text-ink mt-5 mb-1">From applicants</h3>
          <ul className="list-disc pl-5 space-y-1 text-ink-soft">
            <li>Name, email, phone (when you provide it).</li>
            <li>Resume PDF — uploaded by you, stored encrypted in Google Cloud Storage.</li>
            <li>
              Interview audio — captured during the live AI interview, transcribed,
              and discarded within 24 hours. The transcript is retained.
            </li>
            <li>The full interview transcript and your generated Talent Analysis Graph (TAG).</li>
          </ul>
        </Section>

        <Section title="Why we collect it">
          <ul className="list-disc pl-5 space-y-1 text-ink-soft">
            <li>To run the assessment you consented to take.</li>
            <li>To produce a structured evaluation (TAG) for the inviting workspace.</li>
            <li>To support and secure the service.</li>
            <li>To meet legal obligations (e.g., tax records for paid customers).</li>
          </ul>
          <p className="mt-3">
            We do not sell your personal data. We do not use applicant data to train
            third-party models.
          </p>
        </Section>

        <Section title="Where it lives">
          <p>
            All applicant personal data is stored in Google Cloud's{' '}
            <strong>asia-south1 (Mumbai)</strong> region. Audio chunks transit
            through AssemblyAI (United States) for speech-to-text and Cartesia
            (United States) for text-to-speech during the live interview, then are
            discarded. Gemini model calls are routed to Google Cloud's nearest
            available region; prompts and completions are not retained by Google
            beyond logging windows required for abuse detection.
          </p>
        </Section>

        <Section title="How long we keep it">
          <ul className="list-disc pl-5 space-y-1 text-ink-soft">
            <li><strong>Interview audio:</strong> ≤ 24 hours.</li>
            <li><strong>Transcripts and TAG:</strong> retained for the workspace's account lifetime.</li>
            <li><strong>Workspace user accounts:</strong> until you delete the account.</li>
            <li>
              <strong>Applicant accounts:</strong> until you request erasure (see
              "Your rights" below).
            </li>
            <li><strong>Server logs:</strong> 30 days.</li>
          </ul>
        </Section>

        <Section title="Your rights (DPDP §11–13)">
          <p>You have the right to:</p>
          <ul className="list-disc pl-5 space-y-1 text-ink-soft">
            <li>Access a copy of your data.</li>
            <li>Correct inaccurate data.</li>
            <li>Erase your data ("right to be forgotten").</li>
            <li>Withdraw consent for any processing not legally required.</li>
            <li>Nominate a person to exercise your rights on your behalf.</li>
            <li>
              File a grievance with our Data Protection Officer (see "Contact"
              below) and, if unresolved, with the Data Protection Board of India.
            </li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, write to{' '}
            <a className="text-gold-ink underline" href="mailto:privacy@funnelhq.co">
              privacy@funnelhq.co
            </a>
            . We respond within 30 days. If you have a logged-in account, you can
            also delete it from <Link to="/settings" className="text-gold-ink underline">Settings</Link>{' '}
            (workspace) or your applicant portal.
          </p>
        </Section>

        <Section title="Sub-processors">
          <ul className="list-disc pl-5 space-y-1 text-ink-soft">
            <li><strong>Google Cloud Platform</strong> — hosting, Firestore, GCS, Gemini.</li>
            <li><strong>AssemblyAI</strong> — speech-to-text (audio is not retained beyond the call).</li>
            <li><strong>Cartesia</strong> — text-to-speech.</li>
            <li><strong>AWS SES</strong> — transactional email delivery.</li>
            <li><strong>Sentry</strong> — error monitoring (PII-scrubbed).</li>
          </ul>
        </Section>

        <Section title="Security">
          <p>
            We use TLS in transit, GCP-managed encryption at rest, scoped IAM, and
            workspace-tenant isolation enforced server-side. We rotate API keys on
            a regular cadence and run a responsible-disclosure programme — report
            suspected vulnerabilities to{' '}
            <a className="text-gold-ink underline" href="mailto:security@funnelhq.co">
              security@funnelhq.co
            </a>
            .
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            Material changes are notified by email (workspace users) and on this
            page (applicants) at least 14 days before they take effect.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            <strong>Data Protection Officer:</strong>{' '}
            <a className="text-gold-ink underline" href="mailto:privacy@funnelhq.co">
              privacy@funnelhq.co
            </a>
          </p>
          <p>
            <strong>Postal:</strong> Graydot Technologies Private Limited, [registered
            office address — to be filled before launch].
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
