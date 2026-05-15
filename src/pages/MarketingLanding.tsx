/**
 * MarketingLanding — public homepage.
 *
 * Indian-finance-trust palette: paper/ink/gold + restrained shadows.
 * Single Geist sans family. No serif, no Spline, no Lottie, no electric
 * gradients. Single primary CTA → /start (chooser screen).
 */
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, BarChart3, Users, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCandidateAuth } from "@/contexts/CandidateAuthContext";
import { AnimatedCounter } from "@/components/ui/animated-counter";

function initialsFrom(input?: string): string {
  if (!input) return "··";
  const parts = input.trim().split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 0) return "··";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#outcomes", label: "Outcomes" },
  { href: "#trust", label: "Trust & security" },
];

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
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-ink text-paper grid place-items-center font-semibold text-sm">
            F
          </div>
          <span className="text-ink font-semibold tracking-tight">FunnelHQ</span>
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
              <Link
                to="/start"
                className="text-sm text-ink-soft hover:text-ink hidden sm:inline-block"
              >
                Sign in
              </Link>
              <Button variant="gold" asChild>
                <Link to="/start">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero() {
  // F24.7: word-stagger reveal on H1, then sub + CTAs cascade. transform +
  // opacity only — no layout shift, Lighthouse-safe.
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
            className="text-lg text-ink-soft leading-relaxed mb-8 max-w-xl"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            FunnelHQ runs structured AI assessments calibrated to tax, audit,
            controllership, FP&amp;A and consulting. You meet only the
            applicants worth your time.
          </motion.p>
          <motion.div
            className="flex flex-wrap items-center gap-3"
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
              <a href="#how-it-works">
                See how it works <ChevronRight className="ml-1.5 h-4 w-4" />
              </a>
            </Button>
          </motion.div>
        </div>
        <div className="hidden md:block">
          <div className="relative rounded-lg border border-rule bg-paper-2 shadow-2 p-8 aspect-4/3 flex flex-col justify-between">
            <div>
              <p className="font-mono uppercase tracking-wider text-[10px] text-muted mb-2">
                Sample Talent Analysis Graph
              </p>
              <h3 className="text-xl font-semibold text-ink tracking-tight">
                Senior Tax Manager · Anand K.
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-md border border-rule bg-paper p-3">
                <div className="text-2xl font-mono font-semibold tabular-nums text-success">
                  4
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted mt-1">
                  Strong
                </div>
              </div>
              <div className="rounded-md border border-rule bg-paper p-3">
                <div className="text-2xl font-mono font-semibold tabular-nums text-warning">
                  4
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted mt-1">
                  Developing
                </div>
              </div>
              <div className="rounded-md border border-rule bg-paper p-3">
                <div className="text-2xl font-mono font-semibold tabular-nums text-danger">
                  2
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted mt-1">
                  Gap
                </div>
              </div>
            </div>
            <div className="border-t border-rule pt-4">
              <p className="text-sm text-ink-soft leading-relaxed">
                Strong on direct-tax fundamentals and ITC reconciliation;
                limited transfer-pricing exposure. Recommended for second
                round on advisory roles.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <section id="trust" className="bg-paper-2 border-b border-rule">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <p className="text-center font-mono uppercase tracking-[0.18em] text-[11px] text-muted mb-6">
          Built for finance hiring teams across India
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 opacity-60">
          {["Aurora Capital", "Sterling FP&A", "Praxis Audit", "Vista Tax", "Northwind Advisors", "Helix Consulting"].map(
            (name) => (
              <span
                key={name}
                className="text-sm font-mono text-ink-soft tracking-wide"
              >
                {name}
              </span>
            ),
          )}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Set up the Role",
      body: "Pick a finance role, get a Big-4 calibrated 10-skill blueprint in seconds. Tweak or accept and ship.",
    },
    {
      n: "02",
      title: "Applicants take the Assessment",
      body: "20-minute structured AI interview probing depth on GST, Ind-AS, transfer pricing, controllership.",
    },
    {
      n: "03",
      title: "You read the TAG",
      body: "A radial Talent Analysis Graph with per-skill evidence, scores and a clear hireability call.",
    },
  ];
  return (
    <section id="how-it-works" className="bg-paper">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <div className="text-center mb-12">
          <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-3">
            How it works
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight">
            Three steps from job-open to shortlist.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div
              key={s.n}
              className="rounded-lg border border-rule bg-paper p-7 shadow-1 hover:shadow-2 transition-shadow"
            >
              <div className="text-gold font-mono text-sm tracking-wider mb-3">
                {s.n}
              </div>
              <h3 className="text-xl font-semibold text-ink tracking-tight mb-2">
                {s.title}
              </h3>
              <p className="text-sm text-ink-soft leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// F24.7: stats are mixed format ("8.4×" / "62%" / "10"). For the integer
// one, use AnimatedCounter on whileInView so it counts when scrolled into
// view — only fires once per session per stat.
type Stat = { num: string; counter?: { value: number; suffix?: string }; label: string; body: string };

function OutcomeCard({ stat, index }: { stat: Stat; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-lg border border-rule bg-paper p-7 shadow-1"
    >
      <div className="border-t-2 border-gold w-10 mb-4" />
      <div className="text-4xl font-mono font-semibold tabular-nums text-ink tracking-tight">
        {stat.counter ? (
          <>
            <AnimatedCounter value={stat.counter.value} duration={900} />
            {stat.counter.suffix}
          </>
        ) : (
          stat.num
        )}
      </div>
      <div className="font-mono uppercase tracking-wider text-[11px] text-muted mt-2 mb-3">
        {stat.label}
      </div>
      <p className="text-sm text-ink-soft leading-relaxed">{stat.body}</p>
    </motion.div>
  );
}

function Outcomes() {
  const stats: Stat[] = [
    { num: "8.4×", label: "Faster screening", body: "From résumé inbox to shortlist in days, not weeks." },
    { num: "62%", label: "Less interviewer time", body: "AI handles the depth probe; you decide on the signal." },
    { num: "10", counter: { value: 10 }, label: "Skills per role", body: "Big-4 calibrated rubric with 0-100 anchors per skill." },
  ];
  return (
    <section id="outcomes" className="bg-paper-2 border-y border-rule">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <div className="text-center mb-12">
          <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-3">
            Outcomes
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight">
            What hiring teams ship with FunnelHQ.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {stats.map((s, i) => (
            <OutcomeCard key={s.label} stat={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SecurityTrust() {
  const items = [
    { icon: ShieldCheck, label: "DPDP-aligned", body: "India Digital Personal Data Protection Act 2023 compliant." },
    { icon: BarChart3, label: "asia-south1", body: "Data residency in Mumbai. Your applicant data stays in India." },
    { icon: Users, label: "Role-based access", body: "Workspace-scoped permissions; full audit trail per action." },
  ];
  return (
    <section className="bg-paper">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <div className="text-center mb-12">
          <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-3">
            Security &amp; trust
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight">
            Built for the rules you hire under.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((it) => {
            const I = it.icon;
            return (
              <div
                key={it.label}
                className="rounded-lg border border-rule bg-paper p-7 shadow-1"
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
      </div>
    </section>
  );
}

function ClosingCTA() {
  return (
    <section className="bg-ink text-paper">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">
          Ready to hire on depth, not buzzwords?
        </h2>
        <p className="text-base text-paper/70 max-w-2xl mx-auto mb-8 leading-relaxed">
          Free for early teams. No credit card to try a Role and see your first TAG.
        </p>
        <Button variant="gold" size="lg" asChild>
          <Link to="/start">
            Get started <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-paper-2 border-t border-rule">
      <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-8 text-sm">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-md bg-ink text-paper grid place-items-center font-semibold text-xs">
              F
            </div>
            <span className="text-ink font-semibold tracking-tight">FunnelHQ</span>
          </div>
          <p className="text-muted leading-relaxed">
            AI-led candidate assessments built for India finance hiring.
          </p>
        </div>
        <div>
          <h4 className="font-mono uppercase tracking-wider text-[11px] text-muted mb-3">
            Product
          </h4>
          <ul className="space-y-2 text-ink-soft">
            <li><a href="#how-it-works" className="hover:text-ink">How it works</a></li>
            <li><a href="#outcomes" className="hover:text-ink">Outcomes</a></li>
            <li><a href="#trust" className="hover:text-ink">Trust &amp; security</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-mono uppercase tracking-wider text-[11px] text-muted mb-3">
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
          <span>© {new Date().getFullYear()} FunnelHQ. All rights reserved.</span>
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
    <div className="min-h-dvh bg-paper text-ink antialiased">
      <Topbar />
      <main>
        <Hero />
        <TrustStrip />
        <HowItWorks />
        <Outcomes />
        <SecurityTrust />
        <ClosingCTA />
      </main>
      <Footer />
    </div>
  );
}
