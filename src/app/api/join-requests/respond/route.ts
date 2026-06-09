import { NextResponse } from "next/server";
import { z } from "zod";
import { getDealershipContext } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  role: z.enum(["manager", "staff"]).default("staff"),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: true, code: "UNAUTHORIZED", message: "Please log in." },
        { status: 401 },
      );
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: true, code: "INVALID_INPUT", message: "Review action is invalid." },
        { status: 400 },
      );
    }

    const { data: joinRequest, error } = await supabase
      .from("join_requests")
      .select("*")
      .eq("id", parsed.data.requestId)
      .maybeSingle();
    if (error) throw error;
    if (!joinRequest) {
      return NextResponse.json(
        { error: true, code: "NOT_FOUND", message: "Join request not found." },
        { status: 404 },
      );
    }

    const { member } = await getDealershipContext(supabase, user.id, joinRequest.dealership_id);
    if (!member || !["owner", "admin"].includes(member.role)) {
      return NextResponse.json(
        { error: true, code: "FORBIDDEN", message: "Only owners and admins can review join requests." },
        { status: 403 },
      );
    }

    if (parsed.data.action === "approve") {
      await supabase.from("dealership_members").upsert(
        {
          dealership_id: joinRequest.dealership_id,
          user_id: joinRequest.user_id,
          role: parsed.data.role,
          status: "active",
        },
        { onConflict: "dealership_id,user_id" },
      );
      await supabase
        .from("profiles")
        .update({ active_dealership_id: joinRequest.dealership_id })
        .eq("user_id", joinRequest.user_id);
    }

    await supabase
      .from("join_requests")
      .update({
        status: parsed.data.action === "approve" ? "approved" : "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq("id", parsed.data.requestId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: true,
        code: "JOIN_RESPONSE_FAILED",
        message:
          error instanceof Error ? error.message : "Could not review this join request.",
      },
      { status: 500 },
    );
  }
}
