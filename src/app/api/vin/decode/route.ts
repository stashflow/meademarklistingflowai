import { NextResponse } from "next/server";
import { z } from "zod";
import { getDealershipContext } from "@/lib/permissions";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { trackFeatureEvent, writeAuditLog } from "@/lib/telemetry/audit";
import { getVehicleIntelligence } from "@/lib/vin/nhtsa-intelligence";
import { decodeVinWithNhtsa } from "@/lib/vin/nhtsa";

const schema = z.object({
  vin: z.string().trim().min(11).max(17),
  dealershipId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: true, code: "UNAUTHORIZED", message: "Please log in to decode VINs." },
        { status: 401 },
      );
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: true, code: "INVALID_VIN", message: "Enter a valid 17-character VIN." },
        { status: 400 },
      );
    }

    const rateLimit = await checkRateLimit({
      key: user.id,
      route: "/api/vin/decode",
      limit: 30,
      windowSeconds: 10 * 60,
    });
    if (!rateLimit.allowed) return rateLimitedResponse;

    const { dealership, member } = await getDealershipContext(supabase, user.id, parsed.data.dealershipId);
    if (parsed.data.dealershipId && (!dealership || !member)) {
      return NextResponse.json(
        { error: true, code: "NO_DEALERSHIP", message: "You need access to this dealership workspace." },
        { status: 403 },
      );
    }

    const result = await decodeVinWithNhtsa(parsed.data.vin);
    const intelligence = await getVehicleIntelligence({
      year: result.decoded.year,
      make: result.decoded.make,
      model: result.decoded.model,
      trim: result.decoded.trim,
    });

    if (intelligence) {
      result.decoded.vehicleIntelligenceSummary = intelligence.aiSummary.summary;
      result.decoded.vehicleSafetySummary = intelligence.aiSummary.safetySummary;
      result.decoded.vehicleRecallSummary = intelligence.aiSummary.recallSummary;
      result.decoded.vehicleValueNotes = intelligence.aiSummary.valueNotes;
      result.decoded.vehicleIntelligenceScore = String(intelligence.intelligenceScore);
      result.decoded.vehicleIntelligenceSource = "NHTSA VPIC, NHTSA NCAP, NHTSA Recalls";
      result.decoded.vehicleIntelligenceCached = intelligence.fromCache ? "true" : "false";
      result.decoded.vehicleIntelligenceWarnings = [
        ...intelligence.aiSummary.cautions,
        ...intelligence.aiSummary.validationWarnings,
      ].join("\n");
    }

    await trackFeatureEvent(supabase, {
      dealershipId: dealership?.id || null,
      userId: user.id,
      feature: "vin_decode",
      action: "decode",
      route: "/api/vin/decode",
      metadata: {
        source: result.source,
        hasWarnings: result.warnings.length > 0,
        intelligenceCached: intelligence?.fromCache ?? null,
        recallCount: intelligence?.recalls.count ?? null,
        safetyRatings: intelligence?.safety.ratings.length ?? null,
      },
    });

    await writeAuditLog(supabase, {
      dealershipId: dealership?.id || null,
      actorUserId: user.id,
      entityType: "vin_decode",
      action: "decoded",
      afterData: {
        vin: result.vin,
        year: result.decoded.year,
        make: result.decoded.make,
        model: result.decoded.model,
        intelligenceScore: intelligence?.intelligenceScore ?? null,
      },
    });

    return NextResponse.json({ ...result, intelligence });
  } catch (error) {
    return NextResponse.json(
      {
        error: true,
        code: "VIN_DECODE_FAILED",
        message: error instanceof Error ? error.message : "Could not decode this VIN.",
      },
      { status: 500 },
    );
  }
}
