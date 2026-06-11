import Link from "next/link";
import { AlertTriangle, Car, CheckCircle2, FileSpreadsheet, Library, Palette, Plus, ShieldAlert, Sparkles, Users, type LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getDealershipContext } from "@/lib/permissions";
import { currentMonthKey, getPlanLimit } from "@/lib/generation/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DealershipMember } from "@/types/dealership";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { profile, dealership, member } = await getDealershipContext(supabase, user.id);

  if (!profile?.onboarding_completed) {
    return (
      <main className="p-6">
        <EmptyState
          icon={Palette}
          title="Continue onboarding"
          description="Finish dealership setup and style learning before generating production-ready listings."
          action={<Button asChild className="bg-primary hover:bg-red-700"><Link href="/onboarding">Continue onboarding</Link></Button>}
        />
      </main>
    );
  }

  if (!dealership || !member) {
    return (
      <main className="p-6">
        <EmptyState
          icon={Users}
          title="No dealership workspace"
          description="Create a dealership workspace, use an invite link, or request to join an existing dealership."
          action={<Button asChild className="bg-primary hover:bg-red-700"><Link href="/onboarding">Set up workspace</Link></Button>}
        />
      </main>
    );
  }

  const monthKey = currentMonthKey();
  const [{ data: usage }, { data: listings }, { data: members }, { data: styleProfile }] =
    await Promise.all([
      supabase
        .from("generation_usage")
        .select("*")
        .eq("dealership_id", dealership.id)
        .eq("month_key", monthKey)
        .maybeSingle(),
      supabase
        .from("listings")
        .select("id,title:year,year,make,model,status,approval_status,risk_level,created_at")
        .eq("dealership_id", dealership.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("dealership_members")
        .select("id,role,status,profiles(full_name,email)")
        .eq("dealership_id", dealership.id)
        .eq("status", "active")
        .limit(5),
      supabase
        .from("dealership_style_profiles")
        .select("*")
        .eq("dealership_id", dealership.id)
        .maybeSingle(),
    ]);

  const savedListingRows = (listings || []) as Array<{ risk_level?: string | null; status?: string | null; approval_status?: string | null }>;
  const generated = usage?.generation_count || 0;
  const limit = dealership.subscription_status === "trial"
    ? dealership.trial_generation_limit
    : getPlanLimit(dealership.subscription_status);
  const progressValue = limit === "unlimited" ? 100 : Math.min((generated / limit) * 100, 100);
  const teamMembers = (members || []) as unknown as DealershipMember[];
  const pendingReview = savedListingRows.filter((listing) => listing.status === "pending_review" || listing.approval_status === "pending_review").length;
  const highRisk = savedListingRows.filter((listing) => listing.risk_level === "high").length;
  const metricCards: Array<[string, string | number, LucideIcon]> = [
    ["Listings generated this month", generated, Car],
    ["Plan limit", limit === "unlimited" ? "Unlimited" : `${limit}/month`, Plus],
    ["Saved listings", listings?.length || 0, Library],
    ["Pending review", pendingReview, CheckCircle2],
    ["High-risk claim checks", highRisk, ShieldAlert],
    ["Active team members", teamMembers.length, Users],
  ];

  return (
    <main className="space-y-6 p-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-[#0F1218]/95 p-6 shadow-[0_28px_90px_rgba(0,0,0,.32)]">
        <div className="industrial-grid absolute inset-0 opacity-20" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/80 to-transparent" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <Badge className="mb-4 border-red-500/30 bg-red-500/10 text-red-100">
              {dealership.subscription_status.replaceAll("_", " ")}
            </Badge>
            <h1 className="font-display text-4xl font-black leading-tight md:text-5xl">{dealership.name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Generate accurate listings, review risk claims, and move inventory copy into the shared dealership library.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="bg-primary text-primary-foreground hover:bg-red-500">
              <Link href="/dashboard/new-listing"><Plus className="h-4 w-4" /> New Listing</Link>
            </Button>
            <Button asChild variant="outline" className="border-white/10 bg-white/[.035]">
              <Link href="/dashboard/style-library"><Sparkles className="h-4 w-4" /> Style Library</Link>
            </Button>
            <Button asChild variant="outline" className="border-white/10 bg-white/[.035]">
              <Link href="/dashboard/bulk-intake"><FileSpreadsheet className="h-4 w-4" /> Bulk Intake</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {metricCards.map(([label, value, Icon]) => (
          <Card key={label} className="app-card overflow-hidden rounded-2xl border-white/10 bg-white/[.035]">
            <CardContent className="p-5">
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#0B0D10]">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="text-2xl font-semibold">{String(value)}</div>
              <div className="mt-1 text-sm text-muted-foreground">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="app-card rounded-2xl border-white/10">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Plan usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>{generated} generations used</span>
              <span>{limit === "unlimited" ? "Unlimited" : `${limit} monthly limit`}</span>
            </div>
            <Progress value={progressValue} />
            <p className="text-sm text-muted-foreground">
              Usage is enforced server-side per dealership workspace and follows the active plan.
            </p>
          </CardContent>
        </Card>

        <Card className="app-card rounded-2xl border-white/10">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Style profile</CardTitle>
          </CardHeader>
          <CardContent>
            {styleProfile ? (
              <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                <p>{styleProfile.voice_summary}</p>
                <Button variant="outline" asChild className="border-white/10 bg-white/5">
                  <Link href="/dashboard/style-library">Review style profile</Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No saved style profile yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="app-card rounded-2xl border-white/10">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Recent saved listings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {listings?.length ? listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/dashboard/saved-listings/${listing.id}`}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[.035] p-4 text-sm transition hover:border-white/22 hover:bg-white/[.06]"
              >
                <span>{[listing.year, listing.make, listing.model].filter(Boolean).join(" ") || "Untitled listing"}</span>
                <Badge variant="outline" className="border-white/10">{listing.status}</Badge>
              </Link>
            )) : <p className="text-sm text-muted-foreground">No saved listings yet.</p>}
          </CardContent>
        </Card>

        <Card className="app-card rounded-2xl border-white/10">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Team preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teamMembers.map((teamMember) => (
              <div key={teamMember.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[.035] p-4 text-sm">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  <span>{teamMember.profiles?.full_name || teamMember.profiles?.email || "Team member"}</span>
                </div>
                <Badge variant="outline" className="border-white/10">{teamMember.role}</Badge>
              </div>
            ))}
            {!teamMembers.length && (
              <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                <AlertTriangle className="mb-2 h-4 w-4" />
                Add team members so saved listings and review work are shared across the dealership.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
