/**
 * Methodology — trust-bearing rubric bento.
 *
 * One worked example per finance domain. The gold rule above the kicker
 * promotes this section over HowItWorks; cards stagger in horizontally on
 * viewport-enter (kicker arrives 100ms before — the "premium moment" budget
 * for this section).
 */
import { motion, useReducedMotion } from "framer-motion";
import { SectionKicker } from "./SectionKicker";

const RUBRICS = [
  {
    domain: "Accounting & controllership",
    skill: "Indirect tax · ITC reconciliation under GST 2B",
    level: "L3",
    anchor: 70,
    evidence: "Scenario · books vs. 2B mismatch",
    body: "Applicant walks through a mid-month reconciliation, identifies blocked credits, and explains the journal entry to fix.",
  },
  {
    domain: "Taxation",
    skill: "Direct tax · 234B/234C interest computation",
    level: "L2",
    anchor: 60,
    evidence: "Numerical drill · 4 quarters",
    body: "Applicant computes advance-tax interest for a given profile, explains the difference between 234B and 234C without reaching for the section number.",
  },
  {
    domain: "Management consulting",
    skill: "Transaction services · synergy modeling",
    level: "L4",
    anchor: 80,
    evidence: "Structured case · 12-min build-up",
    body: "Applicant frames cost and revenue synergies separately, applies a phasing assumption, and pressure-tests a stretch case under cross-examination.",
  },
];

export function Methodology() {
  const reduce = useReducedMotion();
  const wrapper = reduce
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
      };
  const item = reduce
    ? { hidden: { opacity: 1, x: 0 }, visible: { opacity: 1, x: 0 } }
    : {
        hidden: { opacity: 0, x: -10 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
      };

  return (
    <section id="methodology" className="bg-paper-2 border-y border-rule scroll-mt-20">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <div className="mb-12 max-w-2xl">
          <SectionKicker label="Rubric" sigil="§ 02" rule />
          <h2 className="text-2xl md:text-[28px] lg:text-[32px] font-semibold text-ink tracking-[-0.01em] leading-tight mb-3">
            Show your work. Every score has evidence.
          </h2>
          <p className="text-base text-ink-soft leading-relaxed max-w-[65ch]">
            Each role gets ten skills, each skill gets an expected proficiency tier
            and an anchor score. The applicant's score is never a black-box number;
            it traces back to the transcript line that produced it.
          </p>
        </div>
        <motion.div
          className="grid md:grid-cols-3 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={wrapper}
        >
          {RUBRICS.map((r) => (
            <motion.div
              key={r.skill}
              variants={item}
              className="bg-paper border border-rule rounded-lg p-6 shadow-1"
            >
              <p className="font-mono uppercase tracking-[0.18em] text-[10px] text-gold-ink mb-3">
                {r.domain}
              </p>
              <h3 className="text-base font-semibold text-ink tracking-tight mb-4 leading-snug">
                {r.skill}
              </h3>
              <div className="divide-y divide-rule border-y border-rule mb-4">
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-xs text-muted uppercase tracking-wider font-mono">
                    Expected
                  </span>
                  <span className="font-mono text-sm font-semibold text-ink">{r.level}</span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-xs text-muted uppercase tracking-wider font-mono">
                    Anchor
                  </span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-ink">
                    {r.anchor}/100
                  </span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-xs text-muted uppercase tracking-wider font-mono">
                    Evidence
                  </span>
                  <span className="font-mono text-[11px] text-ink-soft text-right max-w-[60%] leading-snug">
                    {r.evidence}
                  </span>
                </div>
              </div>
              <p className="text-xs text-ink-soft leading-relaxed">{r.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
