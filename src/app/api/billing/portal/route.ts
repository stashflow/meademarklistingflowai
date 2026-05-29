import { NextResponse } from "next/server";
import { z } from "zod";
import { getDealershipContext } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe/config";

const schema = z.object({
  dealershipId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: true, code: "UNAUTHORIZED", message: "Please log in to manage billing." }, { status: 401 });
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: true, code: "INVALID_INPUT", message: "Billing details are invalid." }, { status: 400 });
    }

    const { dealership, member } = await getDealershipContext(supabase, user.id, parsed.data.dealershipId);
    if (!dealership || member?.role !== "owner") {
      return NextResponse.json({ error: true, code: "FORBIDDEN", message: "Only dealership owners can manage billing." }, { status: 403 });
    }
    if (!dealership.stripe_customer_id) {
      return NextResponse.json({ error: true, code: "NO_CUSTOMER", message: "Start a subscription before opening the billing portal." }, { status: 400 });
    }

    const session = await getStripeClient().billingPortal.sessions.create({
      customer: dealership.stripe_customer_id,
      return_url: `${new URL(request.url).origin}/dashboard/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      { error: true, code: "PORTAL_FAILED", message: error instanceof Error ? error.message : "Could not open billing portal." },
      { status: 500 },
    );
  }
}
