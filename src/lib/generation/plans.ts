import { PLAN_LIMITS, type Dealership, type SubscriptionStatus } from "@/types/dealership";

export function getPlanLimit(status: SubscriptionStatus) {
  if (status === "starter" || status === "pro" || status === "dealer_group" || status === "past_due" || status === "canceled") {
    return PLAN_LIMITS[status];
  }

  return PLAN_LIMITS.trial;
}

export function canGenerateForPlan(dealership: Dealership, currentCount: number) {
  const configuredLimit = getPlanLimit(dealership.subscription_status);
  const limit = dealership.subscription_status === "trial"
    ? dealership.trial_generation_limit
    : configuredLimit;

  if (limit === "unlimited") {
    return { allowed: true, limit, remaining: "unlimited" as const };
  }

  return {
    allowed: currentCount < limit,
    limit,
    remaining: Math.max(limit - currentCount, 0),
  };
}

export function currentMonthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
