import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCandidateAuth } from '@/contexts/CandidateAuthContext';
import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const API_BASE = () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';
const CONFIRM_PHRASE = 'DELETE';

export default function CandidateSettings() {
  const { account, logout } = useCandidateAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (confirmText !== CONFIRM_PHRASE) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const token = localStorage.getItem('candidate_auth_token');
      const resp = await fetch(`${API_BASE()}/api/candidate-me/account`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.detail || `Server returned ${resp.status}`);
      }
      toast({
        title: 'Account deleted',
        description: 'Your data has been purged. Signing you out…',
      });
      await logout();
      navigate('/candidate/login', { replace: true });
    } catch (err: any) {
      setDeleteError(err?.message || 'Could not delete your account. Try again or email privacy@funnelhq.co.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-paper-2">
      <header className="bg-paper border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/candidate/dashboard" className="text-sm text-gold-ink hover:underline">
            ← Dashboard
          </Link>
          <h1 className="text-sm font-semibold tracking-wider uppercase">Settings</h1>
          <span />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <Section title="Account">
          <Row label="Email" value={account?.email || '—'} />
          <Row
            label="Sign-in method"
            value={account?.provider === 'google' ? 'Google' : 'Email + password'}
          />
          <Row label="Email verified" value={account?.email_verified ? 'Yes' : 'No'} />
        </Section>

        <Section title="Password">
          <p className="text-sm text-muted mb-3">
            To change your password, request a reset link via the forgot-password
            flow. You'll receive an email with a secure one-time link.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block h-10 px-5 leading-10 border border-rule hover:border-rule-strong bg-paper text-ink font-medium rounded-md text-sm"
          >
            Request password reset
          </Link>
        </Section>

        <Section title="Sign out">
          <p className="text-sm text-muted mb-3">
            Ends your session on this device. Your invitation links from emails
            will still work.
          </p>
          <Button onClick={logout} variant="outline">
            Sign out
          </Button>
        </Section>

        <Section title="Delete your account">
          <p className="text-sm text-muted mb-3">
            Permanently erases your applicant profile, resumes, transcripts, and
            Talent Analysis Graphs across every workspace that's invited you.
            This cannot be undone.
          </p>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            Delete my account
          </Button>
        </Section>
      </main>

      <Dialog open={deleteOpen} onOpenChange={(open) => !deleting && setDeleteOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              We'll remove your applicant profile, resumes, interview transcripts,
              and Talent Analysis Graphs from every workspace that invited you.
              An audit-log entry will record the deletion. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <ErrorBanner tone="danger" title="Couldn't delete your account" description={deleteError} />
          )}

          <div className="space-y-2">
            <p className="text-sm text-ink-soft">
              Type <span className="font-mono font-semibold text-ink">{CONFIRM_PHRASE}</span> to confirm.
            </p>
            <Input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              disabled={deleting}
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || confirmText !== CONFIRM_PHRASE}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete forever'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-paper rounded-xl border border-rule p-5">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-ink mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-rule last:border-b-0">
      <span className="text-xs uppercase tracking-wider text-muted">{label}</span>
      <span className="text-sm text-ink">{value}</span>
    </div>
  );
}
