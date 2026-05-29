"use client";

import { useState } from "react";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { DealershipStyleProfile } from "@/types/style-profile";

export function StyleLibraryManager({
  dealershipId,
  profile,
  examples,
}: {
  dealershipId: string;
  profile: DealershipStyleProfile | null;
  examples: Array<{ id: string; title: string; platform: string | null; notes: string | null; example_text: string }>;
}) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState(examples);

  async function addExample(formData: FormData) {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data: auth } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("style_examples")
      .insert({
        dealership_id: dealershipId,
        created_by: auth.user?.id,
        title: formData.get("title"),
        platform: formData.get("platform"),
        notes: formData.get("notes"),
        example_text: formData.get("exampleText"),
      })
      .select("*")
      .single();
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setRows((current) => [data, ...current]);
    setMessage("Style example added.");
  }

  async function reanalyze() {
    setLoading(true);
    const response = await fetch("/api/style/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealershipId,
        save: true,
        answers: {
          oldListings: rows.map((row) => `${row.title}\n${row.example_text}`).join("\n\n"),
          styleInstructions: rows.map((row) => row.notes).filter(Boolean).join("\n"),
        },
      }),
    });
    const payload = await response.json();
    setLoading(false);
    setMessage(response.ok ? "Style profile re-analyzed and saved." : payload.message || "Style analysis failed.");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="app-card">
        <CardHeader>
          <CardTitle>Current AI style summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
          <p>{profile?.ai_style_summary || "No style profile has been saved yet."}</p>
          <div className="rounded-md border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase text-muted-foreground">Voice</div>
            <p className="mt-2">{profile?.voice_summary || "Not analyzed"}</p>
          </div>
          <Button onClick={reanalyze} disabled={loading || rows.length === 0} className="bg-primary hover:bg-red-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Re-analyze style profile
          </Button>
          {message && <p>{message}</p>}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="app-card">
          <CardHeader>
            <CardTitle>Add style example</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addExample} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input name="title" required placeholder="2019 F-150 Facebook example" />
                </div>
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Input name="platform" placeholder="Facebook, website, Craigslist..." />
                </div>
              </div>
              <Textarea name="exampleText" rows={6} required placeholder="Paste old listing example" />
              <Textarea name="notes" placeholder="Notes about writing preferences, banned phrases, CTAs..." />
              <Button disabled={loading} className="bg-primary hover:bg-red-700"><Plus className="h-4 w-4" /> Add example</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="app-card">
          <CardHeader><CardTitle>Style examples</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {rows.map((row) => (
              <div key={row.id} className="rounded-md border border-white/10 bg-white/5 p-4">
                <div className="font-medium">{row.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{row.platform || "No platform"} {row.notes ? ` · ${row.notes}` : ""}</div>
              </div>
            ))}
            {rows.length === 0 && <p className="text-sm text-muted-foreground">No style examples added yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
