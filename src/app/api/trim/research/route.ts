import { NextResponse } from "next/server";
import { z } from "zod";
import { researchVehicleTrims } from "@/lib/generation/trim-research";
import { getDealershipContext } from "@/lib/permissions";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  dealershipId: z.string().uuid(),
  year: z.string().trim().regex(/^(19[8-9]\d|20\d{2})$/),
  make: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(80),
  trim: z.string().trim().max(120).optional(),
  market: z.string().trim().max(10).default("US"),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: true, code: "UNAUTHORIZED" }, { status: 401 });

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: true, code: "IDENTITY_REQUIRED", message: "Add year, make, and model before researching trims." },
        { status: 400 },
      );
    }
    const { dealership, member } = await getDealershipContext(supabase, user.id, parsed.data.dealershipId);
    if (!dealership || !member) return NextResponse.json({ error: true, code: "FORBIDDEN" }, { status: 403 });

    const rateLimit = await checkRateLimit({
      key: user.id,
      route: "/api/trim/research",
      limit: 12,
      windowSeconds: 30 * 60,
    });
    if (!rateLimit.allowed) return rateLimitedResponse;

    const result = await researchVehicleTrims(parsed.data);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: true, code: "TRIM_RESEARCH_FAILED", message: "Trim research paused. You can still enter or confirm the trim manually." },
      { status: 500 },
    );
  }
}

