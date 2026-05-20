/**
 * ClosingCTA — single dark band at page end.
 *
 * The one dark surface on the page; bg-ink with gold mono kicker + gold
 * primary CTA + ghosted secondary methodology link. Inverts the rest of
 * the page's restraint just enough to close decisively.
 */
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionKicker } from "./SectionKicker";

export function ClosingCTA() {
  return (
    <section className="bg-ink text-paper">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-24 text-center">
        <div className="flex justify-center mb-1">
          <SectionKicker label="Ready when you are" tint="paper" />
        </div>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.01em] mb-4 leading-tight">
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
