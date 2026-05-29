"use client";

import { useState } from "react";
import { Bell, Database, Gauge, Monitor, Save, Sparkles, Zap } from "lucide-react";
import { useMotionPreference, type MotionPreference } from "@/components/common/motion-preferences";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [vinDataProvider, setVinDataProvider] = useState(
    String(profile?.feature_settings?.vinDataProvider || "nhtsa"),
  );

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
        },
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", auth.user?.id);

    if (!error) {
      setPreference(animationPreference);
    }

    setMessage(error ? error.message : "Experience settings saved.");
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
    <Card className="app-card overflow-hidden rounded-[2rem] border-white/12 bg-[#0F1218]/95">
      <div className="h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
      <CardHeader className="border-b border-white/10">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <CardTitle className="font-display text-3xl">Settings</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Tune account, dealership, style, and desktop experience controls from one place.
            </p>
          </div>
          <Badge variant="outline" className="w-fit border-red-500/30 text-red-100">
            Desktop-ready preferences
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {message && <p className="mb-4 mt-5 rounded-md border border-white/10 bg-white/[.035] p-3 text-sm text-muted-foreground">{message}</p>}
        <Tabs defaultValue="account">
          <TabsList className="mt-5 grid grid-cols-4">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="dealership">Dealership</TabsTrigger>
            <TabsTrigger value="style">Style</TabsTrigger>
            <TabsTrigger value="experience">Features</TabsTrigger>
          </TabsList>
          <TabsContent value="account" className="pt-5">
            <form action={saveAccount} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input name="fullName" defaultValue={profile?.full_name || ""} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={profile?.email || ""} readOnly />
              </div>
              <Button className="bg-primary hover:bg-red-700 md:col-span-2"><Save className="h-4 w-4" /> Save account</Button>
            </form>
          </TabsContent>
          <TabsContent value="dealership" className="pt-5">
            <form action={saveDealership} className="grid gap-4 md:grid-cols-2">
              <Input name="name" disabled={!canManageDealership} defaultValue={dealership?.name || ""} placeholder="Dealership name" />
              <Input name="website" disabled={!canManageDealership} defaultValue={dealership?.website || ""} placeholder="Website" />
              <Input name="location" disabled={!canManageDealership} defaultValue={dealership?.location || ""} placeholder="Location" />
              <Input name="monthlyVolume" disabled={!canManageDealership} defaultValue={dealership?.monthly_vehicle_volume || ""} placeholder="Monthly volume" />
              <Input name="defaultTone" disabled={!canManageDealership} defaultValue={dealership?.default_tone || ""} placeholder="Default tone" />
              <Input name="defaultCta" disabled={!canManageDealership} defaultValue={dealership?.default_cta || ""} placeholder="Default CTA" />
              <Textarea name="defaultDisclaimer" disabled={!canManageDealership} defaultValue={dealership?.default_disclaimer || ""} placeholder="Default disclaimer" className="md:col-span-2" />
              <Button disabled={!canManageDealership} className="bg-primary hover:bg-red-700 md:col-span-2"><Save className="h-4 w-4" /> Save dealership</Button>
            </form>
          </TabsContent>
          <TabsContent value="style" className="pt-5">
            <form action={saveStyle} className="space-y-4">
              <Textarea name="voiceSummary" defaultValue={styleProfile?.voice_summary || ""} placeholder="Voice summary" />
              <Textarea name="aiStyleSummary" defaultValue={styleProfile?.ai_style_summary || ""} placeholder="AI style summary" />
              <Input name="defaultCta" defaultValue={styleProfile?.default_cta || ""} placeholder="Default CTA" />
              <Textarea name="defaultDisclaimer" defaultValue={styleProfile?.default_disclaimer || ""} placeholder="Default disclaimer" />
              <Button className="bg-primary hover:bg-red-700"><Save className="h-4 w-4" /> Save style</Button>
            </form>
          </TabsContent>
          <TabsContent value="experience" className="space-y-6 pt-5">
            <div>
              <h3 className="font-display text-2xl">Animation</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose how energetic ListingFlow feels across desktop and browser sessions.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {[
                  {
                    value: "none",
                    title: "None",
                    body: "Disable motion for maximum focus and accessibility.",
                    icon: Monitor,
                  },
                  {
                    value: "simple",
                    title: "Simple",
                    body: "Restrained transitions for a quiet, professional app.",
                    icon: Gauge,
                  },
                  {
                    value: "amaze",
                    title: "Amaze me",
                    body: "More expressive polish for launches, demos, and walkthroughs.",
                    icon: Sparkles,
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      const nextPreference = option.value as MotionPreference;
                      setAnimationPreference(nextPreference);
                      setPreference(nextPreference);
                    }}
                    className={`rounded-lg border p-4 text-left transition ${
                      animationPreference === option.value
                        ? "border-red-500/50 bg-red-500/10"
                        : "border-white/10 bg-white/[.035] hover:border-white/22"
                    }`}
                  >
                    <option.icon className="mb-4 h-5 w-5 text-primary" />
                    <div className="font-semibold">{option.title}</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{option.body}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-display text-2xl">VIN Data Provider</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                ListingFlow uses the free NHTSA stack for decode, recalls, and safety ratings. Title status remains staff-entered until a paid NMVTIS/history source is connected.
              </p>
              <div className="mt-4 grid gap-3">
                {[
                  {
                    value: "nhtsa",
                    title: "NHTSA free intelligence stack",
                    status: "Active",
                    body: "VPIC VIN decode, NHTSA recall lookup, NCAP safety ratings when available, and cached AI validation. No paid provider is used.",
                  },
                ].map((provider) => (
                  <button
                    key={provider.value}
                    type="button"
                    onClick={() => setVinDataProvider(provider.value)}
                    className={`rounded-lg border p-4 text-left transition ${
                      vinDataProvider === provider.value
                        ? "border-red-500/50 bg-red-500/10"
                        : "border-white/10 bg-white/[.035] hover:border-white/22"
                    }`}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <Database className="h-5 w-5 text-primary" />
                      <Badge variant="outline" className="border-white/10 text-[10px]">{provider.status}</Badge>
                    </div>
                    <div className="font-semibold">{provider.title}</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{provider.body}</p>
                  </button>
                ))}
              </div>
              <p className="mt-3 rounded-md border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
                Title status is not decoded by NHTSA. Staff must enter clean title, branded title, salvage, accident history, or one-owner claims manually unless a trusted history provider is added later.
              </p>
            </div>

            <div>
              <h3 className="font-display text-2xl">Feature Controls</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                These are desktop-app-ready feature flags. Some are live now, and some prepare the next product layer.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {[
                  {
                    key: "qualityScore",
                    title: "Listing Quality Score",
                    body: "Show completeness, clarity, missing-detail, and risk-claim scoring in generation review.",
                    icon: Sparkles,
                    live: false,
                  },
                  {
                    key: "desktopNotifications",
                    title: "Desktop Notifications",
                    body: "Prepare notification behavior for completed generations and team review activity.",
                    icon: Bell,
                    live: false,
                  },
                  {
                    key: "fastDraftMode",
                    title: "Fast Draft Mode",
                    body: "Keep the generator flow optimized for fewer clicks and quicker output review.",
                    icon: Zap,
                    live: true,
                  },
                  {
                    key: "autoCopyLastOutput",
                    title: "Auto-copy Last Output",
                    body: "When enabled later, the most recent approved platform output can be copied automatically.",
                    icon: Monitor,
                    live: false,
                  },
                ].map((feature) => (
                  <div
                    key={feature.key}
                    className="flex items-start justify-between gap-4 rounded-lg border border-white/10 bg-white/[.035] p-4"
                  >
                    <div className="flex gap-3">
                      <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-[#0B0D10]">
                        <feature.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-semibold">{feature.title}</div>
                          <Badge variant="outline" className="border-white/10 text-[10px]">
                            {feature.live ? "Active" : "Planned"}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.body}</p>
                      </div>
                    </div>
                    <Switch
                      checked={featureSettings[feature.key] || false}
                      onCheckedChange={(checked) =>
                        setFeatureSettings((current) => ({
                          ...current,
                          [feature.key]: Boolean(checked),
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={saveExperience} className="bg-primary text-primary-foreground hover:bg-red-500">
              <Save className="h-4 w-4" /> Save features
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
