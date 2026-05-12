import { Link } from 'react-router-dom';
import { useCandidateAuth } from '@/contexts/CandidateAuthContext';

export default function CandidateSettings() {
  const { account, logout } = useCandidateAuth();

  return (
    <div className="min-h-screen bg-funnel-cream">
      <header className="bg-white border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/candidate/dashboard" className="text-sm text-primary hover:underline">
            ← Dashboard
          </Link>
          <h1 className="text-sm font-semibold tracking-wider uppercase">Settings</h1>
          <span />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <Section title="Account">
          <Row label="Email" value={account?.email || '—'} />
          <Row label="Sign-in method" value={account?.provider === 'google' ? 'Google' : 'Email + password'} />
          <Row label="Email verified" value={account?.email_verified ? 'Yes' : 'No'} />
        </Section>

        <Section title="Password">
          <p className="text-sm text-foreground-muted mb-3">
            To change your password, request a reset link via the forgot-password
            flow. You'll receive an email with a secure one-time link.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block h-10 px-5 leading-10 border border-border hover:border-accent bg-white text-foreground font-medium rounded-md text-sm"
          >
            Request password reset
          </Link>
        </Section>

        <Section title="Sign out">
          <p className="text-sm text-foreground-muted mb-3">
            Ends your session on this device. Your invitation links from emails
            will still work.
          </p>
          <button
            onClick={logout}
            className="h-10 px-5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md text-sm"
          >
            Sign out
          </button>
        </Section>

        <Section title="Data & privacy">
          <p className="text-sm text-foreground-muted">
            Want a copy of your data, or to delete your account? Email us at{' '}
            <a href="mailto:privacy@funnelhq.co" className="text-primary underline">
              privacy@funnelhq.co
            </a>{' '}
            and we'll handle it within 7 business days.
          </p>
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-foreground mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
      <span className="text-xs uppercase tracking-wider text-foreground-muted">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}
