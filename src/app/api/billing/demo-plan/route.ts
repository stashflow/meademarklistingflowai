import { NextResponse } from "next/server";
import { z } from "zod";
import { getDealershipContext } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  dealershipId: z.string().uuid(),
  status: z.enum(["trial", "starter_demo", "pro_demo", "unlimited_demo"]),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: true, code: "UNAUTHORIZED", message: "Please log in to change billing mode." },
        { status: 401 },
      );
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: true, code: "INVALID_INPUT", message: "Plan selection is invalid." },
        { status: 400 },
      );
    }

    const { dealership, member } = await getDealershipContext(supabase, user.id, parsed.data.dealershipId);
    if (!dealership || !member || member.role !== "owner") {
      return NextResponse.json(
        { error: true, code: "FORBIDDEN", message: "Only owners can toggle demo billing mode." },
        { status: 403 },
      );
    }
    if (dealership.stripe_subscription_id) {
      return NextResponse.json(
        {
          error: true,
          code: "REAL_SUBSCRIPTION_ACTIVE",
          message: "Demo plans cannot replace a Stripe subscription. Manage the real subscription in Stripe instead.",
        },
        { status: 409 },
      );
    }

    const { data, error } = await supabase
      .from("dealerships")
      .update({
        subscription_status: parsed.data.status,
        fake_paid_mode: parsed.data.status !== "trial",
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.dealershipId)
      .select("*")
      .single();
    if (error) throw error;

    return NextResponse.json({ dealership: data });
  } catch (error) {
    return NextResponse.json(
      {
        error: true,
        code: "BILLING_UPDATE_FAILED",
        message:
          error instanceof Error ? error.message : "Could not update demo billing mode.",
      },
      { status: 500 },
    );
  }
}
