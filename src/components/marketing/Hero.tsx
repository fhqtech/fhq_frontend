/**
 * Hero — the page's primary attention moment.
 *
 * Polish pass: dropped the word-stagger H1 (AI-marketing tell), replaced with
 * a single calm fade-up of kicker + h1 + body as a unit. The TAG card on the
 * right earns the motion — stat tiles count up and rubric rows divide in
 * sequence on viewport-enter. Once. Then settles.
 */
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/ui/animated-counter";

export function Hero() {
  const reduce = useReducedMotion();
  const initial = reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 };
  return (
    <section className="bg-paper border-b border-rule">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={initial}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mb-5">
            <div aria-hidden className="h-px w-12 bg-gold/40 mb-3" />
            <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
              Finance hiring · India · Big-4 calibrated
            </p>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-[56px] font-semibold tracking-[-0.02em] text-ink leading-[1.05] mb-5">
            Finance hiring, decided on depth.
          </h1>
          <p className="text-lg text-ink-soft leading-relaxed mb-7 max-w-xl">
            FlowDot AI runs structured AI assessments calibrated to tax, audit,
            controllership, FP&amp;A and consulting. You meet only the
            applicants worth your time.
          </p>
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <Button variant="gold" size="lg" asChild>
              <Link to="/start">
                Get started <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="lg" asChild>
              <a href="#methodology">
                Read the methodology <ChevronRight className="ml-1.5 h-4 w-4" />
              </a>
            </Button>
          </div>
          <p className="font-mono text-xs text-muted">
            Big-4 calibrated rubric · scored in{" "}
            <span className="text-ink-soft">asia-south1</span> · DPDP-ready
          </p>
        </motion.div>
        <div className="hidden md:block">
          <TagSampleCard />
        </div>
      </div>
    </section>
  );
}

function TagSampleCard() {
  const reduce = useReducedMotion();
  const rows = [
    { skill: "Indirect tax · ITC reconciliation", score: 78, tone: "text-success" },
    { skill: "Direct tax · 234B/C computation", score: 64, tone: "text-warning" },
    { skill: "Transfer pricing methods", score: 41, tone: "text-danger" },
  ];
  const stats = [
    { count: 4, label: "Strong", tone: "text-success" },
    { count: 4, label: "Developing", tone: "text-warning" },
    { count: 2, label: "Gap", tone: "text-danger" },
  ];
  return (
    <motion.div
      className="relative rounded-lg border border-rule bg-paper-2 shadow-2 p-7"
      initial={reduce ? "visible" : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: 0.4 }}
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
      }}
    >
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="font-mono uppercase tracking-[0.18em] text-[10px] text-gold-ink mb-1.5">
            Sample TAG
          </p>
          <h3 className="text-base font-semibold text-ink tracking-tight">
            Senior tax manager · Priya S.
          </h3>
          <p className="font-mono text-[11px] text-muted mt-1">
            #int_8a2f · evaluated 12 days ago
          </p>
        </div>
        <span className="font-mono text-[10px] text-success-ink bg-success-soft border border-success-soft rounded-sm px-2 py-1 uppercase tracking-wider">
          Shortlist
        </span>
      </div>

      <motion.div
        className="grid grid-cols-3 gap-2 mb-5"
        variants={{
          visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
        }}
      >
        {stats.map((s) => (
          <motion.div
            key={s.label}
            className="rounded-md border border-rule bg-paper px-3 py-3 text-center"
            variants={{
              hidden: { opacity: 0, y: 6 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
            }}
          >
            <div className={`text-2xl font-mono font-semibold tabular-nums leading-none ${s.tone}`}>
              <AnimatedCounter value={s.count} duration={700} />
            </div>
            <div className="text-[10px] text-muted mt-1.5 uppercase tracking-wider">
              {s.label}
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className="divide-y divide-rule border-t border-rule"
        variants={{
          visible: { transition: { staggerChildren: 0.07, delayChildren: 0.4 } },
        }}
      >
        {rows.map((row) => (
          <motion.div
            key={row.skill}
            className="flex items-center justify-between py-2.5"
            variants={{
              hidden: { opacity: 0, x: -6 },
              visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
            }}
          >
            <span className="text-xs text-ink-soft">{row.skill}</span>
            <span className={`font-mono text-sm font-semibold tabular-nums ${row.tone}`}>
              {row.score}
            </span>
          </motion.div>
        ))}
      </motion.div>

      <p className="text-xs text-ink-soft leading-relaxed mt-5 pt-5 border-t border-rule">
        Strong on indirect-tax fundamentals; limited transfer-pricing exposure.
        Recommended for second-round on advisory roles.
      </p>
    </motion.div>
  );
}
