/**
 * FAQ — five questions worth answering.
 *
 * Narrow column (max-w-3xl) so the long-form answers read like editorial,
 * not a settings page. shadcn Accordion in single-collapsible mode.
 */
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { SectionKicker } from "./SectionKicker";

const FAQS = [
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

export function FAQ() {
  return (
    <section id="faq" className="bg-paper-2 border-y border-rule scroll-mt-20">
      <div className="max-w-3xl mx-auto px-6 py-20 md:py-24">
        <div className="mb-10">
          <SectionKicker label="Frequently asked" sigil="§ 06" />
          <h2 className="text-2xl md:text-[28px] lg:text-[32px] font-semibold text-ink tracking-[-0.01em] leading-tight">
            The five questions worth answering.
          </h2>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((item, i) => (
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
