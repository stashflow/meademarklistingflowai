"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Building2, Check, Clock, FileText, Loader2, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { StyleProfileOutput } from "@/types/style-profile";

const tones = [
  "Professional dealer",
  "Friendly local dealer",
  "Simple and direct",
  "Premium/luxury",
  "Value-focused",
  "Performance-focused",
];

const toneDescriptions: Record<string, string> = {
  "Professional dealer": "Clean, confident, and safe for most dealership inventory.",
  "Friendly local dealer": "Warmer copy for relationship-driven local stores.",
  "Simple and direct": "Short, practical, and easy for shoppers to scan.",
  "Premium/luxury": "More polished language for higher-end inventory.",
  "Value-focused": "Highlights price, reliability, and practical benefits.",
  "Performance-focused": "Best for enthusiast, sport, and upgraded vehicles.",
};

const platforms = ["Facebook Marketplace", "Dealer website", "Craigslist", "AutoTrader", "Cars.com", "Other"];

const inventoryTypes = [
  "Budget used cars",
  "Luxury vehicles",
  "Performance vehicles",
  "Trucks/SUVs",
  "Mixed inventory",
  "Other",
];

type DealershipSearch = { id: string; name: string; location: string | null };

function RecommendedOption({
  label,
  recommended,
}: {
  label: string;
  recommended?: boolean;
}) {
  return (
    <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
      <span className="truncate">{label}</span>
      {recommended && (
        <span className="shrink-0 rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[10px] uppercase text-red-100">
          Recommended
        </span>
      )}
    </span>
  );
}

const stepMeta = [
  ["Profile", "Who is setting this up"],
  ["Workspace", "Dealership access"],
  ["Defaults", "Recommended listing settings"],
  ["Style", "Optional voice training"],
  ["Confirm", "Review and launch"],
];

