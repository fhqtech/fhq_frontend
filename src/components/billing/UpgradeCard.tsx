/**
 * Inline upgrade prompt rendered when a plan gate blocks a feature.
 *
 * Single CTA destination — `/settings/plan`. We deliberately don't scatter
 * per-feature upgrade flows; everyone ends up at the same plan-comparison
 * page so the messaging is consistent.
 */
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PlanId } from "@/contexts/AuthContext";

const PLAN_LABEL: Record<PlanId, string> = {
  free: "Free",
  pro: "Pro",
  enterprise: "Enterprise",
};

interface UpgradeCardProps {
  feature?: string;
  requiredPlan?: PlanId | null;
  currentPlan?: PlanId;
  headline?: string;
  description?: string;
}

export function UpgradeCard({
  feature,
  requiredPlan,
  currentPlan,
  headline,
  description,
}: UpgradeCardProps) {
  const targetPlan = requiredPlan ?? "pro";
  const defaultHeadline = `${PLAN_LABEL[targetPlan]} plan unlocks this feature`;
  const defaultDescription = currentPlan
    ? `You're on the ${PLAN_LABEL[currentPlan]} plan. Reach out to discuss access.`
    : "Reach out to discuss access.";

  return (
    <Card className="border-rule">
      <CardContent className="p-6 flex items-start gap-4">
        <div className="rounded-md bg-rule/40 p-2 shrink-0">
          <Lock className="h-4 w-4 text-ink" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-ink">
            {headline ?? defaultHeadline}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {description ?? defaultDescription}
          </p>
          {feature ? (
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
              feature: {feature}
            </p>
          ) : null}
          <div className="mt-4">
            <Button asChild variant="outline" size="sm">
              <Link to="/settings/plan">See plans</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default UpgradeCard;
