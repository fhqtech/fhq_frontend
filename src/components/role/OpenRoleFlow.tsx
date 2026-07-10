/**
 * P2-2 — open a role. The single "create" entry that replaces choosing between
 * the four builders: name the role, paste the JD, and the role is created with a
 * default screen stage, landing on its pipeline board. Reuses the existing
 * Programs engine via recruiterJourneysApi.createRoleWithTemplate.
 */
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { recruiterJourneysApi } from "@/services/recruiterJourneysApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorBanner } from "@/components/ui/error-banner";
import { RoleCuratorModal } from "@/components/role-curator/RoleCuratorModal";
import { Loader2, Sparkles } from "lucide-react";

export function OpenRoleFlow() {
  const navigate = useNavigate();
  const { currentWorkspace, currentProject } = useWorkspace();
  const [title, setTitle] = useState("");
  const [jd, setJd] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCurator, setShowCurator] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !currentWorkspace?.id) return;
    setCreating(true);
    setError(null);
    try {
      const roleId = await recruiterJourneysApi.createRoleWithTemplate(currentWorkspace.id, {
        title: title.trim(),
        jdText: jd.trim() || undefined,
        projectId: currentProject?.id,
      });
      navigate(`/roles/${roleId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the role");
      setCreating(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6 px-6 py-8">
      <header>
        <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">Open a role</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">What are you hiring for?</h1>
        <p className="mt-2 max-w-[65ch] text-base text-ink-soft">
          Name the role and paste the description. We start it with a screening stage; add fitment,
          practical, or decision stages whenever you need them.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => setShowCurator(true)}
        >
          <Sparkles className="mr-2 h-4 w-4 text-gold-ink" />
          Draft with AI
        </Button>
      </header>

      {error && <ErrorBanner tone="danger" title="Couldn't open the role" description={error} />}

      <div className="space-y-1.5">
        <Label htmlFor="role-title">Role title</Label>
        <Input
          id="role-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Senior tax associate"
          autoComplete="off"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="role-jd">Job description</Label>
        <Textarea
          id="role-jd"
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder="What this role does, and the finance skills it needs."
          rows={6}
        />
      </div>

      <Button type="submit" variant="gold" disabled={!title.trim() || creating}>
        {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Open role
      </Button>

      <RoleCuratorModal
        isOpen={showCurator}
        onClose={() => setShowCurator(false)}
        onAccept={(proposal) => {
          if (proposal.title) setTitle(proposal.title);
          if (proposal.description) setJd(proposal.description);
          setShowCurator(false);
        }}
      />
    </form>
  );
}

export default OpenRoleFlow;
