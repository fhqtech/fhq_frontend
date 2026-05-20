/**
 * Outcomes — numbers section, promoted.
 *
 * Polish pass: numbers grow from text-3xl md:text-4xl to text-5xl md:text-6xl
 * — they're the trust signal in finance, they earn the size. AnimatedCounter
 * is now viewport-triggered (mounts when the tile enters view), not on page
 * load, so the count is earned rather than front-loaded.
 */
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { SectionKicker } from "./SectionKicker";

type Stat = {
  num: string;
  counter?: { value: number; suffix?: string };
  label: string;
  body: string;
};

const STATS: Stat[] = [
  { num: "8.4×", label: "Faster screening", body: "Résumé inbox to shortlist in days, not weeks." },
  { num: "62%", label: "Less interviewer time", body: "AI handles the depth probe. You decide on signal." },
  { num: "10", counter: { value: 10 }, label: "Skills scored per role", body: "Big-4 anchors, evidence-linked, every time." },
  { num: "0", counter: { value: 0 }, label: "Résumés to triage", body: "We never make you read another PDF résumé." },
];

function OutcomeCard({ stat, index }: { stat: Stat; index: number }) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);
  return (
    <motion.div
      initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      onViewportEnter={() => setVisible(true)}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="bg-paper border border-rule rounded-lg p-6 shadow-1"
    >
      <div className="border-t-2 border-gold w-8 mb-5" />
      <div className="text-5xl md:text-6xl font-mono font-semibold tabular-nums text-ink tracking-[-0.02em] leading-none">
        {stat.counter ? (
          visible ? (
            <>
              <AnimatedCounter value={stat.counter.value} duration={900} />
              {stat.counter.suffix}
            </>
          ) : (
            <span className="opacity-0">{stat.num}</span>
          )
        ) : (
          stat.num
        )}
      </div>
      <div className="font-mono uppercase tracking-wider text-[10px] text-muted mt-4 mb-2">
        {stat.label}
      </div>
      <p className="text-sm text-ink-soft leading-relaxed">{stat.body}</p>
    </motion.div>
  );
}

export function Outcomes() {
  return (
    <section id="outcomes" className="bg-paper scroll-mt-20">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <div className="mb-12 max-w-2xl">
          <SectionKicker label="Outcomes" sigil="§ 03" rule />
          <h2 className="text-2xl md:text-[28px] lg:text-[32px] font-semibold text-ink tracking-[-0.01em] leading-tight">
            What hiring teams ship with FlowDot AI.
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
          {STATS.map((s, i) => (
            <OutcomeCard key={s.label} stat={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
