import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  dealershipId: z.string().uuid(),
  message: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: true, code: "UNAUTHORIZED", message: "Please log in to request access." },
        { status: 401 },
      );
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: true, code: "INVALID_INPUT", message: "Please choose a dealership." },
        { status: 400 },
      );
    }

    const existing = await supabase
      .from("join_requests")
      .select("id,status")
      .eq("dealership_id", parsed.data.dealershipId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing.data) {
      return NextResponse.json(
        {
          error: true,
          code: "JOIN_REQUEST_EXISTS",
          message: "You already submitted a join request for this dealership.",
        },
        { status: 409 },
      );
    }

    const { error } = await supabase.from("join_requests").insert({
      dealership_id: parsed.data.dealershipId,
      user_id: user.id,
      message: parsed.data.message,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: true,
        code: "JOIN_REQUEST_FAILED",
        message:
          error instanceof Error ? error.message : "Could not submit this join request.",
      },
      { status: 500 },
    );
  }
}
