"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Archive, ArchiveRestore, CheckCircle2, Clipboard, Gauge, Save, Search, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import { CollapsibleSection } from "@/components/common/collapsible-section";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { scoreListingPerformance, scoreSavedListing } from "@/lib/listing-performance";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ListingImage, ListingOutput, ListingStatus, SavedListing } from "@/types/listing";

const tabs: Array<[keyof ListingOutput, string]> = [
  ["facebookListing", "Facebook"],
  ["carGurusListing", "CarGurus"],
  ["websiteDescription", "Website"],
  ["craigslistListing", "Craigslist"],
  ["autoTraderStyleDescription", "AutoTrader"],
  ["seoMetaDescription", "SEO"],
  ["disclaimer", "Notes"],
];

export function ListingDetailEditor({ listing, images = [], canDelete = false }: { listing: SavedListing; images?: ListingImage[]; canDelete?: boolean }) {
  const router = useRouter();
  const [output, setOutput] = useState<ListingOutput>(listing.generated_output);
  const [status, setStatus] = useState<ListingStatus>(listing.status);
  const [message, setMessage] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const performance = useMemo(() => (
    output === listing.generated_output
      ? scoreSavedListing(listing, images.length)
      : scoreListingPerformance(listing.input_data || {}, output, images.length, listing.days_listed || 0)
  ), [images.length, listing, output]);
  const scoreCards = [
    ["ListingFlow", performance.listingScore, Gauge],
    ["Compliance", performance.complianceScore, ShieldAlert],
    ["Lead Potential", performance.leadPotentialScore, Sparkles],
    ["Search Visibility", performance.searchVisibilityScore, Search],
  ] as const;
  const categoryScores = [
    ["Completeness", performance.completenessScore],
    ["SEO", performance.seoScore],
    ["Conversion", performance.conversionScore],
    ["Platform Fit", performance.platformScore],
    ["Compliance", performance.complianceScore],
  ] as const;

  async function save() {
    const supabase = createSupabaseBrowserClient();
    const { data: auth } = await supabase.auth.getUser();
    const refreshedPerformance = scoreListingPerformance(listing.input_data || {}, output, images.length, listing.days_listed || 0);
    const { error } = await supabase
      .from("listings")
      .update({
        generated_output: output,
        status,
        approval_status: status,
        quality_score: refreshedPerformance.listingScore,
        risk_level: output.claimRiskAudit?.riskLevel ?? "unknown",
        risk_summary: output.claimRiskAudit || {},
        listing_score: refreshedPerformance.listingScore,
        completeness_score: refreshedPerformance.completenessScore,
        seo_score: refreshedPerformance.seoScore,
        conversion_score: refreshedPerformance.conversionScore,
        platform_score: refreshedPerformance.platformScore,
        compliance_score: refreshedPerformance.complianceScore,
        lead_potential_score: refreshedPerformance.leadPotentialScore,
        search_visibility_score: refreshedPerformance.searchVisibilityScore,
        missing_fields: refreshedPerformance.missingFields,
        risk_flags: refreshedPerformance.riskFlags,
        suggested_fixes: refreshedPerformance.suggestedFixes,
        photo_checklist: refreshedPerformance.photoChecklist,
        last_optimized_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", listing.id);
    if (!error) {
      await supabase.from("audit_logs").insert({
        dealership_id: listing.dealership_id,
        actor_user_id: auth.user?.id || null,
        entity_type: "listing",
        entity_id: listing.id,
        action: "updated",
        before_data: { status: listing.status },
        after_data: { status, riskLevel: output.claimRiskAudit?.riskLevel || "unknown", listingScore: refreshedPerformance.listingScore },
      });
    }
    setMessage(error ? error.message : "Listing updated.");
  }

  async function archive(archived: boolean) {
    const supabase = createSupabaseBrowserClient();
    const { data: auth } = await supabase.auth.getUser();
    const nextStatus = archived ? "archived" : "draft";
    const { error } = await supabase
      .from("listings")
      .update({
        status: nextStatus,
        approval_status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", listing.id);
    if (!error) {
      await supabase.from("audit_logs").insert({
        dealership_id: listing.dealership_id,
        actor_user_id: auth.user?.id || null,
        entity_type: "listing",
        entity_id: listing.id,
        action: archived ? "archived" : "unarchived",
        before_data: { status },
        after_data: { status: nextStatus },
      });
      setStatus(nextStatus);
      setMessage(archived ? "Listing archived." : "Listing restored as a draft.");
      router.refresh();
      return;
    }
    setMessage(error.message);
  }

  async function deleteListing() {
    const supabase = createSupabaseBrowserClient();
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("listings").delete().eq("id", listing.id);
    if (!error) {
      await supabase.from("audit_logs").insert({
        dealership_id: listing.dealership_id,
        actor_user_id: auth.user?.id || null,
        entity_type: "listing",
        entity_id: listing.id,
        action: "deleted",
        before_data: listing,
      });
      router.push("/dashboard/saved-listings");
      router.refresh();
      return;
    }
    setMessage(error.message);
  }

  function update(key: keyof ListingOutput, value: string) {
    setOutput({
      ...output,
      [key]: key === "highlights" || key === "features" || key === "reviewWarnings"
        ? value.split("\n").filter(Boolean)
        : value,
    });
  }

  return (
    <Card className="app-card">
      <CardHeader>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <CardTitle>{output.title || [listing.year, listing.make, listing.model].filter(Boolean).join(" ")}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select value={status} onValueChange={(value) => value && setStatus(value as ListingStatus)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_review">Pending review</SelectItem>
                <SelectItem value="changes_requested">Changes requested</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="border-white/10 bg-white/[.035]" onClick={() => archive(status !== "archived")}>
              {status === "archived" ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              {status === "archived" ? "Restore" : "Archive"}
            </Button>
            {canDelete && (
              <Button variant="outline" className="border-red-500/25 bg-red-500/10 text-red-100 hover:bg-red-500/15" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
            <Button onClick={save} className="bg-primary hover:bg-red-700"><Save className="h-4 w-4" /> Save</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {message && <p className="mb-4 text-sm text-muted-foreground">{message}</p>}
        <div className="mb-5 grid gap-3 md:grid-cols-4">
          {scoreCards.map(([label, value, Icon]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/[.035] p-4">
              <div className="mb-3 flex items-center justify-between">
                <Icon className="h-4 w-4 text-primary" />
                <Badge variant="outline" className="border-white/10">{value}/100</Badge>
              </div>
              <div className="text-sm font-semibold">{label}</div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mb-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <CollapsibleSection title="Optimization Plan" description={performance.recommendedAction}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">Next best action</div>
                <div className="text-sm text-muted-foreground">Prioritized fixes for staff review.</div>
              </div>
              <Badge className={performance.listingScore >= 80 ? "bg-emerald-500/15 text-emerald-100" : "bg-amber-500/15 text-amber-100"}>
                {performance.listingScore >= 80 ? "Ready" : "Needs work"}
              </Badge>
            </div>
            <div className="space-y-2">
              {performance.suggestedFixes.slice(0, 5).map((fix) => (
                <div key={fix.id} className="rounded-lg border border-white/10 bg-black/15 p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4 text-amber-200" />
                    {fix.label}
                  </div>
                  <p className="mt-1 text-muted-foreground">{fix.detail}</p>
                </div>
              ))}
              {!performance.suggestedFixes.length && (
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">
                  No major copy fixes found. Keep facts verified before publishing.
                </div>
              )}
            </div>
          </CollapsibleSection>
          <CollapsibleSection title="Score Breakdown" description="Completeness, SEO, conversion, platform fit, and risk safety.">
            <div className="space-y-3">
              {categoryScores.map(([label, value]) => (
                <div key={label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>{label}</span>
                    <span className="text-muted-foreground">{value}/100</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-white" style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        </div>
        {!!images.length && (
          <div className="mb-5 grid gap-3 md:grid-cols-4">
            {images.map((image) => (
              image.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={image.id}
                  src={image.image_url}
                  alt={image.alt_text || "Vehicle image"}
                  className="aspect-[4/3] rounded-xl border border-white/10 object-cover"
                />
              ) : null
            ))}
          </div>
        )}
        {output.claimRiskAudit && (
          <div className="mb-5 rounded-xl border border-white/10 bg-white/[.035] p-4">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-semibold">Claim Risk Auditor</div>
                  <div className="text-sm text-muted-foreground">
                    Score {output.claimRiskAudit.score}/100 · {output.claimRiskAudit.riskClaims.length} risky claims found
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="border-white/10">{output.claimRiskAudit.riskLevel}</Badge>
            </div>
          </div>
        )}
        <div className="mb-5 grid gap-4 xl:grid-cols-3">
          <CollapsibleSection title="Missing Facts" defaultOpen={performance.missingFields.length > 0}>
            <div className="space-y-2 text-sm text-muted-foreground">
              {performance.missingFields.slice(0, 6).map((item) => <p key={item.id}>{item.label}: {item.detail}</p>)}
              {!performance.missingFields.length && <p className="text-emerald-100">Core vehicle facts look complete.</p>}
            </div>
          </CollapsibleSection>
          <CollapsibleSection title="Risk Flags" defaultOpen={performance.riskFlags.length > 0}>
            <div className="space-y-2 text-sm text-muted-foreground">
              {performance.riskFlags.slice(0, 6).map((item) => <p key={item.id}>{item.label}: {item.detail}</p>)}
              {!performance.riskFlags.length && <p className="text-emerald-100">No unsupported high-risk claims detected.</p>}
            </div>
          </CollapsibleSection>
          <CollapsibleSection title="Photo Checklist" defaultOpen={performance.photoChecklist.some((item) => !item.complete)}>
            <div className="space-y-2 text-sm">
              {performance.photoChecklist.map((item) => (
                <div key={item.id} className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle2 className={`mt-0.5 h-4 w-4 ${item.complete ? "text-emerald-300" : "text-zinc-600"}`} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        </div>
        <Tabs defaultValue="facebookListing">
          <TabsList className="grid grid-cols-7">
            {tabs.map(([key, label]) => <TabsTrigger key={key} value={key}>{label}</TabsTrigger>)}
          </TabsList>
          {tabs.map(([key, label]) => {
            const value = output[key];
            const text = Array.isArray(value) ? value.join("\n") : String(value || "");
            return (
              <TabsContent key={key} value={key} className="space-y-4 pt-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{label}</h3>
                  <Button variant="outline" className="border-white/10 bg-white/5" onClick={() => navigator.clipboard.writeText(text)}>
                    <Clipboard className="h-4 w-4" /> Copy
                  </Button>
                </div>
                <Textarea rows={16} value={text} onChange={(event) => update(key, event.target.value)} />
              </TabsContent>
            );
          })}
        </Tabs>
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent className="border border-red-500/25 bg-[#0B0D10]">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this listing permanently?</AlertDialogTitle>
              <AlertDialogDescription>
                Archiving is safer for sold or inactive inventory. Delete only if this record should be removed from the dealership library.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 text-white hover:bg-red-500" onClick={deleteListing}>
                Delete listing
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
