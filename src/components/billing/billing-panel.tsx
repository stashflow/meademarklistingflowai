"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Dealership, SubscriptionStatus } from "@/types/dealership";

const plans: Array<{ status: SubscriptionStatus; name: string; limit: string; action: string }> = [
  { status: "starter_demo", name: "Starter Demo", limit: "150 generations/month", action: "Activate Starter Demo" },
  { status: "pro_demo", name: "Pro Demo", limit: "500 generations/month", action: "Activate Pro Demo" },
  { status: "unlimited_demo", name: "Unlimited Demo", limit: "Unlimited test generations", action: "Activate Unlimited Demo" },
  { status: "trial", name: "Free Trial", limit: "35 generations/month", action: "Return to Free Trial" },
];

export function BillingPanel({
  dealership,
  canToggle,
}: {
  dealership: Dealership;
  canToggle: boolean;
}) {
  const [current, setCurrent] = useState(dealership);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState<SubscriptionStatus | null>(null);

  async function setPlan(status: SubscriptionStatus) {
    setLoading(status);
    const response = await fetch("/api/billing/demo-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealershipId: current.id, status }),
    });
    const payload = await response.json();
    setLoading(null);
    if (!response.ok) {
      setMessage(payload.message || "Could not update demo billing.");
      return;
    }
    setCurrent(payload.dealership);
    setMessage("Demo billing mode updated. No real payment was processed.");
  }

  return (
    <div className="space-y-6">
      <Card className="app-card">
        <CardHeader>
          <CardTitle>Billing / Trial Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-md border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-muted-foreground">Current plan</div>
            <div className="mt-2 text-xl font-semibold">{current.subscription_status.replaceAll("_", " ")}</div>
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-muted-foreground">Trial limit</div>
            <div className="mt-2 text-xl font-semibold">35/month</div>
          </div>
          <div className="rounded-md border border-red-500/20 bg-red-500/10 p-4">
            <div className="text-xs text-red-200">Demo billing mode</div>
            <div className="mt-2 text-sm text-red-100">
              No real payment is processed.
            </div>
          </div>
        </CardContent>
      </Card>

      {message && <div className="rounded-md border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">{message}</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <Card key={plan.status} className="app-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                {current.subscription_status === plan.status && <Badge className="bg-primary">Active</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-muted-foreground">{plan.limit}</p>
              <Button
                disabled={!canToggle || loading === plan.status}
                onClick={() => setPlan(plan.status)}
                className="w-full bg-primary hover:bg-red-700"
              >
                {loading === plan.status ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {plan.action}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {!canToggle && <p className="text-sm text-muted-foreground">Only dealership owners can toggle demo billing mode.</p>}
    </div>
  );
}
