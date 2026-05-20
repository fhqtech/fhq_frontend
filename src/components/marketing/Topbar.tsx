/**
 * Topbar — sticky marketing nav.
 *
 * Hides under content with subtle backdrop blur on scroll. Single accent
 * (gold CTA). Account chip appears when either workspace or applicant auth
 * is present; otherwise sign in + Get started.
 */
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCandidateAuth } from "@/contexts/CandidateAuthContext";
import { LogoMark } from "@/components/ui/logo-mark";

function initialsFrom(input?: string): string {
  if (!input) return "··";
  const parts = input.trim().split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 0) return "··";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#methodology", label: "Methodology" },
  { href: "#outcomes", label: "Outcomes" },
  { href: "#faq", label: "FAQ" },
];

export function Topbar() {
  const { isAuthenticated: workspaceAuth, user } = useAuth();
  const { isAuthenticated: applicantAuth, account } = useCandidateAuth();

  let signedIn: { label: string; href: string; initials: string } | null = null;
  if (workspaceAuth && user) {
    signedIn = {
      label: "Go to dashboard",
      href: "/dashboard",
      initials: initialsFrom(user.name || user.email),
    };
  } else if (applicantAuth && account) {
    signedIn = {
      label: "Go to your portal",
      href: "/candidate/dashboard",
      initials: initialsFrom(account.name || account.email),
    };
  }

  return (
    <header className="sticky top-0 z-30 bg-paper/85 backdrop-blur-md border-b border-rule">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <LogoMark size="md" />
          <span className="text-ink font-semibold tracking-tight">FlowDot AI</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-ink-soft">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-ink transition-colors">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {signedIn ? (
            <>
              <Button variant="gold" asChild>
                <Link to={signedIn.href}>{signedIn.label}</Link>
              </Button>
              <Link
                to={signedIn.href}
                aria-label="Account"
                className="w-9 h-9 rounded-full bg-paper-3 border border-rule grid place-items-center text-ink-soft hover:text-ink font-mono text-xs font-semibold"
              >
                {signedIn.initials}
              </Link>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link to="/product-landing">Sign in</Link>
              </Button>
              <Button variant="gold" asChild>
                <Link to="/start">
                  Get started <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
