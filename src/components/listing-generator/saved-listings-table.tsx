"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Archive, ArchiveRestore, Copy, Search, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getListingDaysListed, scoreSavedListing } from "@/lib/listing-performance";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SavedListing } from "@/types/listing";

export function SavedListingsTable({
  listings,
  canDelete,
}: {
  listings: SavedListing[];
  canDelete: boolean;
}) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState("all");
  const [auditFilter, setAuditFilter] = useState("all");
  const [rows, setRows] = useState(listings);
  const [message, setMessage] = useState("");
  const [pendingDelete, setPendingDelete] = useState<SavedListing | null>(null);

  const inventorySummary = useMemo(() => {
    const scored = rows.map((listing) => ({ listing, performance: scoreSavedListing(listing) }));
    return {
      active: rows.filter((listing) => listing.status !== "archived").length,
      archived: rows.filter((listing) => listing.status === "archived").length,
      weak: scored.filter(({ performance }) => performance.listingScore < 70).length,
      risk: scored.filter(({ performance }) => performance.riskFlags.some((flag) => flag.priority === "high")).length,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((listing) => {
      const performance = scoreSavedListing(listing);
      const daysListed = getListingDaysListed(listing);
      const haystack = [
        listing.vin,
        listing.year,
        listing.make,
        listing.model,
        listing.trim,
        listing.input_data?.stockNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesAuditFilter =
        auditFilter === "all" ||
        (auditFilter === "score_below_70" && performance.listingScore < 70) ||
        (auditFilter === "high_risk" && performance.riskFlags.some((flag) => flag.priority === "high")) ||
        (auditFilter === "missing_photos" && performance.photoChecklist.some((item) => !item.complete)) ||
        (auditFilter === "weak_seo" && performance.seoScore < 70) ||
        (auditFilter === "no_cta" && performance.suggestedFixes.some((fix) => fix.id === "cta")) ||
        (auditFilter === "missing_trim" && performance.missingFields.some((field) => field.id === "trim")) ||
        (auditFilter === "stale" && daysListed >= 30) ||
        (auditFilter === "needs_rewrite" && performance.conversionScore < 70);
      return haystack.includes(query.toLowerCase()) && (status === "all" || listing.status === status) && matchesAuditFilter;
    }).sort((a, b) => scoreSavedListing(a).listingScore - scoreSavedListing(b).listingScore);
  }, [auditFilter, query, rows, status]);

  async function archiveListing(listing: SavedListing, archived: boolean) {
    setMessage("");
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
    if (error) {
      setMessage(error.message);
      return;
    }
    await supabase.from("audit_logs").insert({
      dealership_id: listing.dealership_id,
      actor_user_id: auth.user?.id || null,
      entity_type: "listing",
      entity_id: listing.id,
      action: archived ? "archived" : "unarchived",
      before_data: { status: listing.status },
      after_data: { status: nextStatus },
    });
    setRows((current) => current.map((row) => row.id === listing.id ? { ...row, status: nextStatus, approval_status: nextStatus } : row));
    setMessage(archived ? "Listing archived. It is hidden from active inventory metrics." : "Listing restored as a draft.");
  }

  async function deleteListing(listing: SavedListing) {
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
        before_data: listing || null,
      });
      setRows((current) => current.filter((row) => row.id !== listing.id));
      setPendingDelete(null);
      setMessage("Listing permanently deleted.");
    } else {
      setMessage(error.message);
    }
  }

  async function duplicateListing(listing: SavedListing) {
    const supabase = createSupabaseBrowserClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const copy = {
      ...listing,
      id: undefined,
      created_by: auth.user.id,
      status: "draft",
      approval_status: "draft",
      internal_notes: `Duplicated from ${listing.id}`,
    };
    const { data } = await supabase.from("listings").insert(copy).select("*").single();
    if (data) {
      await supabase.from("audit_logs").insert({
        dealership_id: listing.dealership_id,
        actor_user_id: auth.user.id,
        entity_type: "listing",
        entity_id: data.id,
        action: "duplicated",
        metadata: { sourceListingId: listing.id },
      });
      setRows((current) => [data, ...current]);
    }
  }

  return (
    <div className="space-y-4">
      {message && <p className="rounded-lg border border-white/10 bg-white/[.035] px-3 py-2 text-sm text-muted-foreground">{message}</p>}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Active", inventorySummary.active],
          ["Archived", inventorySummary.archived],
          ["Weak", inventorySummary.weak],
          ["High risk", inventorySummary.risk],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/[.035] p-3">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
            <div className="mt-1 text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>
      <CollapsibleSection title="Search and Filters" description="Collapse this once your audit view is dialed in.">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_240px]">
          <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search VIN, stock number, year, make, model"
              className="border-0 bg-transparent"
            />
          </div>
          <Select value={status} onValueChange={(value) => value && setStatus(value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending_review">Pending review</SelectItem>
              <SelectItem value="changes_requested">Changes requested</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={auditFilter} onValueChange={(value) => value && setAuditFilter(value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All audit filters</SelectItem>
              <SelectItem value="score_below_70">Score below 70</SelectItem>
              <SelectItem value="high_risk">High-risk claims</SelectItem>
              <SelectItem value="missing_photos">Missing photos</SelectItem>
              <SelectItem value="weak_seo">Weak SEO</SelectItem>
              <SelectItem value="no_cta">No CTA</SelectItem>
              <SelectItem value="missing_trim">Missing trim</SelectItem>
              <SelectItem value="stale">Stale listing</SelectItem>
              <SelectItem value="needs_rewrite">Needs rewrite</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CollapsibleSection>

      <div className="overflow-hidden rounded-md border border-white/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Compliance</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Search</TableHead>
              <TableHead>Issues</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((listing) => {
              const performance = scoreSavedListing(listing);
              const daysListed = getListingDaysListed(listing);
              const issueCount = performance.missingFields.length + performance.riskFlags.length + performance.suggestedFixes.length;
              return (
                <TableRow key={listing.id}>
                  <TableCell className="min-w-56">
                    <Link href={`/dashboard/saved-listings/${listing.id}`} className="font-medium hover:underline">
                      {[listing.year, listing.make, listing.model, listing.trim].filter(Boolean).join(" ") || "Untitled vehicle"}
                    </Link>
                    <div className="mt-1 text-xs text-muted-foreground">{listing.vin || listing.input_data?.stockNumber || "No VIN/stock"}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{listing.price ? `$${listing.price.toLocaleString()}` : "Missing"}</TableCell>
                  <TableCell className="text-muted-foreground">{daysListed}</TableCell>
                  <TableCell><ScoreBadge value={performance.listingScore} /></TableCell>
                  <TableCell><ScoreBadge value={performance.complianceScore} /></TableCell>
                  <TableCell><ScoreBadge value={performance.leadPotentialScore} /></TableCell>
                  <TableCell><ScoreBadge value={performance.searchVisibilityScore} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {issueCount > 0 && <AlertTriangle className="h-4 w-4 text-amber-200" />}
                      <span>{issueCount ? `${issueCount} fixes` : "Clean"}</span>
                    </div>
                    <div className="mt-1 max-w-48 truncate text-xs text-muted-foreground">{performance.recommendedAction}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="border-white/10">{listing.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => duplicateListing(listing)} title="Duplicate listing">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => archiveListing(listing, listing.status !== "archived")}
                      title={listing.status === "archived" ? "Restore listing" : "Archive listing"}
                    >
                      {listing.status === "archived"
                        ? <ArchiveRestore className="h-4 w-4 text-emerald-200" />
                        : <Archive className="h-4 w-4 text-zinc-300" />}
                    </Button>
                    {canDelete && (
                      <Button variant="ghost" size="icon" onClick={() => setPendingDelete(listing)} title="Delete permanently">
                        <Trash2 className="h-4 w-4 text-red-300" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent className="border border-red-500/25 bg-[#0B0D10]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this listing permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              Archiving is safer for old inventory. Delete only if this listing was created by mistake and should be removed from the dealership library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 text-white hover:bg-red-500" onClick={() => pendingDelete && deleteListing(pendingDelete)}>
              Delete listing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ScoreBadge({ value }: { value: number }) {
  const className = value >= 80
    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
    : value >= 65
      ? "border-amber-400/25 bg-amber-400/10 text-amber-100"
      : "border-red-400/25 bg-red-400/10 text-red-100";
  return <Badge variant="outline" className={className}>{value}</Badge>;
}
