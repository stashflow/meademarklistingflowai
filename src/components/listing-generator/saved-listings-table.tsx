"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  const [rows, setRows] = useState(listings);

  const filtered = useMemo(() => {
    return rows.filter((listing) => {
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
      return haystack.includes(query.toLowerCase()) && (status === "all" || listing.status === status);
    });
  }, [query, rows, status]);

  async function deleteListing(id: string) {
    const supabase = createSupabaseBrowserClient();
    const listing = rows.find((row) => row.id === id);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (!error) {
      await supabase.from("audit_logs").insert({
        dealership_id: listing?.dealership_id || null,
        actor_user_id: auth.user?.id || null,
        entity_type: "listing",
        entity_id: id,
        action: "deleted",
        before_data: listing || null,
      });
      setRows((current) => current.filter((listing) => listing.id !== id));
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
      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
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
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-md border border-white/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>VIN / Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((listing) => (
              <TableRow key={listing.id}>
                <TableCell>
                  <Link href={`/dashboard/saved-listings/${listing.id}`} className="font-medium hover:underline">
                    {[listing.year, listing.make, listing.model, listing.trim].filter(Boolean).join(" ") || "Untitled vehicle"}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {listing.vin || listing.input_data?.stockNumber || "Not provided"}
                </TableCell>
                <TableCell><Badge variant="outline" className="border-white/10">{listing.status}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{new Date(listing.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => duplicateListing(listing)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  {canDelete && (
                    <Button variant="ghost" size="icon" onClick={() => deleteListing(listing.id)}>
                      <Trash2 className="h-4 w-4 text-red-300" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
