/**
 * Footer — three-column layout + legal strip.
 *
 * Brand display stays "FlowDot AI" (per-product naming); legal entity in the
 * copyright line is "Graydot Technologies Private Limited" (per FunnelHQ
 * rebrand session). Contact email stays at hello@funnelhq.co until the
 * rebrand-email DNS resolves.
 */
import { Link } from "react-router-dom";
import { MadeInIndiaMark } from "@/components/brand/MadeInIndiaMark";
import { LogoMark } from "@/components/ui/logo-mark";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-paper-2 border-t border-rule">
      <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-8 text-sm">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5 mb-3">
            <LogoMark size="md" />
            <span className="text-ink font-semibold tracking-tight">FlowDot AI</span>
          </div>
          <p className="text-muted leading-relaxed max-w-sm">
            AI-led candidate assessments built for India finance hiring. Three
            domains, ten skills per role, every score evidence-linked.
          </p>
        </div>
        <div>
          <h4 className="font-mono uppercase tracking-[0.18em] text-[11px] text-muted mb-3">
            Product
          </h4>
          <ul className="space-y-2 text-ink-soft">
            <li><a href="#how-it-works" className="hover:text-ink">How it works</a></li>
            <li><a href="#methodology" className="hover:text-ink">Methodology</a></li>
            <li><a href="#outcomes" className="hover:text-ink">Outcomes</a></li>
            <li><a href="#faq" className="hover:text-ink">FAQ</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-mono uppercase tracking-[0.18em] text-[11px] text-muted mb-3">
            Company
          </h4>
          <ul className="space-y-2 text-ink-soft">
            <li><Link to="/start" className="hover:text-ink">Get started</Link></li>
            <li><a href="mailto:hello@funnelhq.co" className="hover:text-ink">hello@funnelhq.co</a></li>
            <li><Link to="/privacy" className="hover:text-ink">Privacy</Link></li>
            <li><Link to="/terms" className="hover:text-ink">Terms</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-rule">
        <div className="max-w-6xl mx-auto px-6 py-5 text-xs text-muted flex flex-wrap items-center justify-between gap-3">
          <span>© {year} Graydot Technologies Private Limited. All rights reserved.</span>
          <span className="flex flex-wrap items-center gap-4">
            <Link to="/privacy" className="hover:text-ink">Privacy</Link>
            <Link to="/terms" className="hover:text-ink">Terms</Link>
            <MadeInIndiaMark size="sm" />
            <span className="font-mono">asia-south1</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
