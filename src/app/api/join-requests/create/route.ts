import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendJoinRequestNotificationEmail } from "@/lib/email/join-request";

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

    const admin = getSupabaseAdminClient();
    const [{ data: dealership, error: dealershipError }, { data: requesterProfile, error: requesterError }, { data: ownerMembers, error: ownersError }] = await Promise.all([
      admin
        .from("dealerships")
        .select("id,name,created_by")
        .eq("id", parsed.data.dealershipId)
        .maybeSingle(),
      admin
        .from("profiles")
        .select("full_name,email")
        .eq("user_id", user.id)
        .maybeSingle(),
      admin
        .from("dealership_members")
        .select("role,profiles(full_name,email)")
        .eq("dealership_id", parsed.data.dealershipId)
        .eq("status", "active")
        .in("role", ["owner", "admin"]),
    ]);
    if (dealershipError || requesterError || ownersError) {
      throw dealershipError || requesterError || ownersError;
    }
    if (!dealership) {
      return NextResponse.json(
        { error: true, code: "NOT_FOUND", message: "That dealership could not be found." },
        { status: 404 },
      );
    }

    const existingMembership = await supabase
      .from("dealership_members")
      .select("id")
      .eq("dealership_id", parsed.data.dealershipId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (existingMembership.data) {
      return NextResponse.json(
        {
          error: true,
          code: "ALREADY_MEMBER",
          message: "You already belong to this dealership.",
          dashboardUrl: "/dashboard",
        },
        { status: 409 },
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
          waitingUrl: `/waiting?dealershipId=${parsed.data.dealershipId}`,
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

    const { data: creatorProfile } = dealership.created_by
      ? await admin.from("profiles").select("email").eq("user_id", dealership.created_by).maybeSingle()
      : { data: null };
    const ownerEmails = (ownerMembers || [])
      .map((member) => (member as { profiles?: { email?: string | null } | null }).profiles?.email || "")
      .filter(Boolean);
    const recipientEmails = [creatorProfile?.email || "", ...ownerEmails]
      .filter((email): email is string => Boolean(email))
      .filter((email, index, list) => list.findIndex((item) => item.toLowerCase() === email.toLowerCase()) === index);

    await sendJoinRequestNotificationEmail({
      dealershipName: dealership.name,
      dealershipId: dealership.id,
      requesterName: requesterProfile?.full_name || user.email || "A dealership user",
      requesterEmail: requesterProfile?.email || user.email || "",
      requestMessage: parsed.data.message,
      recipientEmails,
    }).catch(() => null);

    return NextResponse.json({ ok: true, waitingUrl: `/waiting?dealershipId=${dealership.id}` });
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
