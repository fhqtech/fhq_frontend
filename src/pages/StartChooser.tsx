/**
 * StartChooser — first-touch persona pick.
 *
 * Lands here from any "Get started" CTA. Stamps the user's intent into
 * sessionStorage + a short-lived cookie so the backend Google callbacks
 * can refuse to mint the wrong account type (e.g. an applicant who
 * accidentally hits workspace SSO).
 */
import { Link } from "react-router-dom";
import { ArrowRight, Briefcase, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo-mark";

const setIntent = (intent: "workspace" | "applicant") => {
  try {
    sessionStorage.setItem("fh_auth_intent", intent);
  } catch {
    /* storage may be blocked — cookie still carries the signal */
  }
  // 10-minute cookie. Backend Google callback reads this to gate which
  // account type can be created on the OAuth round-trip.
  document.cookie = `fh_intent=${intent}; Path=/; SameSite=Lax; Max-Age=600`;
};

export default function StartChooser() {
  return (
    <div className="min-h-dvh bg-paper-2 text-ink antialiased">
      {/* Topbar */}
      <header className="bg-paper border-b border-rule">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" aria-label="FlowDot AI home">
            <LogoMark size="md" withWordmark />
          </Link>
          <Link
            to="/product-landing"
            className="text-sm text-ink-soft hover:text-ink"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Chooser */}
      <main className="max-w-4xl mx-auto px-6 py-20 md:py-24">
        <div className="text-center mb-12">
          <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-3">
            Choose your path
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-ink mb-3">
            How will you use FlowDot AI?
          </h1>
          <div className="mx-auto w-16 h-[2px] bg-gold" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Workspace card */}
          <Link
            to="/product-landing?intent=workspace"
            onClick={() => setIntent("workspace")}
            className="group rounded-lg border border-rule bg-paper p-8 shadow-1 hover:shadow-2 hover:border-gold transition-all"
          >
            <div className="w-12 h-12 rounded-md bg-gold-soft text-gold-ink grid place-items-center mb-5">
              <Briefcase className="w-6 h-6" />
            </div>
            <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-muted mb-2">
              Workspace
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-ink mb-3">
              Start a Workspace
            </h2>
            <p className="text-sm text-ink-soft leading-relaxed mb-6">
              Set up Roles, invite applicants, and screen at scale with a
              Big-4 calibrated rubric.
            </p>
            <Button
              variant="gold"
              className="w-full justify-center group-hover:translate-x-0.5 transition-transform"
            >
              Continue <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>

          {/* Applicant card */}
          <Link
            to="/candidate/login"
            onClick={() => setIntent("applicant")}
            className="group rounded-lg border border-rule bg-paper p-8 shadow-1 hover:shadow-2 hover:border-ink transition-all"
          >
            <div className="w-12 h-12 rounded-md bg-paper-3 text-ink grid place-items-center mb-5">
              <UserCircle2 className="w-6 h-6" />
            </div>
            <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-muted mb-2">
              Applicant
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-ink mb-3">
              Applicant Sign-in
            </h2>
            <p className="text-sm text-ink-soft leading-relaxed mb-6">
              Take an Assessment, see your TAG report, and track your progress
              across Roles you've applied for.
            </p>
            <Button
              variant="outline"
              className="w-full justify-center group-hover:translate-x-0.5 transition-transform"
            >
              Continue <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Sub links */}
        <div className="mt-10 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link to="/product-landing" className="text-ink hover:underline">
            Workspace sign in
          </Link>
          {"  ·  "}
          <Link to="/candidate/login" className="text-ink hover:underline">
            Applicant sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
