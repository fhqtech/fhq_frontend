/**
 * P0-1 — the feature-flag registry. Every structural change in the redesign
 * ships behind one of these so the running pilot renders the legacy path until
 * a workspace opts in. Flags are default-off by construction; turning one on is
 * an explicit act (admin toggle / remote /flags value / dev override).
 *
 * Adding a flag: add the key to FlagKey and an entry here with `default: false`.
 * The resolve test asserts the default-off invariant across the whole registry.
 */
export type FlagKey =
  // Phase 0 — safe enabling & cleanup
  | "soft_delete"
  | "unified_status"
  | "settings_save"
  | "credit_gate"
  // Phase 1 — async resilience & first aha
  | "async_progress"
  | "ws_reconnect"
  | "precheck_chat_fallback"
  | "candidate_calm"
  | "sample_role"
  // Phase 2 — role-as-home IA & single builder
  | "role_home"
  | "one_builder"
  | "nba"
  | "unified_ia"
  // Phase 3 — talent, compare, bulk velocity
  | "talent"
  | "bulk"
  | "compare"
  | "keyboard"
  // Phase 4 — reviewer v2 & trust surfaces
  | "evidence_contract"
  | "tag_evidence"
  | "integrity"
  | "defense_authenticity"
  | "transferable"
  // Phase 5 — candidate-360 & stage-results consolidation
  | "canonical_id"
  | "candidate_360"
  | "stage_results"
  | "candidate_write"
  // Phase 5 — expanded-value slices
  | "cohort_gap"
  | "blueprint_target_seed"
  | "candidate_feedback"
  | "scorecard";

export interface FlagDef {
  key: FlagKey;
  /** Short, sentence-case description shown in the Admin feature-flag console. */
  description: string;
  /** Always false: a flag must never default on. */
  default: false;
}

const def = (key: FlagKey, description: string): FlagDef => ({ key, description, default: false });

export const FLAG_REGISTRY: Record<FlagKey, FlagDef> = {
  soft_delete: def("soft_delete", "Soft-delete with undo for roles, stages, and candidates"),
  unified_status: def("unified_status", "Unified candidate-state token across surfaces"),
  settings_save: def("settings_save", "Per-tab Settings save with persistence"),
  credit_gate: def("credit_gate", "Out-of-credits gate before invite send and interview start"),
  async_progress: def("async_progress", "Progress, ETA, and resumable handle on long operations"),
  ws_reconnect: def("ws_reconnect", "Interview reconnect exhaustion-resume and orphan finalize"),
  precheck_chat_fallback: def("precheck_chat_fallback", "Typed-interview fallback when the mic fails"),
  candidate_calm: def("candidate_calm", "Reassurance-first candidate flow with concrete result ETA"),
  sample_role: def("sample_role", "Seeded sample role with a real graph for first-run"),
  role_home: def("role_home", "Role-as-home information architecture and workspace pulse"),
  one_builder: def("one_builder", "Single open-a-role flow with typed add-stage"),
  nba: def("nba", "Next-best-action chip and bar on candidate rows"),
  unified_ia: def("unified_ia", "Unified role model: collapsed nav + legacy-surface redirects"),
  talent: def("talent", "Cross-role talent index, shortlists, and skill-matcher filter view"),
  bulk: def("bulk", "Bulk action bar across talent, compare, and results"),
  compare: def("compare", "Compare tray for two to four graphs side by side"),
  keyboard: def("keyboard", "Keyboard triage on the roster and workspace pulse"),
  evidence_contract: def("evidence_contract", "Render ungrounded scores as unverified"),
  tag_evidence: def("tag_evidence", "Provenance and grounding on graph-node tap"),
  integrity: def("integrity", "Contestable integrity indicator on results and candidate-360"),
  defense_authenticity: def("defense_authenticity", "Authenticity verdict and integrity flags from the practical defense"),
  transferable: def("transferable", "Transferable-skill band on results"),
  canonical_id: def("canonical_id", "Canonical candidate id with merge and unmerge"),
  candidate_360: def("candidate_360", "Read-time candidate-360 fan-in view"),
  stage_results: def("stage_results", "Consolidated stage-results surface"),
  candidate_write: def("candidate_write", "Write-side candidate-record consolidation"),
  cohort_gap: def("cohort_gap", "Cohort gap-vs-target summary on the role pipeline"),
  blueprint_target_seed: def(
    "blueprint_target_seed",
    "Seed the role skill target from the role blueprint's required proficiencies",
  ),
  candidate_feedback: def(
    "candidate_feedback",
    "Candidate-facing per-skill feedback report with DPDP consent and retention",
  ),
  scorecard: def("scorecard", "Collaborative per-skill scorecards and same-role comparison matrix"),
};
