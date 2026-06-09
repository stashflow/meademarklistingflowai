import { NextResponse } from "next/server";
import { z } from "zod";
import { getDealershipContext } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeClient, getStripePriceId } from "@/lib/stripe/config";

const schema = z.object({
  dealershipId: z.string().uuid(),
  plan: z.enum(["starter", "pro", "dealer_group"]),
  interval: z.enum(["monthly", "yearly"]).default("monthly"),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: true, code: "UNAUTHORIZED", message: "Please log in to start checkout." }, { status: 401 });
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: true, code: "INVALID_INPUT", message: "Checkout details are invalid." }, { status: 400 });
    }

    const { dealership, member } = await getDealershipContext(supabase, user.id, parsed.data.dealershipId);
    if (!dealership || member?.role !== "owner") {
      return NextResponse.json({ error: true, code: "FORBIDDEN", message: "Only dealership owners can manage billing." }, { status: 403 });
    }

    const stripe = getStripeClient();
    const priceId = getStripePriceId(parsed.data.plan, parsed.data.interval);
    const origin = new URL(request.url).origin;
    let customerId = dealership.stripe_customer_id;

    if (
      dealership.stripe_subscription_id &&
      ["starter", "pro", "dealer_group"].includes(dealership.subscription_status)
    ) {
      return NextResponse.json(
        {
          error: true,
          code: "SUBSCRIPTION_EXISTS",
          message: "This dealership already has a subscription. Use Manage subscription to change plans or billing details.",
        },
        { status: 409 },
      );
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: dealership.name,
        metadata: {
          dealershipId: dealership.id,
          userId: user.id,
        },
      });
      customerId = customer.id;
      await supabase
        .from("dealerships")
        .update({ stripe_customer_id: customerId, billing_email: user.email, updated_at: new Date().toISOString() })
        .eq("id", dealership.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        ...(dealership.trial_ends_at || dealership.stripe_subscription_id ? {} : { trial_period_days: 7 }),
        metadata: {
          dealershipId: dealership.id,
          plan: parsed.data.plan,
          interval: parsed.data.interval,
        },
      },
      metadata: {
        dealershipId: dealership.id,
        plan: parsed.data.plan,
        interval: parsed.data.interval,
      },
      success_url: `${origin}/dashboard/billing?checkout=success`,
      cancel_url: `${origin}/dashboard/billing?checkout=cancelled`,
      client_reference_id: dealership.id,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      { error: true, code: "CHECKOUT_FAILED", message: error instanceof Error ? error.message : "Could not start checkout." },
      { status: 500 },
    );
  }
}
