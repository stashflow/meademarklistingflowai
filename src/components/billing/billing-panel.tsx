"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Dealership } from "@/types/dealership";
import { BILLING_PLANS, type BillingInterval, type BillingPlanKey } from "@/lib/stripe/config";
import { getPlanLimit } from "@/lib/generation/plans";

export function BillingPanel({
  dealership,
  canToggle,
  stripeConfigured,
}: {
  dealership: Dealership;
  canToggle: boolean;
  stripeConfigured: boolean;
}) {
  const router = useRouter();
  const current = dealership;
  const [message, setMessage] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const activeLimit = current.subscription_status === "trial"
    ? current.trial_generation_limit
    : getPlanLimit(current.subscription_status);

  async function startCheckout(plan: BillingPlanKey, interval: BillingInterval) {
    setCheckoutLoading(`${plan}-${interval}`);
    setMessage("");
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealershipId: current.id, plan, interval }),
    });
    const payload = await response.json();
    setCheckoutLoading(null);
    if (!response.ok) {
      setMessage(payload.message || "Could not start checkout.");
      return;
    }
    router.push(payload.url);
  }

  async function openPortal() {
    setPortalLoading(true);
    setMessage("");
    const response = await fetch("/api/billing/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealershipId: current.id }),
    });
    const payload = await response.json();
    setPortalLoading(false);
    if (!response.ok) {
      setMessage(payload.message || "Could not open billing portal.");
      return;
    }
    router.push(payload.url);
  }

  return (
    <div className="space-y-6">
      <Card className="app-card">
        <CardHeader>
          <CardTitle>Billing</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-md border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-muted-foreground">Current plan</div>
            <div className="mt-2 text-xl font-semibold">{current.subscription_status.replaceAll("_", " ")}</div>
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-muted-foreground">Monthly generation limit</div>
            <div className="mt-2 text-xl font-semibold">{activeLimit === "unlimited" ? "Unlimited" : `${activeLimit}/month`}</div>
          </div>
          <div className="rounded-md border border-red-500/20 bg-red-500/10 p-4">
            <div className="text-xs text-red-200">Stripe billing</div>
            <div className="mt-2 text-sm text-red-100">
              {current.stripe_subscription_id
                ? "A live Stripe subscription is attached to this dealership."
                : "Start a Stripe Checkout subscription to attach live billing."}
            </div>
          </div>
        </CardContent>
      </Card>

      {message && <div className="rounded-md border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">{message}</div>}
      {!stripeConfigured && (
        <div className="rounded-md border border-amber-400/20 bg-amber-400/[.06] p-4 text-sm text-amber-100">
          Stripe checkout is not configured yet. Add the Stripe secret, webhook secret, and all six price IDs before accepting payments.
        </div>
      )}

      <Card className="app-card">
        <CardHeader>
          <CardTitle>Paid Plans</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Start a 7-day free trial, then Stripe bills automatically monthly or yearly. Owners can manage payment methods and cancellation in the billing portal.
          </p>
          <div className="grid gap-4 lg:grid-cols-3">
            {(Object.entries(BILLING_PLANS) as Array<[BillingPlanKey, typeof BILLING_PLANS[BillingPlanKey]]>).map(([key, plan]) => (
              <Card key={key} className="border-white/10 bg-white/[.035]">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {current.subscription_status === plan.status && <Badge className="bg-primary">Active</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.limit}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 text-sm text-muted-foreground">
                    {plan.features.map((feature) => <div key={feature}>• {feature}</div>)}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      disabled={!canToggle || !stripeConfigured || checkoutLoading === `${key}-monthly`}
                      onClick={() => startCheckout(key, "monthly")}
                      className="bg-primary hover:bg-red-700"
                    >
                      {checkoutLoading === `${key}-monthly` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                      {plan.monthlyPrice}
                    </Button>
                    <Button
                      disabled={!canToggle || !stripeConfigured || checkoutLoading === `${key}-yearly`}
                      onClick={() => startCheckout(key, "yearly")}
                      variant="outline"
                      className="border-white/10 bg-white/5"
                    >
                      {checkoutLoading === `${key}-yearly` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                      {plan.yearlyPrice}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button
            disabled={!canToggle || !stripeConfigured || portalLoading || !current.stripe_customer_id}
            onClick={openPortal}
            variant="outline"
            className="border-white/10 bg-white/5"
          >
            {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            Manage subscription in Stripe
          </Button>
        </CardContent>
      </Card>
      {!canToggle && <p className="text-sm text-muted-foreground">Only dealership owners can manage billing.</p>}
    </div>
  );
}
