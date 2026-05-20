/**
 * ForApplicants — addresses the secondary audience (applicants).
 *
 * Most hiring platforms forget applicants exist. This section gives them
 * three commitments: prep guide, structured time-box, portable TAG. Layout
 * is the two-column zig-zag (copy left, list right) called out as preferred
 * in CLAUDE.md.
 */
import { Link } from "react-router-dom";
import { ChevronRight, GraduationCap, FileText, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionKicker } from "./SectionKicker";

const ITEMS = [
  {
    icon: GraduationCap,
    label: "Prep guide up front",
    body: "Every applicant gets the rubric before they start. No surprises.",
  },
  {
    icon: FileText,
    label: "Twenty minutes, structured",
    body: "Audio-led, India time-slots. Pick one that suits you.",
  },
  {
    icon: BarChart3,
    label: "Take your TAG home",
    body: "Your Talent Analysis Graph follows you across every role you apply to.",
  },
];

export function ForApplicants() {
  return (
    <section className="bg-paper-2 border-y border-rule">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-24 grid md:grid-cols-2 gap-12 items-start">
        <div>
          <SectionKicker label="For applicants" sigil="§ 04" />
          <h2 className="text-2xl md:text-[28px] lg:text-[32px] font-semibold text-ink tracking-[-0.01em] leading-tight mb-4">
            Your assessment, your prep guide, your TAG.
          </h2>
          <p className="text-base text-ink-soft leading-relaxed max-w-[55ch] mb-6">
            AI scoring is anxious work for applicants. We tell you what's being
            evaluated, why, and how. You see the same rubric the hiring manager sees.
          </p>
          <Button variant="ghost" asChild>
            <Link to="/start">
              I'm an applicant <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <ul className="divide-y divide-rule border-y border-rule">
          {ITEMS.map((it) => {
            const I = it.icon;
            return (
              <li key={it.label} className="flex items-start gap-4 py-5">
                <I className="w-5 h-5 text-gold-ink mt-0.5 shrink-0" aria-hidden />
                <div>
                  <h3 className="text-sm font-semibold text-ink mb-1">{it.label}</h3>
                  <p className="text-sm text-ink-soft leading-relaxed">{it.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
