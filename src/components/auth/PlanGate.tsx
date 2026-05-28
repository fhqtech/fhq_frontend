/**
 * Render-time gate that conditionally shows children based on the active
 * workspace's plan.
 *
 *   <PlanGate feature="ct_blueprints" level="EDIT">
 *     <BlueprintEditor />
 *   </PlanGate>
 *
 * When blocked, renders an inline UpgradeCard by default. Pass `fallback`
 * to render something else (e.g. nothing for nav items, a smaller pill,
 * etc.). The backend's `require_feature` dep enforces the actual access
 * boundary — this is UX only.
 *
 * ## When to override the fallback
 *
 * The default UpgradeCard is intended for **page-level surfaces** —
 * routes or large blocks where displaying an upgrade prompt instead of
 * the feature makes sense (e.g. talent pools tab, blueprint editor, the
 * security settings page).
 *
 * For these surfaces, pass `fallback={null}` and handle visibility
 * yourself in the parent:
 *
 * | Surface             | Recommended fallback                                |
 * |---------------------|-----------------------------------------------------|
 * | Page / tab content  | Default (`UpgradeCard`)                             |
 * | Sidebar nav item    | `fallback={null}` so the link disappears entirely  |
 * | Inline button       | `fallback={null}` (or a disabled button with tip)  |
 * | Table column        | `fallback={null}` (or a "—" placeholder)           |
 * | Modal trigger       | `fallback={null}` (button hidden, no card in flow) |
 * | Dropdown menu item  | `fallback={null}`                                   |
 *
 * The default card has its own `Card`/border styling; nesting it inside
 * another card or a flex/grid cell will break layout. When in doubt,
 * pass `fallback={null}` and render an explicit affordance from the
 * parent that calls `usePlanFeature` directly.
 */
import type { ReactNode } from "react";
import { usePlanFeature } from "@/hooks/usePlan";
import type { FeatureLevel } from "@/contexts/AuthContext";
import { UpgradeCard } from "@/components/billing/UpgradeCard";

interface PlanGateProps {
  feature: string;
  level?: FeatureLevel;
  children: ReactNode;
  /** Override the default UpgradeCard fallback. Pass `null` to hide entirely. */
  fallback?: ReactNode | null;
}

export function PlanGate({ feature, level = "VIEW", children, fallback }: PlanGateProps) {
  const { allowed, plan, requiredPlan } = usePlanFeature(feature, level);
  if (allowed) return <>{children}</>;
  if (fallback === null) return null;
  if (fallback !== undefined) return <>{fallback}</>;
  return (
    <UpgradeCard
      feature={feature}
      currentPlan={plan}
      requiredPlan={requiredPlan}
    />
  );
}

export default PlanGate;
