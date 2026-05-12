import { X } from 'lucide-react';

const problems = [
  "Tax, audit, and FP&A CVs read identically — generalist screeners can't tell depth from buzzwords",
  "Finance hiring managers wasted 8+ hours/week on first-round screens",
  "Candidates rejected on résumé keyword matches, not on actual rubric depth",
  "No structured signal on GST, Ind-AS, transfer pricing, or controllership rigor",
  "Big-4 alums and tier-2 colleges evaluated on the same generic questions",
  "Strong candidates drop off because the first conversation feels generic",
];

export function ProblemSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-black">
      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-24">
        {/* Headline */}
        <h2 className="text-4xl md:text-6xl font-light text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 tracking-tighter mb-16 text-center">
          Finance hiring breaks at the first conversation.
        </h2>

        {/* Problem List - Left Aligned */}
        <div className="space-y-4 max-w-2xl mx-auto">
          {problems.map((problem, index) => (
            <div
              key={index}
              className="flex items-center gap-4"
            >
              <X className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-lg md:text-xl text-white/70 font-light">
                {problem}
              </p>
            </div>
          ))}
        </div>

        {/* Closing */}
        <div className="mt-16 text-center">
          <p className="text-xl md:text-2xl text-white/50 font-light">
            The result? <span className="text-red-400">Lost talent, wasted time, and rising recruitment costs.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
