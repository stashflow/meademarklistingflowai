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
    const { data, error } = await supabase.rpc("accept_dealership_invite", {
      invite_token: token,
    });
    const accepted = Array.isArray(data) ? data[0] : null;
    if (error || !accepted) {
      title = "Invalid invite link";
      message = error?.message?.includes("already used")
        ? "This invite has already been used by another account."
        : error?.message?.includes("expired")
          ? "This invite link has expired. Ask the dealership to send a new one."
          : "This invite link is invalid.";
      ok = false;
    } else {
      message = `You now have access to ${accepted.dealership_name}.`;
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
