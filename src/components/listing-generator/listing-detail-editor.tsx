"use client";

import { useState } from "react";
import { Clipboard, Save, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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

export function ListingDetailEditor({ listing, images = [] }: { listing: SavedListing; images?: ListingImage[] }) {
  const [output, setOutput] = useState<ListingOutput>(listing.generated_output);
  const [status, setStatus] = useState<ListingStatus>(listing.status);
  const [message, setMessage] = useState("");

  async function save() {
    const supabase = createSupabaseBrowserClient();
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("listings")
      .update({
        generated_output: output,
        status,
        approval_status: status,
        quality_score: output.claimRiskAudit?.score ?? null,
        risk_level: output.claimRiskAudit?.riskLevel ?? "unknown",
        risk_summary: output.claimRiskAudit || {},
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
        after_data: { status, riskLevel: output.claimRiskAudit?.riskLevel || "unknown" },
      });
    }
    setMessage(error ? error.message : "Listing updated.");
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
          <div className="flex gap-2">
            <Select value={status} onValueChange={(value) => value && setStatus(value as ListingStatus)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_review">Pending review</SelectItem>
                <SelectItem value="changes_requested">Changes requested</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={save} className="bg-primary hover:bg-red-700"><Save className="h-4 w-4" /> Save</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {message && <p className="mb-4 text-sm text-muted-foreground">{message}</p>}
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
      </CardContent>
    </Card>
  );
}
