import { NextResponse } from "next/server";
import { z } from "zod";
import { draftSearchColumns, hasMeaningfulDraftData } from "@/lib/drafts";
import { getDealershipContext } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generationPreferencesSchema, vehicleInputSchema } from "@/lib/validators/listing";

const createSchema = z.object({
  dealershipId: z.string().uuid(),
  inputData: vehicleInputSchema,
  preferences: generationPreferencesSchema.optional(),
  batchItemId: z.string().uuid().nullable().optional(),
});

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: true, code: "UNAUTHORIZED", message: "Please log in." }, { status: 401 });
  }

  const requestedId = new URL(request.url).searchParams.get("dealershipId") || undefined;
  const { dealership, member } = await getDealershipContext(supabase, user.id, requestedId);
  if (!dealership || !member) {
    return NextResponse.json({ error: true, code: "FORBIDDEN", message: "You need a dealership workspace." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("vehicle_drafts")
    .select("*")
    .eq("dealership_id", dealership.id)
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: true, code: "DRAFTS_FAILED", message: error.message }, { status: 500 });
  }
  return NextResponse.json({ drafts: data || [] });
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: true, code: "UNAUTHORIZED", message: "Please log in." }, { status: 401 });
    }

    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success || !hasMeaningfulDraftData(parsed.data?.inputData || {})) {
      return NextResponse.json(
        { error: true, code: "EMPTY_DRAFT", message: "Add a VIN, vehicle model, stock number, or notes to start a draft." },
        { status: 400 },
      );
    }

    const { dealership, member } = await getDealershipContext(supabase, user.id, parsed.data.dealershipId);
    if (!dealership || !member) {
      return NextResponse.json({ error: true, code: "FORBIDDEN", message: "You need access to this dealership." }, { status: 403 });
    }

    if (parsed.data.batchItemId) {
      const { data: existingDraft } = await supabase
        .from("vehicle_drafts")
        .select("*")
        .eq("dealership_id", dealership.id)
        .eq("batch_item_id", parsed.data.batchItemId)
        .neq("status", "archived")
        .maybeSingle();
      if (existingDraft) return NextResponse.json({ draft: existingDraft, recovered: true });
    }

    const vehicle = parsed.data.inputData;
    const { data, error } = await supabase
      .from("vehicle_drafts")
      .insert({
        dealership_id: dealership.id,
        created_by: user.id,
        last_edited_by: user.id,
        batch_item_id: parsed.data.batchItemId || null,
        input_data: vehicle,
        preferences: parsed.data.preferences || {},
        ...draftSearchColumns(vehicle),
      })
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ draft: data });
  } catch (error) {
    return NextResponse.json(
      { error: true, code: "DRAFT_CREATE_FAILED", message: error instanceof Error ? error.message : "Could not create draft." },
      { status: 500 },
    );
  }
}
