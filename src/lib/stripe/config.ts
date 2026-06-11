import Stripe from "stripe";
import type { SubscriptionStatus } from "@/types/dealership";

let stripeClient: Stripe | null = null;

export type BillingPlanKey = "starter" | "pro" | "dealer_group";
export type BillingInterval = "monthly" | "yearly";

export const BILLING_PLANS: Record<
  BillingPlanKey,
  {
    name: string;
    status: SubscriptionStatus;
    monthlyPrice: string;
    yearlyPrice: string;
    limit: string;
    features: string[];
    monthlyEnv: string;
    yearlyEnv: string;
  }
> = {
  starter: {
    name: "Starter",
    status: "starter",
    monthlyPrice: "$79/mo",
    yearlyPrice: "$790/yr",
    limit: "150 generations/month",
    features: ["Style profile", "Saved library", "NHTSA VIN intelligence", "Up to 5 users"],
    monthlyEnv: "STRIPE_PRICE_STARTER_MONTHLY",
    yearlyEnv: "STRIPE_PRICE_STARTER_YEARLY",
  },
  pro: {
    name: "Pro",
    status: "pro",
    monthlyPrice: "$149/mo",
    yearlyPrice: "$1,490/yr",
    limit: "500 generations/month",
    features: ["Bulk intake", "Claim risk auditor", "Team review workflow", "Owner/admin analytics"],
    monthlyEnv: "STRIPE_PRICE_PRO_MONTHLY",
    yearlyEnv: "STRIPE_PRICE_PRO_YEARLY",
  },
  dealer_group: {
    name: "Dealer Group",
    status: "dealer_group",
    monthlyPrice: "$299/mo",
    yearlyPrice: "$2,990/yr",
    limit: "Fair-use unlimited",
    features: ["Multiple-store workflow", "High usage limits", "Advanced audit visibility", "Priority support"],
    monthlyEnv: "STRIPE_PRICE_DEALER_GROUP_MONTHLY",
    yearlyEnv: "STRIPE_PRICE_DEALER_GROUP_YEARLY",
  },
};

export function getStripeClient() {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) throw new Error("STRIPE_SECRET_KEY is not configured.");
  if (!stripeClient) {
    stripeClient = new Stripe(apiKey);
  }
  return stripeClient;
}

export function getStripePriceId(plan: BillingPlanKey, interval: BillingInterval) {
  const config = BILLING_PLANS[plan];
  const envName = interval === "monthly" ? config.monthlyEnv : config.yearlyEnv;
  const priceId = process.env[envName];
  if (!priceId) throw new Error(`${envName} is not configured.`);
  if (!priceId.startsWith("price_")) {
    throw new Error(
      `${envName} must contain a Stripe Price ID beginning with price_, not a dollar amount or product ID.`,
    );
  }
  return priceId;
}

export function stripeBillingConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    Object.values(BILLING_PLANS).every((plan) =>
      [process.env[plan.monthlyEnv], process.env[plan.yearlyEnv]].every((value) => value?.startsWith("price_")),
    ),
  );
}

export function statusFromPriceId(priceId?: string | null): SubscriptionStatus {
  for (const plan of Object.values(BILLING_PLANS)) {
    if (priceId && (priceId === process.env[plan.monthlyEnv] || priceId === process.env[plan.yearlyEnv])) {
      return plan.status;
    }
  }
  return "canceled";
}
