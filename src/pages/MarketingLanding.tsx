/**
 * MarketingLanding — public homepage at flowdot.in.
 *
 * Finance-trust palette: paper/ink/gold + restrained shadows. Geist sans only.
 * Single primary CTA → /start (chooser screen). Sections alternate
 * bg-paper ↔ bg-paper-2 for rhythm without nested cards.
 */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  BarChart3,
  Users,
  ChevronRight,
  FileText,
  GraduationCap,
  Database,
  Lock,
  CircleCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCandidateAuth } from "@/contexts/CandidateAuthContext";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

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

function LogoMark() {
  return (
    <span className="font-mono text-ink text-2xl leading-none tracking-tight select-none">
      f<span className="text-gold-ink">.</span>
    </span>
  );
}

function Topbar() {
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
    <header className="sticky top-0 z-30 bg-paper/90 backdrop-blur-sm border-b border-rule">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <LogoMark />
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

function Hero() {
  const headline = "Finance hiring, decided on depth.";
  const words = headline.split(" ");
  return (
    <section className="bg-paper border-b border-rule">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <motion.p
            className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            Finance hiring · India · Big-4 calibrated
          </motion.p>
          <motion.h1
            className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-ink leading-[1.05] mb-5"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
            }}
          >
            {words.map((w, i) => (
              <motion.span
                key={`${i}-${w}`}
                style={{ display: "inline-block", marginRight: "0.25em" }}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
                }}
              >
                {w}
              </motion.span>
            ))}
          </motion.h1>
          <motion.p
            className="text-lg text-ink-soft leading-relaxed mb-7 max-w-xl"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            FlowDot AI runs structured AI assessments calibrated to tax, audit,
            controllership, FP&amp;A and consulting. You meet only the
            applicants worth your time.
          </motion.p>
          <motion.div
            className="flex flex-wrap items-center gap-3 mb-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
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
          </motion.div>
          <motion.p
            className="font-mono text-xs text-muted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.0 }}
          >
            Big-4 calibrated rubric · scored in <span className="text-ink-soft">asia-south1</span> · DPDP-ready
          </motion.p>
        </div>
        <div className="hidden md:block">
          <TagSampleCard />
        </div>
      </div>
    </section>
  );
}

