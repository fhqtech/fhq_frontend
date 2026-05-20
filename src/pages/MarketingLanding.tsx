/**
 * MarketingLanding — public homepage at flowdot.in.
 *
 * Thin composition shell. Each section lives in src/components/marketing/.
 * Finance-trust palette: paper/ink/gold + restrained shadows. Geist sans only.
 * Single primary CTA → /start (chooser screen).
 */
import { Topbar } from "@/components/marketing/Topbar";
import { Hero } from "@/components/marketing/Hero";
import { Credentialing } from "@/components/marketing/Credentialing";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Methodology } from "@/components/marketing/Methodology";
import { Outcomes } from "@/components/marketing/Outcomes";
import { ForApplicants } from "@/components/marketing/ForApplicants";
import { SecurityTrust } from "@/components/marketing/SecurityTrust";
import { FAQ } from "@/components/marketing/FAQ";
import { ClosingCTA } from "@/components/marketing/ClosingCTA";
import { Footer } from "@/components/marketing/Footer";

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
