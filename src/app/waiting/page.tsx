import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrandMark } from "@/components/common/brand-mark";
import { JoinWaiter } from "@/components/onboarding/join-waiter";

export const dynamic = "force-dynamic";

export default async function WaitingPage({
  searchParams,
}: {
  searchParams: Promise<{ dealershipId?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect("/login?next=/waiting");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_dealership_id,full_name,email")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (profile?.active_dealership_id) {
    redirect("/dashboard");
  }

  const requestQuery = supabase
    .from("join_requests")
    .select("id,status,message,created_at,dealership_id")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });
  const { data: requests } = params.dealershipId
    ? await requestQuery.eq("dealership_id", params.dealershipId).limit(1)
    : await requestQuery.eq("status", "pending").limit(1);

  const request = requests?.[0] || null;
  const { data: dealership } = request
    ? await supabase.from("dealerships").select("name").eq("id", request.dealership_id).maybeSingle()
    : { data: null };

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <BrandMark />
        <Card className="app-card overflow-hidden border-white/12">
          <div className="h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
          <CardHeader>
            <Badge className="mb-2 w-fit border-red-500/30 bg-red-500/10 text-red-100">Waiting room</Badge>
            <CardTitle className="font-display text-3xl">Your request is pending</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-6 text-muted-foreground">
              {request
                ? `We’re waiting for approval to join ${dealership?.name || "that dealership"}.`
                : "You do not have an active pending request yet, but you can still wait here while your dealership access is reviewed."}
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-muted-foreground">Current status</div>
                <div className="mt-2 text-lg font-semibold">{request?.status || "pending"}</div>
              </div>
              <div className="rounded-md border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-muted-foreground">Requested at</div>
                <div className="mt-2 text-lg font-semibold">
                  {request?.created_at ? new Date(request.created_at).toLocaleString() : "Now"}
                </div>
              </div>
            </div>
            <JoinWaiter dealershipId={params.dealershipId || request?.dealership_id || null} />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="bg-primary hover:bg-red-700">
                <Link href="/onboarding"><Plus className="h-4 w-4" /> Create a new dealership</Link>
              </Button>
              <Button asChild variant="outline" className="border-white/10 bg-white/5">
                <Link href="/dashboard"><RefreshCw className="h-4 w-4" /> Refresh dashboard access</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              When the owner approves your request, this page will redirect you automatically.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
