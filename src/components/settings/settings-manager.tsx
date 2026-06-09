"use client";

import { useState } from "react";
import { Bell, Database, Gauge, Monitor, Save, Sparkles, Wand2, Zap } from "lucide-react";
import { useMotionPreference, type MotionPreference } from "@/components/common/motion-preferences";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Dealership, Profile } from "@/types/dealership";
import type { DealershipStyleProfile } from "@/types/style-profile";

export function SettingsManager({
  profile,
  dealership,
  styleProfile,
  canManageDealership,
}: {
  profile: Profile | null;
  dealership: Dealership | null;
  styleProfile: DealershipStyleProfile | null;
  canManageDealership: boolean;
}) {
  const [message, setMessage] = useState("");
  const { preference, setPreference } = useMotionPreference();
  const [animationPreference, setAnimationPreference] = useState<MotionPreference>(
    profile?.animation_preference || preference,
  );
  const [featureSettings, setFeatureSettings] = useState<Record<string, boolean>>({
    qualityScore: Boolean(profile?.feature_settings?.qualityScore ?? true),
    desktopNotifications: Boolean(profile?.feature_settings?.desktopNotifications ?? false),
    fastDraftMode: Boolean(profile?.feature_settings?.fastDraftMode ?? true),
    autoCopyLastOutput: Boolean(profile?.feature_settings?.autoCopyLastOutput ?? false),
  });
  const vinDataProvider = String(profile?.feature_settings?.vinDataProvider || "nhtsa");
  const [autoOpenFillIn, setAutoOpenFillIn] = useState(profile?.feature_settings?.autoOpenFillIn !== false);
  const [workspaceMode, setWorkspaceMode] = useState<"compact" | "manager">(
    profile?.feature_settings?.workspaceMode === "manager" ? "manager" : "compact",
  );
  const [listingDefaults, setListingDefaults] = useState({
    contactText: dealership?.listing_defaults?.contactText || "",
    defaultCTA: dealership?.listing_defaults?.defaultCTA || dealership?.default_cta || "",
    financingLanguage: dealership?.listing_defaults?.financingLanguage || "",
    warrantyLanguage: dealership?.listing_defaults?.warrantyLanguage || "",
  });
  const [platformSettings, setPlatformSettings] = useState({
    facebookTone: dealership?.listing_defaults?.platforms?.facebook?.tone || "friendly",
    facebookLength: dealership?.listing_defaults?.platforms?.facebook?.length || "standard",
    cargurusTone: dealership?.listing_defaults?.platforms?.cargurus?.tone || "professional",
    cargurusLength: dealership?.listing_defaults?.platforms?.cargurus?.length || "standard",
    websiteTone: dealership?.listing_defaults?.platforms?.website?.tone || "professional",
    websiteLength: dealership?.listing_defaults?.platforms?.website?.length || "detailed",
  });

  async function saveAccount(formData: FormData) {
    const supabase = createSupabaseBrowserClient();
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: formData.get("fullName"), updated_at: new Date().toISOString() })
      .eq("user_id", auth.user?.id);
    setMessage(error ? error.message : "Account settings saved.");
  }

  async function saveExperience() {
    const supabase = createSupabaseBrowserClient();
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("profiles")
      .update({
        animation_preference: animationPreference,
        feature_settings: {
          ...featureSettings,
          vinDataProvider,
          autoOpenFillIn,
          workspaceMode,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", auth.user?.id);

    if (!error) {
      setPreference(animationPreference);
    }

    setMessage(error ? error.message : "Experience settings saved.");
  }

  async function saveListingDefaults() {
    if (!dealership || !canManageDealership) return;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("dealerships")
      .update({
        listing_defaults: {
          ...listingDefaults,
          platforms: {
            facebook: { tone: platformSettings.facebookTone, length: platformSettings.facebookLength },
            cargurus: { tone: platformSettings.cargurusTone, length: platformSettings.cargurusLength },
            website: { tone: platformSettings.websiteTone, length: platformSettings.websiteLength },
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", dealership.id);
    setMessage(error ? error.message : "Listing defaults saved.");
  }

  async function saveDealership(formData: FormData) {
    if (!dealership) return;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("dealerships")
      .update({
        name: formData.get("name"),
        website: formData.get("website"),
        location: formData.get("location"),
        monthly_vehicle_volume: formData.get("monthlyVolume"),
        default_tone: formData.get("defaultTone"),
        default_cta: formData.get("defaultCta"),
        default_disclaimer: formData.get("defaultDisclaimer"),
        updated_at: new Date().toISOString(),
      })
      .eq("id", dealership.id);
    setMessage(error ? error.message : "Dealership settings saved.");
  }

  async function saveStyle(formData: FormData) {
    if (!dealership) return;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("dealership_style_profiles").upsert(
      {
        dealership_id: dealership.id,
        voice_summary: formData.get("voiceSummary"),
        ai_style_summary: formData.get("aiStyleSummary"),
        default_cta: formData.get("defaultCta"),
        default_disclaimer: formData.get("defaultDisclaimer"),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "dealership_id" },
    );
    setMessage(error ? error.message : "Style settings saved.");
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0E1117]">
      <header className="border-b border-white/8 px-5 py-5">
        <h1 className="font-display text-3xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Control dealership language, platform formatting, LF behavior, and your personal workspace.</p>
      </header>
      {message && <p className="mx-5 mt-5 rounded-xl border border-white/10 bg-white/[.03] p-3 text-sm text-muted-foreground">{message}</p>}
      <Tabs defaultValue="account" className="p-5">
        <TabsList className="grid h-auto grid-cols-2 gap-1 md:grid-cols-3 xl:grid-cols-6">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="dealership">Dealership Profile</TabsTrigger>
          <TabsTrigger value="defaults">Listing Defaults</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="lf">LF Behavior</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="pt-6">
          <form action={saveAccount} className="grid max-w-3xl gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Full name</Label><Input name="fullName" defaultValue={profile?.full_name || ""} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={profile?.email || ""} readOnly /></div>
            <Button className="w-fit bg-primary hover:bg-red-500 md:col-span-2"><Save className="h-4 w-4" /> Save account</Button>
          </form>
        </TabsContent>

        <TabsContent value="dealership" className="space-y-7 pt-6">
          <form action={saveDealership} className="grid gap-4 md:grid-cols-2">
            <Input name="name" disabled={!canManageDealership} defaultValue={dealership?.name || ""} placeholder="Dealership name" />
            <Input name="website" disabled={!canManageDealership} defaultValue={dealership?.website || ""} placeholder="Website" />
            <Input name="location" disabled={!canManageDealership} defaultValue={dealership?.location || ""} placeholder="Location" />
            <Input name="monthlyVolume" disabled={!canManageDealership} defaultValue={dealership?.monthly_vehicle_volume || ""} placeholder="Monthly volume" />
            <Input name="defaultTone" disabled={!canManageDealership} defaultValue={dealership?.default_tone || ""} placeholder="Default tone" />
            <Input name="defaultCta" disabled={!canManageDealership} defaultValue={dealership?.default_cta || ""} placeholder="Default CTA" />
            <Textarea name="defaultDisclaimer" disabled={!canManageDealership} defaultValue={dealership?.default_disclaimer || ""} placeholder="Default disclaimer" className="md:col-span-2" />
            <Button disabled={!canManageDealership} className="w-fit bg-primary hover:bg-red-500 md:col-span-2"><Save className="h-4 w-4" /> Save profile</Button>
          </form>
          <form action={saveStyle} className="grid gap-4 border-t border-white/8 pt-6 md:grid-cols-2">
            <Textarea name="voiceSummary" defaultValue={styleProfile?.voice_summary || ""} placeholder="Dealership voice summary" />
            <Textarea name="aiStyleSummary" defaultValue={styleProfile?.ai_style_summary || ""} placeholder="AI style summary" />
            <Input name="defaultCta" defaultValue={styleProfile?.default_cta || ""} placeholder="Style CTA" />
            <Textarea name="defaultDisclaimer" defaultValue={styleProfile?.default_disclaimer || ""} placeholder="Style disclaimer" />
            <Button className="w-fit bg-primary hover:bg-red-500 md:col-span-2"><Save className="h-4 w-4" /> Save writing style</Button>
          </form>
        </TabsContent>

        <TabsContent value="defaults" className="space-y-5 pt-6">
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">CTA and contact text can be suggested automatically. Warranty and financing language always require staff confirmation before generation.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Contact text</Label><Textarea value={listingDefaults.contactText} onChange={(event) => setListingDefaults((current) => ({ ...current, contactText: event.target.value }))} placeholder="Call, text, website, location, or appointment instructions" /></div>
            <div className="space-y-2"><Label>Default call to action</Label><Textarea value={listingDefaults.defaultCTA} onChange={(event) => setListingDefaults((current) => ({ ...current, defaultCTA: event.target.value }))} placeholder="Message us to confirm availability or schedule a test drive." /></div>
            <div className="space-y-2"><Label>Financing language</Label><Textarea value={listingDefaults.financingLanguage} onChange={(event) => setListingDefaults((current) => ({ ...current, financingLanguage: event.target.value }))} /></div>
            <div className="space-y-2"><Label>Warranty language</Label><Textarea value={listingDefaults.warrantyLanguage} onChange={(event) => setListingDefaults((current) => ({ ...current, warrantyLanguage: event.target.value }))} /></div>
          </div>
          <Button disabled={!canManageDealership} onClick={saveListingDefaults} className="bg-primary hover:bg-red-500"><Save className="h-4 w-4" /> Save defaults</Button>
        </TabsContent>

        <TabsContent value="platforms" className="pt-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {([
              ["facebook", "Facebook Marketplace"],
              ["cargurus", "CarGurus"],
              ["website", "Dealer Website"],
            ] as const).map(([key, title]) => (
              <div key={key} className="rounded-xl border border-white/10 bg-[#0B0D10] p-4">
                <div className="font-semibold">{title}</div>
                <div className="mt-4 space-y-3">
                  <div className="space-y-2">
                    <Label>Tone</Label>
                    <Select value={platformSettings[`${key}Tone`]} onValueChange={(value) => value && setPlatformSettings((current) => ({ ...current, [`${key}Tone`]: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="direct">Simple and direct</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="value">Value-focused</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Length</Label>
                    <Select value={platformSettings[`${key}Length`]} onValueChange={(value) => value && setPlatformSettings((current) => ({ ...current, [`${key}Length`]: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Short</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="detailed">Detailed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Button disabled={!canManageDealership} onClick={saveListingDefaults} className="mt-5 bg-primary hover:bg-red-500"><Save className="h-4 w-4" /> Save platform preferences</Button>
        </TabsContent>

        <TabsContent value="lf" className="space-y-5 pt-6">
          <div className="flex max-w-3xl items-start justify-between gap-5 rounded-xl border border-white/10 bg-[#0B0D10] p-4">
            <div className="flex gap-3">
              <Wand2 className="mt-1 h-5 w-5 text-primary" />
              <div><div className="font-semibold">Open LF Fill In when important details are missing</div><p className="mt-1 text-sm leading-6 text-muted-foreground">After VIN decode or partial vehicle entry, LF guides staff through trim, specifications, condition, and verified features.</p></div>
            </div>
            <Switch checked={autoOpenFillIn} onCheckedChange={(checked) => setAutoOpenFillIn(Boolean(checked))} />
          </div>
          <div className="grid max-w-3xl gap-3 md:grid-cols-2">
            {(["compact", "manager"] as const).map((mode) => (
              <button key={mode} type="button" onClick={() => setWorkspaceMode(mode)} className={`rounded-xl border p-4 text-left ${workspaceMode === mode ? "border-red-500/40 bg-red-500/10" : "border-white/10 bg-[#0B0D10]"}`}>
                <div className="font-semibold capitalize">{mode} workspace</div>
                <p className="mt-2 text-sm text-muted-foreground">{mode === "compact" ? "Fewer controls and faster staff flow." : "Show more review and management context."}</p>
              </button>
            ))}
          </div>
          <div className="max-w-3xl rounded-xl border border-white/10 bg-[#0B0D10] p-4">
            <div className="flex items-center gap-2"><Database className="h-4 w-4 text-primary" /><span className="font-semibold">NHTSA intelligence</span><Badge variant="outline">Active</Badge></div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">VIN decode, recalls, and available safety ratings are free. Trim research uses sourced evidence and still requires staff confirmation. Title status remains staff-entered.</p>
          </div>
          <Button onClick={saveExperience} className="bg-primary hover:bg-red-500"><Save className="h-4 w-4" /> Save LF behavior</Button>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6 pt-6">
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { value: "none", title: "None", body: "No motion.", icon: Monitor },
              { value: "simple", title: "Simple", body: "Restrained workspace transitions.", icon: Gauge },
              { value: "amaze", title: "Amaze me", body: "More expressive product polish.", icon: Sparkles },
            ].map((option) => (
              <button key={option.value} type="button" onClick={() => { const next = option.value as MotionPreference; setAnimationPreference(next); setPreference(next); }} className={`rounded-xl border p-4 text-left ${animationPreference === option.value ? "border-red-500/40 bg-red-500/10" : "border-white/10 bg-[#0B0D10]"}`}>
                <option.icon className="mb-4 h-5 w-5 text-primary" />
                <div className="font-semibold">{option.title}</div>
                <p className="mt-2 text-sm text-muted-foreground">{option.body}</p>
              </button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { key: "qualityScore", title: "Listing Quality Score", body: "Show completeness and claim-risk scoring.", icon: Sparkles },
              { key: "fastDraftMode", title: "Fast Draft Mode", body: "Keep staff focused on the shortest reliable path.", icon: Zap },
              { key: "desktopNotifications", title: "Desktop Notifications", body: "Reserved for the future desktop companion.", icon: Bell },
              { key: "autoCopyLastOutput", title: "Auto-copy Last Output", body: "Reserved for an optional future workflow.", icon: Monitor },
            ].map((feature) => (
              <div key={feature.key} className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-[#0B0D10] p-4">
                <div className="flex gap-3"><feature.icon className="mt-1 h-4 w-4 text-primary" /><div><div className="font-semibold">{feature.title}</div><p className="mt-1 text-sm text-muted-foreground">{feature.body}</p></div></div>
                <Switch checked={featureSettings[feature.key] || false} onCheckedChange={(checked) => setFeatureSettings((current) => ({ ...current, [feature.key]: Boolean(checked) }))} />
              </div>
            ))}
          </div>
          <Button onClick={saveExperience} className="bg-primary hover:bg-red-500"><Save className="h-4 w-4" /> Save appearance</Button>
        </TabsContent>
      </Tabs>
    </section>
  );
}
