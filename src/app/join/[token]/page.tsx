import Link from "next/link";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { BrandMark } from "@/components/common/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function JoinInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let title = "Invite link accepted";
  let message = "You have joined the dealership workspace.";
  let ok = true;

  if (!user) {
    title = "Log in to accept invite";
    message = "Create an account or log in first, then reopen this invite link.";
    ok = false;
  } else {
    const { data: invite } = await supabase
      .from("dealership_invites")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    // Server-only invite validation needs wall-clock time for expiry.
    // eslint-disable-next-line react-hooks/purity
    const expired = invite?.expires_at && new Date(invite.expires_at).getTime() < Date.now();
    if (!invite || invite.used_at || expired) {
      title = "Invalid invite link";
      message = "This invite link is invalid, expired, or already used.";
      ok = false;
    } else {
      await supabase.from("dealership_members").upsert(
        {
          dealership_id: invite.dealership_id,
          user_id: user.id,
          role: invite.role || "staff",
          status: "active",
        },
        { onConflict: "dealership_id,user_id" },
      );
      await supabase
        .from("profiles")
        .update({ active_dealership_id: invite.dealership_id })
        .eq("user_id", user.id);
      await supabase
        .from("dealership_invites")
        .update({ used_at: new Date().toISOString() })
        .eq("id", invite.id);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-6 py-8">
      <BrandMark />
      <Card className="app-card mt-10">
        <CardHeader>
          <div className="mb-4 rounded-md border border-white/10 bg-white/5 p-3">
            {ok ? <CheckCircle2 className="h-6 w-6 text-emerald-300" /> : <ShieldAlert className="h-6 w-6 text-primary" />}
          </div>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm leading-6 text-muted-foreground">{message}</p>
          <Button asChild className="bg-primary hover:bg-red-700">
            <Link href={ok ? "/dashboard" : "/login"}>{ok ? "Open dashboard" : "Log in"}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
