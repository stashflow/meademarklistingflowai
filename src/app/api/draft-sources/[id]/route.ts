import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: true, code: "UNAUTHORIZED" }, { status: 401 });

  const { error } = await supabase.from("vehicle_draft_sources").delete().eq("id", id);
  if (error) {
    return NextResponse.json(
      { error: true, code: "SOURCE_DELETE_FAILED", message: "Could not delete the saved source text." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}

