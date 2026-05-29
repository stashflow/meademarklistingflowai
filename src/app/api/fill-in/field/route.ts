import { NextResponse } from "next/server";
import { z } from "zod";
import { fillSingleVehicleField } from "@/lib/generation/field-fill";
import { getDealershipContext } from "@/lib/permissions";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { vehicleInputSchema } from "@/lib/validators/listing";
import type { VehicleInput } from "@/types/listing";

const schema = z.object({
  dealershipId: z.string().uuid(),
  vehicle: vehicleInputSchema,
  field: z.string(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: true, code: "UNAUTHORIZED", message: "Please log in to use LF quick fill." }, { status: 401 });
    }
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: true, code: "INVALID_INPUT", message: "Quick fill details are invalid." }, { status: 400 });
    }
    const { dealership, member } = await getDealershipContext(supabase, user.id, parsed.data.dealershipId);
    if (!dealership || !member) {
      return NextResponse.json({ error: true, code: "FORBIDDEN", message: "You need access to this dealership." }, { status: 403 });
    }
    const rateLimit = await checkRateLimit({
      key: user.id,
      route: "/api/fill-in/field",
      limit: 30,
      windowSeconds: 10 * 60,
    });
    if (!rateLimit.allowed) return rateLimitedResponse;

    const result = await fillSingleVehicleField(parsed.data.vehicle, parsed.data.field as keyof VehicleInput);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: true, code: "FIELD_FILL_FAILED", message: error instanceof Error ? error.message : "Could not fill this field." },
      { status: 500 },
    );
  }
}
