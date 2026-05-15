import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCandidateAuth } from '@/contexts/CandidateAuthContext';

export default function ForgotPassword() {
  const { forgotPassword } = useCandidateAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await forgotPassword(email);
    } finally {
      setSubmitting(false);
      setDone(true);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-paper-2 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-primary tracking-tight">FunnelHQ</h1>
          <p className="text-sm text-muted mt-1">Reset your password</p>
        </div>

        <div className="bg-paper rounded-xl shadow-1 border border-border p-6">
          {done ? (
            <div className="text-sm text-muted">
              <p className="mb-3">
                If an account exists for that email, we've sent a reset link.
                Check your inbox (and spam folder).
              </p>
              <Link to="/candidate/login" className="text-primary underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <p className="text-sm text-muted">
                Enter the email you used during interview registration. We'll
                email you a link to set a new password.
              </p>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-md border border-border bg-paper text-sm focus:outline-none focus:border-accent"
                  placeholder="you@email.com"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-10 bg-primary hover:bg-primary/90 disabled:opacity-50 text-paper font-medium rounded-md text-sm"
              >
                {submitting ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
