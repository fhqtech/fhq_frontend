/**
 * Credentialing — trust strip below the hero.
 *
 * Replaces the fictional-customer-logo pattern with four sober credentials:
 * three count metrics + one residency cell. Hairline divider isolates
 * asia-south1 from the count metrics (different unit shape, deserves its own
 * column rhythm).
 */
export function Credentialing() {
  const counts = [
    { num: "3", label: "Finance domains", body: "Accounting · Taxation · Mgmt consulting" },
    { num: "10", label: "Skills per role", body: "Anchored 0–100 scale, L1–L5 proficiency" },
    { num: "20m", label: "Per applicant", body: "Structured AI interview, India time-slots" },
  ];
  const residency = {
    num: "asia-south1",
    label: "Data residency",
    body: "DPDP-ready by construction",
  };
  return (
    <section className="bg-paper-2 border-b border-rule">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <p className="text-center font-mono uppercase tracking-[0.18em] text-[11px] text-muted mb-8">
          Built for finance hiring teams across India
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 border-y border-rule">
          {counts.map((s, i) => (
            <div
              key={s.label}
              className={
                "px-6 py-5 border-rule " +
                (i > 0 ? "md:border-l " : "") +
                (i > 0 ? "border-l " : "")
              }
            >
              <div className="font-mono text-2xl font-semibold tabular-nums text-ink">
                {s.num}
              </div>
              <div className="font-mono text-[11px] text-gold-ink uppercase tracking-wider mt-1.5">
                {s.label}
              </div>
              <p className="text-xs text-muted mt-1.5 leading-relaxed">{s.body}</p>
            </div>
          ))}
          <div className="px-6 py-5 border-l border-rule bg-paper">
            <div className="font-mono text-base font-semibold tabular-nums text-ink leading-tight">
              {residency.num}
            </div>
            <div className="font-mono text-[11px] text-gold-ink uppercase tracking-wider mt-2">
              {residency.label}
            </div>
            <p className="text-xs text-muted mt-1.5 leading-relaxed">{residency.body}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
