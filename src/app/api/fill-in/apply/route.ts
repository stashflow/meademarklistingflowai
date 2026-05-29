import { NextResponse } from "next/server";
import { z } from "zod";
import { applyFillInAnswers } from "@/lib/generation/fill-in";
import { getDealershipContext } from "@/lib/permissions";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { vehicleInputSchema } from "@/lib/validators/listing";

const schema = z.object({
  dealershipId: z.string().uuid(),
  vehicle: vehicleInputSchema,
  answers: z.record(z.string(), z.string().max(1000)),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: true, code: "UNAUTHORIZED", message: "Please log in to use LF Fill In." }, { status: 401 });
    }
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: true, code: "INVALID_INPUT", message: "Fill In answers are invalid." }, { status: 400 });
    }
    const { dealership, member } = await getDealershipContext(supabase, user.id, parsed.data.dealershipId);
    if (!dealership || !member) {
      return NextResponse.json({ error: true, code: "FORBIDDEN", message: "You need access to this dealership." }, { status: 403 });
    }
    const rateLimit = await checkRateLimit({
      key: user.id,
      route: "/api/fill-in/apply",
      limit: 20,
      windowSeconds: 10 * 60,
    });
    if (!rateLimit.allowed) return rateLimitedResponse;

    const result = await applyFillInAnswers(parsed.data.vehicle, parsed.data.answers);
    await supabase.from("feature_events").insert({
      dealership_id: dealership.id,
      user_id: user.id,
      feature: "lf_fill_in",
      action: "apply",
      route: "/dashboard/new-listing",
      metadata: {
        answers: Object.keys(parsed.data.answers).length,
        updates: Object.keys(result.updates || {}).length,
        features: result.featureHighlights.length,
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: true, code: "FILL_IN_FAILED", message: error instanceof Error ? error.message : "Could not apply LF Fill In." },
      { status: 500 },
    );
  }
}
