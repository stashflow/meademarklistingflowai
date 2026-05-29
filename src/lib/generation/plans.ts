import { PLAN_LIMITS, type Dealership, type SubscriptionStatus } from "@/types/dealership";

export function getPlanLimit(status: SubscriptionStatus, fakePaidMode: boolean) {
  if (fakePaidMode && status !== "trial") {
    return PLAN_LIMITS[status];
  }

  return PLAN_LIMITS.trial;
}

export function canGenerateForPlan(dealership: Dealership, currentCount: number) {
  const limit = getPlanLimit(dealership.subscription_status, dealership.fake_paid_mode);

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
