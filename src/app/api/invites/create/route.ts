import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDealershipContext } from "@/lib/permissions";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  dealershipId: z.string().uuid(),
  role: z.enum(["manager", "staff"]).default("staff"),
  email: z.string().trim().email().optional(),
  expiresInDays: z.number().min(1).max(30).optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: true, code: "UNAUTHORIZED", message: "Please log in to create invites." },
        { status: 401 },
      );
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: true, code: "INVALID_INPUT", message: "Invite details are invalid." },
        { status: 400 },
      );
    }

    const { member } = await getDealershipContext(supabase, user.id, parsed.data.dealershipId);
    if (!member || !["owner", "admin"].includes(member.role)) {
      return NextResponse.json(
        { error: true, code: "FORBIDDEN", message: "Only owners and admins can create invite links." },
        { status: 403 },
      );
    }

    const rateLimit = await checkRateLimit({
      key: parsed.data.dealershipId,
      route: "/api/invites/create",
      limit: 10,
      windowSeconds: 24 * 60 * 60,
    });
    if (!rateLimit.allowed) return rateLimitedResponse;

    const expiresAt = parsed.data.expiresInDays
      ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const token = randomUUID().replaceAll("-", "");
    const { data, error } = await supabase
      .from("dealership_invites")
      .insert({
        dealership_id: parsed.data.dealershipId,
        token,
        role: parsed.data.role,
        created_by: user.id,
        expires_at: expiresAt,
      })
      .select("*")
      .single();

    if (error) throw error;

    const inviteUrl = `${new URL(request.url).origin}/join/${token}`;
    let emailSent = false;
    let emailMessage = "";
    if (parsed.data.email) {
      const admin = getSupabaseAdminClient();
      const { error: emailError } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
        redirectTo: inviteUrl,
        data: {
          dealership_id: parsed.data.dealershipId,
          dealership_role: parsed.data.role,
        },
      });
      emailSent = !emailError;
      emailMessage = emailError
        ? "The invite link was created, but Supabase could not send the email. You can copy and share the link below."
        : `Invite email sent to ${parsed.data.email}.`;
    }

    return NextResponse.json({
      invite: data,
      url: inviteUrl,
      emailSent,
      message: parsed.data.email ? emailMessage : "Invite link created.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: true,
        code: "INVITE_FAILED",
        message:
          error instanceof Error ? error.message : "Could not create this invite link.",
      },
      { status: 500 },
    );
  }
}
