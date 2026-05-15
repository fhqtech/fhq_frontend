import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCandidateAuth } from '@/contexts/CandidateAuthContext';

const API_BASE = () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

interface ProfileDoc {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  location?: string;
  jobTitle?: string;
  experience?: string;
  availableIn?: string;
  linkedin?: string;
  portfolioUrl?: string;
  psychAssessment?: { animal?: string; color?: string; symbol?: string; environment?: string };
}

const PSYCH_FIELDS: Array<{ key: keyof NonNullable<ProfileDoc['psychAssessment']>; label: string; options: string[] }> = [
  { key: 'animal', label: 'Animal that represents you', options: ['Eagle', 'Lion', 'Dolphin', 'Owl'] },
  { key: 'color', label: 'Color you identify with', options: ['Red', 'Blue', 'Green', 'Yellow', 'Black', 'White'] },
  { key: 'symbol', label: 'Symbol you connect with', options: ['Mountain', 'Ocean', 'Tree', 'Fire', 'Star'] },
  { key: 'environment', label: 'Environment you thrive in', options: ['Quiet office', 'Open team', 'Remote', 'On-site client'] },
];

export default function CandidateProfile() {
  const { account } = useCandidateAuth();
  const [profile, setProfile] = useState<ProfileDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('candidate_auth_token');
    if (!token) return;
    (async () => {
      try {
        const resp = await fetch(`${API_BASE()}/api/candidate-me/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) throw new Error(`Failed to load (${resp.status})`);
        const json = await resp.json();
        setProfile(json.primary_profile || (json.profiles?.[0] ?? null));
      } catch (err: any) {
        setError(err?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('candidate_auth_token');
      const payload = {
        name: profile.name,
        phone: profile.phone,
        location: profile.location,
        jobTitle: profile.jobTitle,
        experience: profile.experience,
        availableIn: profile.availableIn,
        linkedin: profile.linkedin,
        portfolioUrl: profile.portfolioUrl,
        psychAssessment: profile.psychAssessment,
      };
      const resp = await fetch(`${API_BASE()}/api/candidate-me/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(`Save failed (${resp.status})`);
      setSavedAt(Date.now());
    } catch (err: any) {
      setError(err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-paper-2 flex items-center justify-center text-muted">
        Loading your profile…
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="min-h-dvh bg-paper-2 flex items-center justify-center px-4">
        <div className="max-w-md bg-paper border border-border rounded-xl p-6 text-center">
          <h2 className="font-semibold mb-2">No profile yet</h2>
          <p className="text-sm text-muted">
            Accept an interview invitation to create your profile.
          </p>
        </div>
      </div>
    );
  }

  const update = <K extends keyof ProfileDoc>(key: K, value: ProfileDoc[K]) => {
    setProfile({ ...profile, [key]: value });
  };
  const updatePsych = <K extends keyof NonNullable<ProfileDoc['psychAssessment']>>(
    key: K,
    value: string
  ) => {
    setProfile({
      ...profile,
      psychAssessment: { ...(profile.psychAssessment || {}), [key]: value },
    });
  };

  return (
    <div className="min-h-dvh bg-paper-2">
      <header className="bg-paper border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/candidate/dashboard" className="text-sm text-primary hover:underline">
            ← Dashboard
          </Link>
          <h1 className="text-sm font-semibold">Profile</h1>
          <span />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <Section title="Account">
          <Field label="Email" value={account?.email || profile.email} readOnly />
          <Input label="Display name" value={profile.name || ''} onChange={(v) => update('name', v)} />
        </Section>

        <Section title="Contact">
          <Input label="Phone" value={profile.phone || ''} onChange={(v) => update('phone', v)} />
          <Input label="Location" value={profile.location || ''} onChange={(v) => update('location', v)} />
        </Section>

        <Section title="Professional">
          <Input label="Job title" value={profile.jobTitle || ''} onChange={(v) => update('jobTitle', v)} />
          <Input label="Experience" value={profile.experience || ''} onChange={(v) => update('experience', v)} placeholder="e.g. 4 years" />
          <Input
            label="Available in"
            value={profile.availableIn || ''}
            onChange={(v) => update('availableIn', v)}
            placeholder="Immediate / 2 weeks / 1 month"
          />
        </Section>

        <Section title="Links">
          <Input
            label="LinkedIn URL"
            value={profile.linkedin || ''}
            onChange={(v) => update('linkedin', v)}
            placeholder="https://linkedin.com/in/…"
          />
          <Input
            label="Portfolio URL"
            value={profile.portfolioUrl || ''}
            onChange={(v) => update('portfolioUrl', v)}
            placeholder="https://…"
          />
        </Section>

        <Section title="Self-assessment">
          {PSYCH_FIELDS.map((f) => (
            <div key={f.key as string} className="mb-3">
              <label className="block text-xs font-medium text-muted mb-1">
                {f.label}
              </label>
              <select
                value={profile.psychAssessment?.[f.key] || ''}
                onChange={(e) => updatePsych(f.key, e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-paper text-sm focus:outline-hidden focus:border-accent"
              >
                <option value="">— Pick one —</option>
                {f.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </Section>

        {error && (
          <div className="text-sm text-danger bg-danger-soft border border-rule rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="h-10 px-6 bg-primary hover:bg-primary/90 disabled:opacity-50 text-paper font-medium rounded-md text-sm"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {savedAt && Date.now() - savedAt < 5000 && (
            <span className="text-xs text-success">Saved</span>
          )}
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-paper rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, value, readOnly = false }: { label: string; value?: string; readOnly?: boolean }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-muted mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value || ''}
        readOnly={readOnly}
        className="w-full h-10 px-3 rounded-md border border-border bg-paper-2 text-muted text-sm cursor-not-allowed"
      />
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-muted mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 px-3 rounded-md border border-border bg-paper text-sm focus:outline-hidden focus:border-accent"
      />
    </div>
  );
}
