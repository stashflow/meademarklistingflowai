import { NextResponse } from "next/server";
import { z } from "zod";
import { extractVehicleFromSourceText } from "@/lib/generation/fill-in";
import { getDealershipContext } from "@/lib/permissions";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { vehicleInputSchema } from "@/lib/validators/listing";

const schema = z.object({
  dealershipId: z.string().uuid(),
  vehicle: vehicleInputSchema,
  sourceText: z.string().trim().min(20).max(8000),
  draftId: z.string().uuid().optional(),
  sourceType: z.enum(["pasted_listing", "inventory_note", "window_sticker", "auction_note", "other"]).default("pasted_listing"),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: true, code: "UNAUTHORIZED", message: "Please log in to use smart intake." },
        { status: 401 },
      );
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: true, code: "INVALID_INPUT", message: "Paste an old listing or vehicle notes with enough detail to read." },
        { status: 400 },
      );
    }

    const { dealership, member } = await getDealershipContext(supabase, user.id, parsed.data.dealershipId);
    if (!dealership || !member) {
      return NextResponse.json(
        { error: true, code: "FORBIDDEN", message: "You need access to this dealership." },
        { status: 403 },
      );
    }

    const rateLimit = await checkRateLimit({
      key: user.id,
      route: "/api/fill-in/source-text",
      limit: 20,
      windowSeconds: 10 * 60,
    });
    if (!rateLimit.allowed) return rateLimitedResponse;

    const result = await extractVehicleFromSourceText(parsed.data.vehicle, parsed.data.sourceText);

    let sourceId: string | null = null;
    if (parsed.data.draftId) {
      const { data: draft } = await supabase
        .from("vehicle_drafts")
        .select("id,dealership_id")
        .eq("id", parsed.data.draftId)
        .eq("dealership_id", dealership.id)
        .maybeSingle();
      if (draft) {
        const { data: source } = await supabase
          .from("vehicle_draft_sources")
          .insert({
            draft_id: draft.id,
            dealership_id: dealership.id,
            created_by: user.id,
            source_type: parsed.data.sourceType,
            source_text: parsed.data.sourceText,
            extracted_data: result.updates,
            conflicts: result.conflicts,
          })
          .select("id")
          .single();
        sourceId = source?.id || null;
      }
    }

    await supabase.from("feature_events").insert({
      dealership_id: dealership.id,
      user_id: user.id,
      feature: "smart_intake",
      action: "extract_source_text",
      route: "/dashboard/new-listing",
      metadata: {
        sourceLength: parsed.data.sourceText.length,
        updates: Object.keys(result.updates || {}).length,
        features: result.featureHighlights.length,
        missingFields: result.missingFields,
      },
    });

    return NextResponse.json({ ...result, sourceId });
  } catch {
    return NextResponse.json(
      {
        error: true,
        code: "SOURCE_TEXT_FAILED",
        message: "Smart intake could not read that text. Try pasting the vehicle listing, window-sticker notes, or inventory notes again.",
      },
      { status: 500 },
    );
  }
}
