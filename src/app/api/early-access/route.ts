import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  name: z.string().min(2),
  company: z.string().min(2),
  email: z.string().email(),
  monthlyVehicleVolume: z.string().min(1),
  biggestChallenge: z.string().min(5),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: true, code: "INVALID_INPUT", message: "Please complete every field." },
      { status: 400 },
    );
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0];
  const key = forwarded || parsed.data.email;
  const rateLimit = await checkRateLimit({
    key,
    route: "/api/early-access",
    limit: 5,
    windowSeconds: 60 * 60,
  });
  if (!rateLimit.allowed) return rateLimitedResponse;

  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("early_access_leads").insert({
      name: parsed.data.name,
      company: parsed.data.company,
      email: parsed.data.email,
      monthly_vehicle_volume: parsed.data.monthlyVehicleVolume,
      biggest_challenge: parsed.data.biggestChallenge,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: true,
        code: "EARLY_ACCESS_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "We could not save your early access request.",
      },
      { status: 500 },
    );
  }
}
