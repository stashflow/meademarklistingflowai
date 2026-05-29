import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripeClient, statusFromPriceId } from "@/lib/stripe/config";

export const runtime = "nodejs";

function subscriptionStatus(status: string, priceId?: string | null) {
  if (status === "active" || status === "trialing") return statusFromPriceId(priceId);
  if (status === "past_due" || status === "unpaid") return "past_due";
  if (status === "canceled" || status === "incomplete_expired") return "canceled";
  return "trial";
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: true, message: "STRIPE_WEBHOOK_SECRET is not configured." }, { status: 500 });
  }

  const stripe = getStripeClient();
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature || "", webhookSecret);
  } catch (error) {
    return NextResponse.json(
      { error: true, message: error instanceof Error ? error.message : "Invalid Stripe signature." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();

  async function syncSubscription(subscriptionId: string) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price"],
    });
    const billingSubscription = subscription as Stripe.Subscription & {
      current_period_end?: number | null;
      trial_end?: number | null;
    };
    const item = subscription.items.data[0];
    const priceId = item?.price?.id || null;
    const dealershipId = String(subscription.metadata.dealershipId || "");
    const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
    if (!dealershipId) return;

    await supabase
      .from("dealerships")
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        stripe_current_period_end: billingSubscription.current_period_end
          ? new Date(billingSubscription.current_period_end * 1000).toISOString()
          : null,
        trial_ends_at: billingSubscription.trial_end ? new Date(billingSubscription.trial_end * 1000).toISOString() : null,
        subscription_status: subscriptionStatus(subscription.status, priceId),
        fake_paid_mode: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dealershipId);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.subscription && typeof session.subscription === "string") {
        await syncSubscription(session.subscription);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await syncSubscription(event.data.object.id);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null };
      const subscriptionId = invoice.subscription;
      if (typeof subscriptionId === "string") await syncSubscription(subscriptionId);
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null };
      const subscriptionId = invoice.subscription;
      if (typeof subscriptionId === "string") await syncSubscription(subscriptionId);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
