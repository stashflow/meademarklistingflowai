import { NextResponse } from "next/server";
import { z } from "zod";
import { getDealershipContext } from "@/lib/permissions";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { localFillInQuestions } from "@/lib/generation/fill-in";
import { vehicleInputSchema } from "@/lib/validators/listing";

const schema = z.object({
  dealershipId: z.string().uuid(),
  vehicle: vehicleInputSchema,
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
      return NextResponse.json({ error: true, code: "INVALID_INPUT", message: "Vehicle details are invalid." }, { status: 400 });
    }
    const { dealership, member } = await getDealershipContext(supabase, user.id, parsed.data.dealershipId);
    if (!dealership || !member) {
      return NextResponse.json({ error: true, code: "FORBIDDEN", message: "You need access to this dealership." }, { status: 403 });
    }
    const rateLimit = await checkRateLimit({
      key: user.id,
      route: "/api/fill-in/questions",
      limit: 20,
      windowSeconds: 10 * 60,
    });
    if (!rateLimit.allowed) return rateLimitedResponse;

    const questions = localFillInQuestions(parsed.data.vehicle);
    return NextResponse.json({ questions });
  } catch (error) {
    return NextResponse.json(
      { error: true, code: "FILL_IN_FAILED", message: error instanceof Error ? error.message : "Could not start LF Fill In." },
      { status: 500 },
    );
  }
}