function TagSampleCard() {
  return (
    <div className="relative rounded-lg border border-rule bg-paper-2 shadow-2 p-7">
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

      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="rounded-md border border-rule bg-paper px-3 py-3 text-center">
          <div className="text-2xl font-mono font-semibold tabular-nums text-success leading-none">
            4
          </div>
          <div className="text-[10px] text-muted mt-1.5 uppercase tracking-wider">Strong</div>
        </div>
        <div className="rounded-md border border-rule bg-paper px-3 py-3 text-center">
          <div className="text-2xl font-mono font-semibold tabular-nums text-warning leading-none">
            4
          </div>
          <div className="text-[10px] text-muted mt-1.5 uppercase tracking-wider">Developing</div>
        </div>
        <div className="rounded-md border border-rule bg-paper px-3 py-3 text-center">
          <div className="text-2xl font-mono font-semibold tabular-nums text-danger leading-none">
            2
          </div>
          <div className="text-[10px] text-muted mt-1.5 uppercase tracking-wider">Gap</div>
        </div>
      </div>

      <div className="divide-y divide-rule border-t border-rule">
        {[
          { skill: "Indirect tax · ITC reconciliation", score: 78, tone: "text-success" },
          { skill: "Direct tax · 234B/C computation", score: 64, tone: "text-warning" },
          { skill: "Transfer pricing methods", score: 41, tone: "text-danger" },
        ].map((row) => (
          <div key={row.skill} className="flex items-center justify-between py-2.5">
            <span className="text-xs text-ink-soft">{row.skill}</span>
            <span className={`font-mono text-sm font-semibold tabular-nums ${row.tone}`}>
              {row.score}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-ink-soft leading-relaxed mt-5 pt-5 border-t border-rule">
        Strong on indirect-tax fundamentals; limited transfer-pricing exposure.
        Recommended for second-round on advisory roles.
      </p>
    </div>
  );
}

function Credentialing() {
  const stats = [
    { num: "3", label: "Finance domains", body: "Accounting · Taxation · Mgmt consulting" },
    { num: "10", label: "Skills per role", body: "Anchored 0–100 scale, L1–L5 proficiency" },
    { num: "20m", label: "Per applicant", body: "Structured AI interview, India time-slots" },
    { num: "asia-south1", label: "Data residency", body: "DPDP-ready by construction" },
  ];
  return (
    <section className="bg-paper-2 border-b border-rule">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <p className="text-center font-mono uppercase tracking-[0.18em] text-[11px] text-muted mb-8">
          Built for finance hiring teams across India
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-rule border-y border-rule">
          {stats.map((s) => (
            <div key={s.label} className="px-6 py-5">
              <div className="font-mono text-2xl font-semibold tabular-nums text-ink">
                {s.num}
              </div>
              <div className="font-mono text-[11px] text-gold-ink uppercase tracking-wider mt-1.5">
                {s.label}
              </div>
              <p className="text-xs text-muted mt-1.5 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Set up the role",
      body: "Pick a finance role — controllership, tax, audit, or consulting. A Big-4 calibrated 10-skill blueprint appears in seconds. Edit, accept, ship.",
      detail: "Blueprint generated by an agent trained on 200+ India CA-firm job descriptions.",
    },
    {
      n: "02",
      title: "Applicants take the assessment",
      body: "A 20-minute structured AI interview probes depth on GST, Ind-AS, transfer pricing, controllership. India time-slot, audio-led, desktop-first.",
      detail: "Applicants get the prep guide up front. No surprise questions.",
    },
    {
      n: "03",
      title: "You read the Talent Analysis Graph",
      body: "A radial skill graph with per-skill evidence, scores, and a clear hireability call. Sort, compare, decide in minutes.",
      detail: "Every score links back to the transcript line that produced it.",
    },
  ];
  return (
    <section id="how-it-works" className="bg-paper">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <div className="mb-12 max-w-2xl">
          <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-3">
            How it works
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight leading-tight">
            Three steps from job-open to shortlist.
          </h2>
        </div>
        <div className="relative">
          <div
            aria-hidden
            className="absolute left-[19px] top-3 bottom-3 w-px bg-rule hidden md:block"
          />
          <ol className="space-y-12">
            {steps.map((s, i) => (
              <motion.li
                key={s.n}
                className="relative grid md:grid-cols-[40px_1fr] gap-6 items-start"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="font-mono text-sm font-semibold tabular-nums text-gold-ink bg-paper border border-rule rounded-sm w-10 h-10 grid place-items-center">
                  {s.n}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-ink tracking-tight mb-2">
                    {s.title}
                  </h3>
                  <p className="text-base text-ink-soft leading-relaxed max-w-[65ch] mb-2">
                    {s.body}
                  </p>
                  <p className="text-xs text-muted font-mono leading-relaxed">
                    {s.detail}
                  </p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Methodology() {
  const rubrics = [
    {
      domain: "Accounting & controllership",
      skill: "Indirect tax · ITC reconciliation under GST 2B",
      level: "L3",
      anchor: 70,
      evidence: "Scenario question · books vs. 2B mismatch",
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
      evidence: "Structured case · 12-minute build-up",
      body: "Applicant frames cost and revenue synergies separately, applies a phasing assumption, and pressure-tests a stretch case under cross-examination.",
    },
  ];
  return (
    <section id="methodology" className="bg-paper-2 border-y border-rule">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <div className="mb-12 max-w-2xl">
          <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-3">
            Rubric
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight leading-tight mb-3">
            Show your work. Every score has evidence.
          </h2>
          <p className="text-base text-ink-soft leading-relaxed max-w-[65ch]">
            Each role gets ten skills, each skill gets an expected proficiency tier
            and an anchor score. The applicant's score is never a black-box number;
            it traces back to the transcript line that produced it.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {rubrics.map((r, i) => (
            <motion.div
              key={r.skill}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
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
        </div>
      </div>
    </section>
  );
}

type Stat = { num: string; counter?: { value: number; suffix?: string }; label: string; body: string };

function OutcomeCard({ stat, index }: { stat: Stat; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="bg-paper border border-rule rounded-lg p-6 shadow-1"
    >
      <div className="border-t-2 border-gold w-8 mb-4" />
      <div className="text-3xl md:text-4xl font-mono font-semibold tabular-nums text-ink tracking-tight leading-none">
        {stat.counter ? (
          <>
            <AnimatedCounter value={stat.counter.value} duration={900} />
            {stat.counter.suffix}
          </>
        ) : (
          stat.num
        )}
      </div>
      <div className="font-mono uppercase tracking-wider text-[10px] text-muted mt-3 mb-2">
        {stat.label}
      </div>
      <p className="text-sm text-ink-soft leading-relaxed">{stat.body}</p>
    </motion.div>
  );
}

function Outcomes() {
  const stats: Stat[] = [
    { num: "8.4×", label: "Faster screening", body: "From résumé inbox to shortlist in days, not weeks." },
    { num: "62%", label: "Less interviewer time", body: "AI handles the depth probe. You decide on the signal." },
    { num: "10", counter: { value: 10 }, label: "Skills scored per role", body: "Big-4 anchors, evidence-linked, every time." },
    { num: "0", counter: { value: 0 }, label: "Résumés to triage", body: "We never make you read another PDF résumé." },
  ];
  return (
    <section id="outcomes" className="bg-paper">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <div className="mb-12 max-w-2xl">
          <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-3">
            Outcomes
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight leading-tight">
            What hiring teams ship with FlowDot AI.
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
          {stats.map((s, i) => (
            <OutcomeCard key={s.label} stat={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ForApplicants() {
  const items = [
    { icon: GraduationCap, label: "Prep guide up front", body: "Every applicant gets the rubric before they start. No surprises." },
    { icon: FileText, label: "Twenty minutes, structured", body: "Audio-led, India time-slots. Pick one that suits you." },
    { icon: BarChart3, label: "Take your TAG home", body: "Your Talent Analysis Graph follows you across every role you apply to." },
  ];
  return (
    <section className="bg-paper-2 border-y border-rule">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-24 grid md:grid-cols-2 gap-12 items-start">
        <div>
          <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-3">
            For applicants
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight leading-tight mb-4">
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
          {items.map((it) => {
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

function SecurityTrust() {
  const items = [
    { icon: ShieldCheck, label: "DPDP-aligned", body: "India Digital Personal Data Protection Act 2023 compliant." },
    { icon: Database, label: "asia-south1", body: "Data residency in Mumbai. Applicant data stays in India." },
    { icon: Lock, label: "Role-based access", body: "Workspace-scoped permissions; full audit trail per action." },
  ];
  return (
    <section className="bg-paper">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <div className="mb-12 max-w-2xl">
          <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-3">
            Security &amp; trust
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight leading-tight">
            Built for the rules you hire under.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((it) => {
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
            <Link to="/privacy" className="text-ink-soft hover:text-ink underline underline-offset-4">
              privacy commitment
            </Link>{" "}
            and{" "}
            <Link to="/terms" className="text-ink-soft hover:text-ink underline underline-offset-4">
              terms
            </Link>
            .
          </span>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    {
      q: "Where does the applicant data live?",
      a: "Firestore in asia-south1 (Mumbai). Audio recordings transit AssemblyAI for transcription and are stored in Google Cloud Storage in the same region. DPDP 2023 compliant by construction; full consent, retention, and right-of-erasure flows are wired into the product.",
    },
    {
      q: "Can I see how a score was assigned?",
      a: "Yes. Every score on the Talent Analysis Graph links back to the exact transcript line that produced it. You can read the evidence, the rubric anchor, and the reviewer agent's rationale per skill.",
    },
    {
      q: "Do you integrate with our existing ATS?",
      a: "We export to CSV today, and a REST API for shortlist push to common ATS systems is on the roadmap. The product is designed as decision support, not pipeline management — most teams keep their ATS and use FlowDot AI alongside it.",
    },
    {
      q: "What does it cost during the pilot?",
      a: "Free for early teams. No credit card to try a Role and see your first TAG. Pricing for general availability is per-shortlisted-applicant, not per-seat.",
    },
    {
      q: "What do applicants take home?",
      a: "Their own TAG, the rubric they were assessed on, and a transcript-linked breakdown of every score. The TAG follows the applicant across any role they apply to on FlowDot AI.",
    },
  ];
  return (
    <section id="faq" className="bg-paper-2 border-y border-rule">
      <div className="max-w-3xl mx-auto px-6 py-20 md:py-24">
        <div className="mb-10">
          <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-3">
            Frequently asked
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight leading-tight">
            The five questions worth answering.
          </h2>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-rule">
              <AccordionTrigger className="text-base font-semibold text-ink text-left hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-ink-soft leading-relaxed">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function ClosingCTA() {
  return (
    <section className="bg-ink text-paper">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-24 text-center">
        <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold mb-4">
          Ready when you are
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4 leading-tight">
          Hire on depth, not buzzwords.
        </h2>
        <p className="text-base text-paper/70 max-w-2xl mx-auto mb-8 leading-relaxed">
          Free for early teams. No credit card to try a Role and see your first TAG.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button variant="gold" size="lg" asChild>
            <Link to="/start">
              Get started <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
          <a
            href="#methodology"
            className="text-sm text-paper/70 hover:text-paper underline underline-offset-4"
          >
            Read the methodology
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-paper-2 border-t border-rule">
      <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-8 text-sm">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5 mb-3">
            <LogoMark />
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
            <span className="font-mono">asia-south1 · India</span>
          </span>
        </div>
      </div>
    </footer>
  );
}

export default function MarketingLanding() {
  return (
    <div className="min-h-[100dvh] bg-paper text-ink antialiased">
      <Topbar />
      <main>
        <Hero />
        <Credentialing />
        <HowItWorks />
        <Methodology />
        <Outcomes />
        <ForApplicants />
        <SecurityTrust />
        <FAQ />
        <ClosingCTA />
      </main>
      <Footer />
    </div>
  );
}
