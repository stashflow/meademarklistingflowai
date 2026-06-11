import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isConfiguredAppAdmin } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!isConfiguredAppAdmin(user?.email)) {
      return NextResponse.json({ error: true, code: "FORBIDDEN", message: "Admin access required." }, { status: 403 });
    }

    const admin = getSupabaseAdminClient();
    const { error } = await admin.from("dealerships").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: true, code: "DELETE_FAILED", message: error instanceof Error ? error.message : "Could not delete dealership." },
      { status: 500 },
    );
  }
}
