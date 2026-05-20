/**
 * SecurityTrust — DPDP + region + access + made-in-India.
 *
 * Four-card grid; gold icon plate keeps the gold ratio honest (small,
 * isolated). The privacy-commitment link below the grid keeps DPDP
 * one click away.
 */
import { Link } from "react-router-dom";
import { ShieldCheck, Database, Lock, CircleCheck } from "lucide-react";
import { IndiaFlagGlyph } from "@/components/brand/MadeInIndiaMark";
import { SectionKicker } from "./SectionKicker";

const ITEMS = [
  {
    icon: ShieldCheck,
    label: "DPDP-aligned",
    body: "India Digital Personal Data Protection Act 2023 compliant.",
  },
  {
    icon: Database,
    label: "asia-south1",
    body: "Data residency in Mumbai. Applicant data stays in India.",
  },
  {
    icon: Lock,
    label: "Role-based access",
    body: "Workspace-scoped permissions; full audit trail per action.",
  },
  {
    icon: IndiaFlagGlyph,
    label: "Built in India",
    body: "By a team based in India for India's finance hiring market.",
  },
];

export function SecurityTrust() {
  return (
    <section className="bg-paper">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <div className="mb-12 max-w-2xl">
          <SectionKicker label="Security & trust" sigil="§ 05" />
          <h2 className="text-2xl md:text-[28px] lg:text-[32px] font-semibold text-ink tracking-[-0.01em] leading-tight">
            Built for the rules you hire under.
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {ITEMS.map((it) => {
            const I = it.icon;
            return (
              <div
                key={it.label}
                className="bg-paper border border-rule rounded-lg p-7 shadow-1"
              >
                <div className="w-10 h-10 rounded-md bg-gold-soft text-gold-ink grid place-items-center mb-4">
                  <I className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-ink tracking-tight mb-2">
                  {it.label}
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">{it.body}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-xs text-muted">
          <CircleCheck className="w-4 h-4 text-gold-ink" aria-hidden />
          <span>
            Read the full{" "}
            <Link
              to="/privacy"
              className="text-ink-soft hover:text-ink underline underline-offset-4"
            >
              privacy commitment
            </Link>{" "}
            and{" "}
            <Link
              to="/terms"
              className="text-ink-soft hover:text-ink underline underline-offset-4"
            >
              terms
            </Link>
            .
          </span>
        </div>
      </div>
    </section>
  );
}
