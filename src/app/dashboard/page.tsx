import Link from "next/link";
import { AlertTriangle, Car, CheckCircle2, FileSpreadsheet, Gauge, Library, Palette, Plus, Search, ShieldAlert, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getDealershipContext } from "@/lib/permissions";
import { currentMonthKey, getPlanLimit } from "@/lib/generation/plans";
import { getListingDaysListed, scoreSavedListing } from "@/lib/listing-performance";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DealershipMember } from "@/types/dealership";
import type { SavedListing } from "@/types/listing";

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
        .select("*")
        .eq("dealership_id", dealership.id)
        .order("created_at", { ascending: false })
        .limit(100),
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

  const savedListingRows = ((listings || []) as SavedListing[]).filter((listing) => listing.status !== "archived");
  const scoredListings = savedListingRows.map((listing) => ({
    listing,
    performance: scoreSavedListing(listing),
    daysListed: getListingDaysListed(listing),
  }));
  const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  const generated = usage?.generation_count || 0;
  const limit = dealership.subscription_status === "trial"
    ? dealership.trial_generation_limit
    : getPlanLimit(dealership.subscription_status);
  const progressValue = limit === "unlimited" ? 100 : Math.min((generated / limit) * 100, 100);
  const teamMembers = (members || []) as unknown as DealershipMember[];
  const pendingReview = savedListingRows.filter((listing) => listing.status === "pending_review" || listing.approval_status === "pending_review").length;
  const highRisk = scoredListings.filter(({ performance }) => performance.riskFlags.some((flag) => flag.priority === "high")).length;
  const weakListings = scoredListings.filter(({ performance }) => performance.listingScore < 70).length;
  const missingKeyInfo = scoredListings.filter(({ performance }) => performance.missingFields.length > 0).length;
  const underperforming = scoredListings.filter(({ performance, daysListed }) => performance.leadPotentialScore < 70 || daysListed >= 30).length;
  const avgListingScore = average(scoredListings.map(({ performance }) => performance.listingScore));
  const avgComplianceScore = average(scoredListings.map(({ performance }) => performance.complianceScore));
  const estimatedMinutesSaved = savedListingRows.length * 18;
  const priorityListings = [...scoredListings]
    .sort((a, b) => a.performance.listingScore - b.performance.listingScore)
    .slice(0, 5);
  const metricCards: Array<[string, string | number, LucideIcon]> = [
    ["Active vehicles", savedListingRows.length, Car],
    ["Avg ListingFlow score", avgListingScore || "N/A", Gauge],
    ["Avg compliance score", avgComplianceScore || "N/A", ShieldAlert],
    ["Missing key info", missingKeyInfo, AlertTriangle],
    ["Weak listings", weakListings, Search],
    ["Likely underperforming", underperforming, TrendingUp],
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
              Monitor listing quality, compliance risk, search visibility, and lead potential across the dealership inventory.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="bg-primary text-primary-foreground hover:bg-red-500">
              <Link href="/dashboard/new-listing"><Plus className="h-4 w-4" /> New Listing</Link>
            </Button>
            <Button asChild variant="outline" className="border-white/10 bg-white/[.035]">
              <Link href="/dashboard/saved-listings"><Library className="h-4 w-4" /> Inventory Audit</Link>
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

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="app-card rounded-2xl border-white/10 bg-white/[.035] md:col-span-2">
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">Estimated staff time saved</div>
            <div className="mt-2 text-3xl font-semibold">
              {Math.floor(estimatedMinutesSaved / 60)}h {estimatedMinutesSaved % 60}m
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Based on generated listings and audit automation replacing manual rewrite/review passes.
            </p>
          </CardContent>
        </Card>
        <Card className="app-card rounded-2xl border-white/10 bg-white/[.035]">
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">Pending review</div>
            <div className="mt-2 text-3xl font-semibold">{pendingReview}</div>
            <p className="mt-2 text-sm text-muted-foreground">Listings waiting on approval workflow.</p>
          </CardContent>
        </Card>
        <Card className="app-card rounded-2xl border-white/10 bg-white/[.035]">
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">High-risk claims</div>
            <div className="mt-2 text-3xl font-semibold">{highRisk}</div>
            <p className="mt-2 text-sm text-muted-foreground">Fix these before publishing.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="app-card rounded-2xl border-white/10">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Platform Readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>Average ListingFlow score</span>
                <span>{avgListingScore || 0}/100</span>
              </div>
              <Progress value={avgListingScore} />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>Average compliance score</span>
                <span>{avgComplianceScore || 0}/100</span>
              </div>
              <Progress value={avgComplianceScore} />
            </div>
            <p className="text-sm text-muted-foreground">
              The score combines vehicle completeness, SEO, conversion copy, platform fit, and claim safety.
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
            <CardTitle className="font-display text-2xl">Listings Needing Attention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {priorityListings.length ? priorityListings.map(({ listing, performance }) => (
              <Link
                key={listing.id}
                href={`/dashboard/saved-listings/${listing.id}`}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[.035] p-4 text-sm transition hover:border-white/22 hover:bg-white/[.06]"
              >
                <div>
                  <span className="font-medium">{[listing.year, listing.make, listing.model, listing.trim].filter(Boolean).join(" ") || "Untitled listing"}</span>
                  <p className="mt-1 text-xs text-muted-foreground">{performance.recommendedAction}</p>
                </div>
                <Badge variant="outline" className="border-white/10">{performance.listingScore}/100</Badge>
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
            <div className="rounded-lg border border-white/10 bg-white/[.035] p-4 text-sm text-muted-foreground">
              Usage this month: {generated} / {limit === "unlimited" ? "unlimited" : limit}. Team members: {teamMembers.length}.
              <div className="mt-2"><Progress value={progressValue} /></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
