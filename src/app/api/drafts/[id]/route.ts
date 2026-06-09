import { NextResponse } from "next/server";
import { z } from "zod";
import { draftSearchColumns } from "@/lib/drafts";
import { getDealershipContext } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generationPreferencesSchema, vehicleInputSchema } from "@/lib/validators/listing";

const patchSchema = z.object({
  inputData: vehicleInputSchema.optional(),
  preferences: generationPreferencesSchema.optional(),
  generatedOutput: z.record(z.string(), z.unknown()).nullable().optional(),
  currentStep: z.enum(["facts", "fill_in", "copy"]).optional(),
  activePlatform: z.enum(["facebook", "cargurus", "website"]).optional(),
  status: z.enum(["draft", "ready", "generated", "published", "archived"]).optional(),
  listingId: z.string().uuid().nullable().optional(),
  autosaveVersion: z.number().int().positive().optional(),
});

async function authorizedDraft(id: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, draft: null, member: null };
  const { data: draft } = await supabase.from("vehicle_drafts").select("*").eq("id", id).maybeSingle();
  if (!draft) return { supabase, user, draft: null, member: null };
  const context = await getDealershipContext(supabase, user.id, draft.dealership_id);
  return { supabase, user, draft, member: context.member };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, user, draft, member } = await authorizedDraft(id);
    if (!user) return NextResponse.json({ error: true, code: "UNAUTHORIZED" }, { status: 401 });
    if (!draft || !member) return NextResponse.json({ error: true, code: "NOT_FOUND", message: "Draft not found." }, { status: 404 });

    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: true, code: "INVALID_DRAFT", message: "Draft changes were invalid." }, { status: 400 });
    }

    if (parsed.data.autosaveVersion && parsed.data.autosaveVersion < draft.autosave_version) {
      return NextResponse.json(
        { error: true, code: "STALE_DRAFT", message: "A newer version of this draft is already saved.", draft },
        { status: 409 },
      );
    }

    const vehicle = parsed.data.inputData;
    const update = {
      ...(vehicle ? { input_data: vehicle, ...draftSearchColumns(vehicle) } : {}),
      ...(parsed.data.preferences ? { preferences: parsed.data.preferences } : {}),
      ...(parsed.data.generatedOutput !== undefined ? { generated_output: parsed.data.generatedOutput } : {}),
      ...(parsed.data.currentStep ? { current_step: parsed.data.currentStep } : {}),
      ...(parsed.data.activePlatform ? { active_platform: parsed.data.activePlatform } : {}),
      ...(parsed.data.status ? {
        status: parsed.data.status,
        archived_at: parsed.data.status === "archived" ? new Date().toISOString() : null,
      } : {}),
      ...(parsed.data.listingId !== undefined ? { listing_id: parsed.data.listingId } : {}),
      last_edited_by: user.id,
      autosave_version: draft.autosave_version + 1,
      updated_at: new Date().toISOString(),
      ...(parsed.data.generatedOutput ? { last_generated_at: new Date().toISOString() } : {}),
    };

    const { data, error } = await supabase.from("vehicle_drafts").update(update).eq("id", id).select("*").single();
    if (error) throw error;
    return NextResponse.json({ draft: data });
  } catch (error) {
    return NextResponse.json(
      { error: true, code: "DRAFT_SAVE_FAILED", message: error instanceof Error ? error.message : "Could not save draft." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, draft, member } = await authorizedDraft(id);
  if (!user) return NextResponse.json({ error: true, code: "UNAUTHORIZED" }, { status: 401 });
  if (!draft || !member) return NextResponse.json({ error: true, code: "NOT_FOUND" }, { status: 404 });

  const { error } = await supabase.from("vehicle_drafts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: true, code: "DRAFT_DELETE_FAILED", message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