const styleExamples = [
  {
    title: "Clean dealer style",
    text:
      "2021 Toyota Camry SE with 45,200 miles. Clean, comfortable, and ready for everyday driving. Features include backup camera, Bluetooth, alloy wheels, and Toyota Safety Sense. Financing options may be available with approved credit. Call or stop by to confirm availability.",
  },
  {
    title: "Direct marketplace style",
    text:
      "2019 Ford F-150 XLT 4x4. Strong running truck with tow package, backup camera, bed liner, and clean interior. Good tires and fresh service. Message us for availability or to schedule a test drive.",
  },
  {
    title: "Premium concise style",
    text:
      "2020 Lexus RX 350 finished in Pearl White with a refined cabin, smooth V6 performance, navigation, heated seats, and advanced safety features. Well-presented and ready for staff review before publishing.",
  },
];

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [dealershipId, setDealershipId] = useState("");
  const [styleProfile, setStyleProfile] = useState<StyleProfileOutput | null>(null);
  const [dealerships, setDealerships] = useState<DealershipSearch[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["Dealer website", "Facebook Marketplace"]);
  const [oldListings, setOldListings] = useState("");
  const [styleInstructions, setStyleInstructions] = useState("");
  const [styleAnswers, setStyleAnswers] = useState({
    tone: "Professional dealer",
    length: "Medium",
    wordsToAvoid: "",
    sellingPoints: "",
  });

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient();
      const { data: auth } = await supabase.auth.getUser();
      setUserEmail(auth.user?.email || "");
      if (auth.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name,role,active_dealership_id")
          .eq("user_id", auth.user.id)
          .maybeSingle();
        setFullName(profile?.full_name || String(auth.user.user_metadata?.full_name || ""));
        setRole(profile?.role || "");
        setDealershipId(profile?.active_dealership_id || "");
      }
      const { data } = await supabase.from("dealerships").select("id,name,location").limit(20);
      setDealerships(data || []);
    }
    load();
  }, []);

  const progress = useMemo(() => Math.round((step / 5) * 100), [step]);
  const activeStepMeta = stepMeta[step - 1];

  function buildDefaultStyleProfile(): StyleProfileOutput {
    return {
      voiceSummary: `${styleAnswers.tone} voice for dealership-ready listings: accurate, practical, and easy for shoppers to scan.`,
      formattingRules: {
        length: styleAnswers.length,
        bulletStyle: "Use short feature bullets for scannability when helpful.",
        emojiUsage: "Avoid emojis unless the dealership adds them manually.",
        capitalization: "Use standard capitalization. Avoid all-caps hype.",
        paragraphStyle: "Start with a strong plain-language summary, then key details, then a clear CTA.",
      },
      preferredPhrases: ["available now", "schedule a test drive", "confirm availability"],
      bannedPhrases: styleAnswers.wordsToAvoid
        .split(",")
        .map((phrase) => phrase.trim())
        .filter(Boolean),
      defaultCTA: "Call or stop by to confirm availability and schedule a test drive.",
      defaultDisclaimer: "Final listing details should be reviewed by dealership staff before publishing.",
      platformPreferences: {
        facebook: selectedPlatforms.includes("Facebook Marketplace") ? "Natural, scannable, and message-friendly." : "",
        website: selectedPlatforms.includes("Dealer website") ? "Polished, SEO-aware, and professional." : "",
        craigslist: selectedPlatforms.includes("Craigslist") ? "Direct, practical, and detail-first." : "",
        autotrader: selectedPlatforms.includes("AutoTrader") ? "Structured and specification-forward." : "",
        seo: "Keep titles searchable and avoid unsupported claims.",
      },
      commonSellingAngles: styleAnswers.sellingPoints
        .split(",")
        .map((angle) => angle.trim())
        .filter(Boolean),
      aiStyleSummary:
        "Use the dealership defaults as a starting profile. Prioritize accuracy, missing-detail warnings, and clean platform-ready copy.",
    };
  }

  async function submitPersonalInfo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Please log in before onboarding.");
      if (!fullName.trim()) throw new Error("Add your full name before continuing.");
      if (!role.trim()) throw new Error("Add your dealership role before continuing.");
      await supabase.from("profiles").upsert(
        {
          user_id: auth.user.id,
          full_name: fullName.trim(),
          email: auth.user.email,
          role: role.trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      setStep(2);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save personal info.");
    } finally {
      setLoading(false);
    }
  }

  async function createDealership(formData: FormData) {
    setLoading(true);
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Please log in before creating a dealership.");

      const { data: dealership, error } = await supabase
        .from("dealerships")
        .insert({
          name: formData.get("dealershipName"),
          created_by: auth.user.id,
          website: formData.get("website"),
          location: formData.get("location"),
          monthly_vehicle_volume: formData.get("monthlyVolume"),
          default_tone: formData.get("inventoryType"),
        })
        .select("*")
        .single();
      if (error) throw error;
      await supabase.from("dealership_members").insert({
        dealership_id: dealership.id,
        user_id: auth.user.id,
        role: "owner",
      });
      await supabase
        .from("profiles")
        .update({ active_dealership_id: dealership.id })
        .eq("user_id", auth.user.id);
      setDealershipId(dealership.id);
      setStep(3);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create dealership.");
    } finally {
      setLoading(false);
    }
  }

  async function requestJoin(formData: FormData) {
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/join-requests/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealershipId: formData.get("dealershipId"),
        message: formData.get("message"),
      }),
    });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(payload.message || "Could not submit join request.");
      return;
    }
    setMessage("Join request submitted. An owner or admin can approve it from the Team page.");
  }

  function submitStyleBasics(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!selectedPlatforms.length) {
      setMessage("Choose at least one platform before continuing.");
      return;
    }
    setStep(4);
  }

  async function analyzeStyle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/style/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealershipId: dealershipId || undefined,
          save: false,
          answers: {
            tone: styleAnswers.tone,
            platforms: selectedPlatforms,
            length: styleAnswers.length,
            wordsToAvoid: styleAnswers.wordsToAvoid,
            sellingPoints: styleAnswers.sellingPoints,
            oldListings,
            styleInstructions,
          },
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.message || "Style analysis failed. You can skip this step and edit your style profile later.");
        return;
      }
      setStyleProfile(payload.profile);
      setStep(5);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Style analysis failed. You can skip this step and edit your style profile later.");
    } finally {
      setLoading(false);
    }
  }

  function skipStyleTraining() {
    setMessage("");
    setStyleProfile(buildDefaultStyleProfile());
    setStep(5);
  }

  async function completeOnboarding() {
    if (!styleProfile) return;
    setLoading(true);
    setMessage("");
    try {
      if (!dealershipId) {
        throw new Error("Create or join a dealership workspace before completing onboarding.");
      }
      const supabase = createSupabaseBrowserClient();
      const { data: auth } = await supabase.auth.getUser();
      const { error: styleError } = await supabase.from("dealership_style_profiles").upsert(
        {
          dealership_id: dealershipId,
          voice_summary: styleProfile.voiceSummary,
          formatting_rules: styleProfile.formattingRules,
          preferred_phrases: styleProfile.preferredPhrases,
          banned_phrases: styleProfile.bannedPhrases,
          default_cta: styleProfile.defaultCTA,
          default_disclaimer: styleProfile.defaultDisclaimer,
          platform_preferences: styleProfile.platformPreferences,
          example_listings: oldListings ? [oldListings] : [],
          ai_style_summary: styleProfile.aiStyleSummary,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "dealership_id" },
      );
      if (styleError) throw styleError;
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true, active_dealership_id: dealershipId })
        .eq("user_id", auth.user?.id);
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not complete onboarding.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-8 overflow-hidden rounded-[2rem] border border-white/12 bg-[#0F1218]/95 p-5">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <Badge className="mb-3 border-red-500/30 bg-red-500/10 text-red-100">
              Step {step} of 5 · {activeStepMeta?.[0]}
            </Badge>
            <h1 className="font-display text-4xl leading-tight">Set up ListingFlow AI</h1>
            <p className="mt-2 text-sm text-muted-foreground">{activeStepMeta?.[1]}</p>
          </div>
          <div className="w-full md:w-64">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Setup progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        </div>
        <div className="mt-5 grid gap-2 md:grid-cols-5">
          {stepMeta.map(([label], index) => (
            <div
              key={label}
              className={`rounded-lg border px-3 py-2 text-xs ${
                index + 1 <= step
                  ? "border-red-500/30 bg-red-500/10 text-red-100"
                  : "border-white/10 bg-white/[.025] text-muted-foreground"
              }`}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
      {message && (
        <div className="mb-5 rounded-md border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
          {message}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.99 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
      {step === 1 && (
        <Card className="app-card overflow-hidden rounded-[2rem] border-white/12">
          <div className="h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10">
              <ShieldCheck className="h-5 w-5 text-red-100" />
            </div>
            <CardTitle className="font-display text-3xl">Personal info</CardTitle>
            <CardDescription>Confirm who will be setting up this dealership workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitPersonalInfo} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="onboarding-full-name">Full name</Label>
                <Input
                  id="onboarding-full-name"
                  name="fullName"
                  required
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboarding-email">Email</Label>
                <Input id="onboarding-email" value={userEmail} readOnly placeholder="Account email" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="onboarding-role">Role at dealership</Label>
                <Input
                  id="onboarding-role"
                  name="role"
                  required
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  placeholder="Owner, manager, internet sales..."
                />
                <div className="flex flex-wrap gap-2">
                  {["Owner", "General Manager", "Inventory Manager", "Internet Sales"].map((suggestedRole) => (
                    <Button
                      key={suggestedRole}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-white/10 bg-white/[.035]"
                      onClick={() => setRole(suggestedRole)}
                    >
                      {suggestedRole}{suggestedRole === "Owner" ? " (Recommended)" : ""}
                    </Button>
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={loading} className="bg-primary hover:bg-red-700 md:col-span-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Continue
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="app-card overflow-hidden rounded-[2rem] border-white/12">
          <div className="h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10">
              <Building2 className="h-5 w-5 text-red-100" />
            </div>
            <CardTitle className="font-display text-3xl">Dealership setup</CardTitle>
            <CardDescription>Create a workspace, use an invite link, or request to join.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="create">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="create">Create</TabsTrigger>
                <TabsTrigger value="invite">Invite link</TabsTrigger>
                <TabsTrigger value="request">Request</TabsTrigger>
              </TabsList>
              <TabsContent value="create" className="mt-6">
                <form action={createDealership} className="grid gap-4 md:grid-cols-2">
                  <Input name="dealershipName" required placeholder="Dealership name" />
                  <Input name="website" placeholder="Website" />
                  <Input name="location" placeholder="Location" />
                  <Input name="monthlyVolume" placeholder="Monthly vehicle volume, ex. 50-100" />
                  <Select name="inventoryType" required defaultValue="Mixed inventory">
                    <SelectTrigger><SelectValue placeholder="Primary inventory type" /></SelectTrigger>
                    <SelectContent className="min-w-72">
                      {inventoryTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          <RecommendedOption label={type} recommended={type === "Mixed inventory"} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="submit" disabled={loading} className="bg-primary hover:bg-red-700 md:col-span-2">
                    Create dealership workspace <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="invite" className="mt-6 space-y-4">
                <Input
                  placeholder="Paste invite token or full invite URL"
                  onChange={(event) => {
                    const value = event.target.value.trim();
                    const token = value.split("/join/")[1] || value;
                    if (token.length > 12) router.push(`/join/${token}`);
                  }}
                />
                <p className="text-sm text-muted-foreground">Invite links automatically join a valid dealership after login.</p>
              </TabsContent>
              <TabsContent value="request" className="mt-6">
                <form action={requestJoin} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Choose dealership</Label>
                    <Select name="dealershipId" required>
                      <SelectTrigger><Search className="mr-2 h-4 w-4" /><SelectValue placeholder="Searchable dealerships" /></SelectTrigger>
                      <SelectContent>
                        {dealerships.map((dealer) => (
                          <SelectItem key={dealer.id} value={dealer.id}>
                            {dealer.name}{dealer.location ? `, ${dealer.location}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea name="message" placeholder="Optional message for the owner/admin" />
                  <Button type="submit" disabled={loading} className="bg-primary hover:bg-red-700">Submit join request</Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="app-card overflow-hidden rounded-[2rem] border-white/12">
          <div className="h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10">
              <Clock className="h-5 w-5 text-red-100" />
            </div>
            <CardTitle className="font-display text-3xl">Listing defaults</CardTitle>
            <CardDescription>Recommended options are already selected for a professional dealership workflow.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitStyleBasics} className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Tone</Label>
                  <Badge variant="outline" className="border-red-500/30 text-red-100">Recommended selected</Badge>
                </div>
                <Select
                  name="tone"
                  value={styleAnswers.tone}
                  onValueChange={(value) => value && setStyleAnswers((current) => ({ ...current, tone: value }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="min-w-80">
                    {tones.map((tone) => (
                      <SelectItem key={tone} value={tone}>
                        <RecommendedOption label={tone} recommended={tone === "Professional dealer"} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs leading-5 text-muted-foreground">{toneDescriptions[styleAnswers.tone]}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Length</Label>
                  <Badge variant="outline" className="border-red-500/30 text-red-100">Medium recommended</Badge>
                </div>
                <Select
                  name="length"
                  value={styleAnswers.length}
                  onValueChange={(value) => value && setStyleAnswers((current) => ({ ...current, length: value }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="min-w-72">
                    {["Short", "Medium", "Detailed"].map((length) => (
                      <SelectItem key={length} value={length}>
                        <RecommendedOption label={length} recommended={length === "Medium"} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs leading-5 text-muted-foreground">
                  Medium gives staff enough detail without making listings feel padded.
                </p>
              </div>
              <div className="space-y-3 md:col-span-2">
                <Label>Platforms</Label>
                <div className="grid gap-3 md:grid-cols-3">
                  {platforms.map((platform) => (
                    <label key={platform} className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 p-3 text-sm">
                      <Checkbox
                        checked={selectedPlatforms.includes(platform)}
                        onCheckedChange={(checked) => {
                          setSelectedPlatforms((current) =>
                            checked
                              ? [...current, platform]
                              : current.filter((item) => item !== platform),
                          );
                        }}
                      />
                      <span className="flex flex-1 items-center justify-between gap-2">
                        {platform}
                        {["Dealer website", "Facebook Marketplace"].includes(platform) && (
                          <span className="text-[10px] uppercase text-red-100">Recommended</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <Input
                name="wordsToAvoid"
                value={styleAnswers.wordsToAvoid}
                onChange={(event) => setStyleAnswers((current) => ({ ...current, wordsToAvoid: event.target.value }))}
                placeholder="Words the AI should avoid"
              />
              <Input
                name="sellingPoints"
                value={styleAnswers.sellingPoints}
                onChange={(event) => setStyleAnswers((current) => ({ ...current, sellingPoints: event.target.value }))}
                placeholder="Selling points you usually emphasize"
              />
              <Button type="submit" className="bg-primary hover:bg-red-700 md:col-span-2">
                Continue to style examples <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card className="app-card overflow-hidden rounded-[2rem] border-white/12">
          <div className="h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10">
              <FileText className="h-5 w-5 text-red-100" />
            </div>
            <CardTitle className="font-display text-3xl">Teach ListingFlow your style</CardTitle>
            <CardDescription>
              Paste a few listings your dealership has used before, or describe your preferred listing style.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={analyzeStyle} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                {styleExamples.map((example) => (
                  <button
                    key={example.title}
                    type="button"
                    onClick={() => setOldListings((current) => current ? `${current}\n\n${example.text}` : example.text)}
                    className="rounded-xl border border-white/10 bg-white/[.035] p-4 text-left text-sm transition hover:border-red-500/30 hover:bg-red-500/10"
                  >
                    <div className="font-semibold text-white">{example.title}</div>
                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">{example.text}</p>
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <Label>Past listing examples</Label>
                <Textarea
                  name="oldListings"
                  rows={8}
                  value={oldListings}
                  onChange={(event) => setOldListings(event.target.value)}
                  placeholder="Paste 1-5 old vehicle listings, or click an example above to see the format."
                />
              </div>
              <div className="space-y-2">
                <Label>Style notes</Label>
                <Textarea
                  name="styleInstructions"
                  rows={5}
                  value={styleInstructions}
                  onChange={(event) => setStyleInstructions(event.target.value)}
                  placeholder="Example: Keep it professional, avoid hype, lead with mileage and condition, end with a clear call to action."
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" disabled={loading} className="bg-primary hover:bg-red-700">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Analyze style
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={skipStyleTraining}
                  className="border-white/10 bg-white/[.035]"
                >
                  Skip for now
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 5 && styleProfile && (
        <Card className="app-card overflow-hidden rounded-[2rem] border-white/12">
          <div className="h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10">
              <Sparkles className="h-5 w-5 text-red-100" />
            </div>
            <CardTitle className="font-display text-3xl">Confirm style profile</CardTitle>
            <CardDescription>Edit later from the Style Library or Settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              ["Voice summary", styleProfile.voiceSummary],
              ["Formatting preference", Object.values(styleProfile.formattingRules).filter(Boolean).join(" · ")],
              ["CTA preference", styleProfile.defaultCTA],
              ["Words to avoid", styleProfile.bannedPhrases.join(", ")],
              ["Common selling angles", styleProfile.commonSellingAngles.join(", ")],
              ["Platform notes", Object.values(styleProfile.platformPreferences).filter(Boolean).join(" · ")],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase text-muted-foreground">{label}</div>
                <div className="mt-2 text-sm leading-6">{value}</div>
              </div>
            ))}
            <Button disabled={loading} onClick={completeOnboarding} className="w-full bg-primary hover:bg-red-700">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Accept and open dashboard
            </Button>
          </CardContent>
        </Card>
      )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
