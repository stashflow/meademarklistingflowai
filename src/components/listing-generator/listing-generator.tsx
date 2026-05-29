"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { AlertTriangle, Check, CheckCircle2, Clipboard, HelpCircle, ImageIcon, ScanLine, Save, ShieldAlert, Sparkles } from "lucide-react";
import { formatFeatureLabel } from "@/lib/generation/feature-highlights";
import { ListingFlowLoader } from "@/components/common/listingflow-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { normalizeNumber } from "@/lib/validators/listing";
import type { ListingOutput, ListingStatus, VehicleInput } from "@/types/listing";
import type { FillInQuestion } from "@/lib/generation/fill-in";

const vehicleFields: Array<[keyof VehicleInput, string, string]> = [
  ["year", "Year", "2022"],
  ["make", "Make", "Toyota"],
  ["model", "Model", "Camry"],
  ["trim", "Trim", "SE"],
  ["mileage", "Mileage", "45200"],
  ["price", "Price", "21995"],
  ["exteriorColor", "Exterior color", "Midnight Black"],
  ["interiorColor", "Interior color", "Black cloth"],
  ["drivetrain", "Drivetrain", "FWD"],
  ["transmission", "Transmission", "Automatic"],
  ["engine", "Engine", "2.5L 4-cylinder"],
  ["fuelType", "Fuel type", "Gasoline"],
  ["mpg", "MPG", "28 city / 39 highway"],
  ["stockNumber", "Stock number", "A1234"],
  ["vehicleType", "Vehicle type", "Sedan"],
];

const conditionFields: Array<[keyof VehicleInput, string]> = [
  ["condition", "Required condition"],
  ["overallCondition", "Overall condition"],
  ["accidentHistory", "Accident history"],
  ["titleStatus", "Title status"],
  ["serviceHistory", "Service history"],
  ["ownershipHistory", "Ownership history"],
  ["tireCondition", "Tire condition"],
  ["interiorCondition", "Interior condition"],
  ["exteriorCondition", "Exterior condition"],
];

const sellingFields: Array<[keyof VehicleInput, string]> = [
  ["keyFeatures", "Key features"],
  ["recentMaintenance", "Recent maintenance"],
  ["upgrades", "Upgrades"],
  ["warrantyInfo", "Warranty info if applicable"],
  ["financingInfo", "Financing info if applicable"],
  ["sellerNotes", "Seller notes"],
];

const imageFields: Array<[keyof VehicleInput, string, string]> = [
  ["imageUrls", "Vehicle image URLs", "Paste image URLs, one per line. Image upload storage can be connected later."],
  ["photoNotes", "Photo notes", "Visible damage, missing photos, key angles, or photo order notes."],
];

const platforms = ["Facebook Marketplace", "Dealer Website", "Craigslist", "AutoTrader-style", "Short SEO", "Highlights only"];

const outputTabs: Array<[keyof ListingOutput, string]> = [
  ["facebookListing", "Facebook"],
  ["websiteDescription", "Website"],
  ["craigslistListing", "Craigslist"],
  ["seoMetaDescription", "SEO"],
  ["highlights", "Highlights"],
  ["disclaimer", "Notes / Disclaimers"],
];

export function ListingGenerator({ dealershipId, initialVin = "" }: { dealershipId: string; initialVin?: string }) {
  const [stagedDraft] = useState(() => {
    if (typeof window === "undefined") return { vehicle: {}, message: "" };
    const staged = window.localStorage.getItem("listingflow-draft-vehicle");
    if (!staged) {
      return {
        vehicle: initialVin ? { vin: initialVin } : {},
        message: initialVin ? "VIN loaded from search. Decode it, confirm the details, then generate the listing." : "",
      };
    }
    window.localStorage.removeItem("listingflow-draft-vehicle");
    try {
      return {
        vehicle: JSON.parse(staged) as VehicleInput,
        message: "Staged vehicle details from bulk intake.",
      };
    } catch {
      return { vehicle: {}, message: "Could not load the staged bulk intake row." };
    }
  });
  const [activeTab, setActiveTab] = useState("vehicle");
  const [vehicle, setVehicle] = useState<VehicleInput>(stagedDraft.vehicle);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["Dealer Website", "Facebook Marketplace"]);
  const [tone, setTone] = useState("Use dealership default");
  const [length, setLength] = useState<"short" | "standard" | "detailed">("standard");
  const [useStyleProfile, setUseStyleProfile] = useState(true);
  const [customInstructions, setCustomInstructions] = useState("");
  const [wordsToAvoid, setWordsToAvoid] = useState("");
  const [ctaOverride, setCtaOverride] = useState("");
  const [output, setOutput] = useState<ListingOutput | null>(null);
  const [status, setStatus] = useState<ListingStatus>("draft");
  const [tags, setTags] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [message, setMessage] = useState(stagedDraft.message);
  const [loading, setLoading] = useState(false);
  const [decodingVin, setDecodingVin] = useState(false);
  const [vinConfirmed, setVinConfirmed] = useState(Boolean(stagedDraft.vehicle.year && stagedDraft.vehicle.make && stagedDraft.vehicle.model));
  const [fillInOpen, setFillInOpen] = useState(false);
  const [fillInLoading, setFillInLoading] = useState(false);
  const [fillInQuestions, setFillInQuestions] = useState<FillInQuestion[]>([]);
  const [fillInIndex, setFillInIndex] = useState(0);
  const [fillInAnswers, setFillInAnswers] = useState<Record<string, string>>({});
  const [fillInAnswer, setFillInAnswer] = useState("");
  const [fillInWarnings, setFillInWarnings] = useState<string[]>([]);
  const [highlightMissing, setHighlightMissing] = useState(false);

  const vehicleName = useMemo(
    () => [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" "),
    [vehicle],
  );

  const qualityScore = useMemo(() => {
    const required = [
      Boolean(vehicle.vin || (vehicle.year && vehicle.make && vehicle.model)),
      Boolean(vehicle.mileage),
      Boolean(vehicle.condition || vehicle.overallCondition),
      Boolean(vehicle.keyFeatures || vehicle.sellerNotes),
      Boolean(output?.reviewWarnings?.length === 0),
    ];
    const base = required.filter(Boolean).length * 18;
    const bonus = output ? 10 : 0;
    return Math.min(base + bonus, 100);
  }, [output, vehicle]);

  const qualityNotes = useMemo(() => {
    const notes: string[] = [];
    if (!vehicle.vin && !(vehicle.year && vehicle.make && vehicle.model)) notes.push("Add VIN or year/make/model.");
    if (!vehicle.mileage) notes.push("Mileage improves buyer confidence.");
    if (!vehicle.condition && !vehicle.overallCondition) notes.push("Condition is required for reliable copy.");
    if (!vehicle.keyFeatures && !vehicle.sellerNotes) notes.push("Add features or seller notes for stronger selling angles.");
    if (vehicle.vinDecoded === "true" && !vinConfirmed) notes.push("Confirm decoded VIN details before generating.");
    if (output?.reviewWarnings?.length) notes.push("Review AI warnings before publishing.");
    if (!notes.length) notes.push("Listing is ready for staff review.");
    return notes;
  }, [output, vehicle, vinConfirmed]);

  function updateVehicle(key: keyof VehicleInput, value: string) {
    setVehicle((current) => ({ ...current, [key]: value }));
    if (["vin", "year", "make", "model", "trim"].includes(key)) {
      setVinConfirmed(false);
    }
  }

  function needsField(key: keyof VehicleInput) {
    if (!highlightMissing) return false;
    return ["mileage", "condition", "overallCondition", "keyFeatures", "sellerNotes"].includes(String(key)) && !vehicle[key];
  }

  async function startFillIn() {
    setFillInOpen(true);
    setFillInLoading(true);
    setFillInWarnings([]);
    setMessage("");
    try {
      const response = await fetch("/api/fill-in/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealershipId, vehicle }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Could not start LF Fill In.");
      setFillInQuestions(payload.questions || []);
      setFillInIndex(0);
      setFillInAnswers({});
      setFillInAnswer("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start LF Fill In.");
      setFillInOpen(false);
    } finally {
      setFillInLoading(false);
    }
  }

  async function finishFillIn(nextAnswers: Record<string, string>) {
    setFillInLoading(true);
    try {
      const response = await fetch("/api/fill-in/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealershipId, vehicle, answers: nextAnswers }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Could not apply LF Fill In.");
      const features = payload.featureHighlights?.length
        ? payload.featureHighlights.map((feature: { label: string; status: string }) =>
            feature.status === "unsure" || feature.status === "ask_user"
              ? `${feature.label} [unsure if applicable]`
              : feature.label,
          ).join(", ")
        : "";
      setVehicle((current) => ({
        ...current,
        ...payload.updates,
        keyFeatures: [payload.updates?.keyFeatures || current.keyFeatures, features].filter(Boolean).join(", "),
        validatedFeaturesJson: JSON.stringify(payload.featureHighlights || []),
        featureClarificationQuestions: (payload.warnings || []).join("\n"),
      }));
      setFillInWarnings([...(payload.warnings || []), ...(payload.confidenceNotes || [])]);
      setHighlightMissing(true);
      setMessage("LF Fill In added safe fields and feature highlights. Review anything marked unsure before generating.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not apply LF Fill In.");
    } finally {
      setFillInLoading(false);
    }
  }

  function submitFillInAnswer() {
    const question = fillInQuestions[fillInIndex];
    if (!question) return;
    const nextAnswers = { ...fillInAnswers, [question.id]: fillInAnswer.trim() };
    setFillInAnswers(nextAnswers);
    setFillInAnswer("");
    if (fillInIndex + 1 >= fillInQuestions.length) {
      finishFillIn(nextAnswers);
      return;
    }
    setFillInIndex((current) => current + 1);
  }

  async function decodeVin() {
    const vin = vehicle.vin?.trim().toUpperCase();
    setMessage("");
    if (!vin || vin.length !== 17) {
      setMessage("Enter a 17-character VIN before decoding.");
      return;
    }
    setDecodingVin(true);
    try {
      const response = await fetch("/api/vin/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vin, dealershipId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.message || "Could not decode this VIN.");
        return;
      }
      setVehicle((current) => ({
        ...current,
        ...payload.decoded,
        vin,
      }));
      setVinConfirmed(false);
      setMessage("VIN decoded. Confirm the vehicle details, then add mileage, condition, and selling points.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not decode this VIN.");
    } finally {
      setDecodingVin(false);
    }
  }

  async function generate() {
    if (vehicle.vinDecoded === "true" && !vinConfirmed) {
      setMessage("Confirm decoded VIN details before generating. Staff stays in control of the final vehicle data.");
      setActiveTab("vehicle");
      return;
    }
    if (!vehicle.mileage || (!vehicle.condition && !vehicle.overallCondition) || (!vehicle.keyFeatures && !vehicle.sellerNotes)) {
      setHighlightMissing(true);
      setMessage("Add the highlighted details or use LF Fill In before generating. Mileage, condition, and features or seller notes are needed for a strong listing.");
      setActiveTab("vehicle");
      return;
    }
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/generate-listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealershipId,
        vehicle,
        preferences: {
          platforms: selectedPlatforms,
          tone,
          length,
          useStyleProfile,
          customInstructions: [
            customInstructions,
            vehicle.validatedFeaturesJson
              ? `LF Fill In validated features JSON: ${vehicle.validatedFeaturesJson}. Use confirmed features confidently. Mark uncertain features clearly and do not upgrade them to confirmed.`
              : "",
            vehicle.vinDecoded === "true"
              ? `VIN decoded by ${vehicle.vinDecodeSource || "decoder"}. Use decoded fields only as provided and do not invent missing trim/specs.`
              : "",
          ].filter(Boolean).join("\n"),
          wordsToAvoid,
          ctaOverride,
        },
      }),
    });
    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(payload.userMessage || payload.message || "Could not generate this listing.");
      return;
    }

    setOutput(payload.output);
    setActiveTab("outputs");
    setMessage(`Generated successfully. Usage: ${payload.usage.count}/${payload.usage.limit}`);
  }

  async function saveListing() {
    if (!output) return;
    setLoading(true);
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Please log in before saving.");
      const { data: saved, error } = await supabase.from("listings").insert({
        dealership_id: dealershipId,
        created_by: auth.user.id,
        vin: vehicle.vin || null,
        year: vehicle.year || null,
        make: vehicle.make || null,
        model: vehicle.model || null,
        trim: vehicle.trim || null,
        mileage: normalizeNumber(vehicle.mileage),
        price: normalizeNumber(vehicle.price),
        condition: vehicle.condition || vehicle.overallCondition || null,
        input_data: vehicle,
        generated_output: output,
        status,
        approval_status: status,
        quality_score: output.claimRiskAudit?.score ?? null,
        risk_level: output.claimRiskAudit?.riskLevel ?? "unknown",
        risk_summary: output.claimRiskAudit || {},
        tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        internal_notes: internalNotes || null,
      }).select("id").single();
      if (error) throw error;
      if (vehicle.imageUrls) {
        const rows = vehicle.imageUrls
          .split("\n")
          .map((url, index) => ({ url: url.trim(), index }))
          .filter((item) => item.url);
        if (rows.length) {
          await supabase.from("listing_images").insert(rows.map((item) => ({
            listing_id: saved?.id || null,
            dealership_id: dealershipId,
            created_by: auth.user.id,
            image_url: item.url,
            alt_text: [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle image",
            sort_order: item.index,
            metadata: { source: "manual_url", photoNotes: vehicle.photoNotes || null },
          })));
        }
      }
      await supabase.from("listing_quality_reports").insert({
        listing_id: saved?.id || null,
        dealership_id: dealershipId,
        created_by: auth.user.id,
        score: output.claimRiskAudit?.score ?? qualityScore,
        risk_level: output.claimRiskAudit?.riskLevel ?? "unknown",
        missing_details: output.claimRiskAudit?.missingDetails || [],
        risk_claims: output.claimRiskAudit?.riskClaims || [],
        recommendations: output.claimRiskAudit?.recommendations || [],
      });
      await supabase.from("feature_events").insert({
        dealership_id: dealershipId,
        user_id: auth.user.id,
        feature: "listing_library",
        action: "save_listing",
        route: "/dashboard/new-listing",
        metadata: { status, riskLevel: output.claimRiskAudit?.riskLevel || "unknown" },
      });
      await supabase.from("audit_logs").insert({
        dealership_id: dealershipId,
        actor_user_id: auth.user.id,
        entity_type: "listing",
        entity_id: saved?.id || null,
        action: "saved",
        after_data: { vehicle, status, riskLevel: output.claimRiskAudit?.riskLevel || "unknown" },
      });
      setMessage("Saved to the shared dealership library.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this listing.");
    } finally {
      setLoading(false);
    }
  }

  function copy(value: unknown) {
    const text = Array.isArray(value) ? value.join("\n") : String(value || "");
    navigator.clipboard.writeText(text);
    setMessage("Copied to clipboard.");
  }

  function updateOutput(key: keyof ListingOutput, value: string) {
    if (!output) return;
    setOutput({
      ...output,
      [key]: key === "highlights" || key === "features" || key === "reviewWarnings"
        ? value.split("\n").filter(Boolean)
        : value,
    });
  }

  return (
    <Card className="app-card overflow-hidden rounded-[2rem] border-white/12 bg-[#0F1218]/95">
      <div className="h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
      <CardHeader className="border-b border-white/10">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <CardTitle className="font-display text-3xl">New vehicle listing</CardTitle>
            <CardDescription>
              Start with a VIN, confirm decoded details, then generate personalized platform-ready copy.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={startFillIn} className="bg-white text-[#0B0D10] hover:bg-zinc-200">
              <span className="relative h-5 w-5 overflow-hidden rounded border border-black/10">
                <Image src="/brand/lf-favicon.png" alt="" fill sizes="20px" className="object-cover" />
              </span>
              Fill In
            </Button>
            <Badge variant="outline" className="w-fit border-red-500/30 text-red-200">
              Uses 1 generation
            </Badge>
            <Badge variant="outline" className="w-fit border-white/10 text-zinc-300">
              Quality {qualityScore}/100
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {message && (
          <div className="m-5 rounded-lg border border-white/10 bg-white/[.035] p-4 text-sm text-muted-foreground">
            {message}
          </div>
        )}
        {fillInOpen && (
          <div className="m-5 rounded-2xl border border-red-500/25 bg-[#0B0D10]/90 p-5">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="flex items-center gap-3">
                <div className="relative h-11 w-11 overflow-hidden rounded-lg border border-white/10 bg-[#111827]">
                  <Image src="/brand/lf-favicon.png" alt="ListingFlow" fill sizes="44px" className="object-cover" />
                </div>
                <div>
                  <div className="font-display text-2xl text-white">LF Fill In</div>
                  <p className="text-sm text-muted-foreground">Answer simple questions. ListingFlow fills safe fields and feature highlights.</p>
                </div>
              </div>
              <Button variant="ghost" onClick={() => setFillInOpen(false)}>Close</Button>
            </div>
            {fillInLoading ? (
              <div className="mt-5 rounded-lg border border-white/10 bg-white/[.035] p-4">
                <ListingFlowLoader compact label="LF Fill In is working" />
              </div>
            ) : fillInQuestions[fillInIndex] ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Question {fillInIndex + 1} of {fillInQuestions.length}
                  </div>
                  <Label className="text-base text-white">{fillInQuestions[fillInIndex].label}</Label>
                  <p className="text-sm text-muted-foreground">{fillInQuestions[fillInIndex].helper}</p>
                  <Textarea value={fillInAnswer} onChange={(event) => setFillInAnswer(event.target.value)} placeholder="Type the staff answer here" />
                </div>
                <Button onClick={submitFillInAnswer} className="bg-primary text-primary-foreground hover:bg-red-500">
                  {fillInIndex + 1 >= fillInQuestions.length ? "Fill fields" : "Next question"}
                </Button>
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                LF Fill In is ready. Review highlighted fields before generating.
              </div>
            )}
            {!!fillInWarnings.length && (
              <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                {fillInWarnings.join(" ")}
              </div>
            )}
          </div>
        )}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mx-5 mt-5 grid grid-cols-5">
            <TabsTrigger value="vehicle">Vehicle Details</TabsTrigger>
            <TabsTrigger value="style">Style & Platform</TabsTrigger>
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="outputs">Outputs</TabsTrigger>
            <TabsTrigger value="save">Save</TabsTrigger>
          </TabsList>

          <TabsContent value="vehicle" className="space-y-8 p-5">
            <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-[#0B0D10]/80 p-5">
              <div className="industrial-grid absolute inset-0 opacity-20" />
              <div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ScanLine className="h-5 w-5 text-primary" />
                    <Label htmlFor="vin-command" className="font-display text-2xl text-white">VIN to listing</Label>
                    <Badge className="border-red-500/30 bg-red-500/10 text-red-100">Recommended start</Badge>
                  </div>
                  <Input
                    id="vin-command"
                    value={vehicle.vin || ""}
                    onChange={(event) => updateVehicle("vin", event.target.value.toUpperCase())}
                    placeholder="Enter 17-character VIN"
                    className="h-11 max-w-xl font-mono text-base uppercase tracking-[0.08em]"
                    maxLength={17}
                  />
                  <p className="text-xs leading-5 text-muted-foreground">
                    ListingFlow uses NHTSA VPIC to decode basic vehicle data. Staff still confirms mileage, condition, title, accident history, warranty, and selling points before generation.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                  <Button onClick={decodeVin} disabled={decodingVin || loading} className="bg-primary text-primary-foreground hover:bg-red-500">
                    {decodingVin ? <ListingFlowLoader compact label="Decoding..." className="text-white" /> : <><ScanLine className="h-4 w-4" /> Decode VIN</>}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setVinConfirmed(true)}
                    disabled={!vehicle.year || !vehicle.make || !vehicle.model}
                    className="border-white/10 bg-white/[.035]"
                  >
                    <Check className="h-4 w-4" />
                    Confirm details
                  </Button>
                </div>
              </div>
              <div className="relative mt-4 grid gap-3 md:grid-cols-5">
                {[
                  ["Decoded", vehicle.vinDecoded === "true" ? "Yes" : "Not yet"],
                  ["Source", vehicle.vinDecodeSource || "Manual entry"],
                  ["Confirmed", vinConfirmed ? "Ready" : "Needs staff review"],
                  ["Intel", vehicle.vehicleIntelligenceScore ? `${vehicle.vehicleIntelligenceScore}/100` : "Not checked"],
                  ["Vehicle", vehicleName || "Waiting for VIN"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-white/10 bg-white/[.035] p-3">
                    <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
                    <div className="mt-1 truncate text-sm font-medium">{value}</div>
                  </div>
                ))}
              </div>
              {vehicle.vinDecodeWarnings && (
                <div className="relative mt-4 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">
                  {vehicle.vinDecodeWarnings}
                </div>
              )}
              {(vehicle.vehicleIntelligenceSummary || vehicle.vehicleSafetySummary || vehicle.vehicleRecallSummary) && (
                <div className="relative mt-4 grid gap-3 lg:grid-cols-3">
                  {[
                    ["Model intelligence", vehicle.vehicleIntelligenceSummary],
                    ["Safety", vehicle.vehicleSafetySummary],
                    ["Recalls", vehicle.vehicleRecallSummary],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-white/10 bg-white/[.035] p-4">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
                      <p className="mt-2 text-sm leading-6 text-zinc-300">{value || "No NHTSA data returned."}</p>
                    </div>
                  ))}
                </div>
              )}
              {vehicle.vehicleValueNotes && (
                <div className="relative mt-4 rounded-lg border border-white/10 bg-white/[.035] p-3 text-xs leading-5 text-zinc-300">
                  {vehicle.vehicleValueNotes}
                </div>
              )}
              {vehicle.vehicleIntelligenceWarnings && (
                <div className="relative mt-4 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">
                  {vehicle.vehicleIntelligenceWarnings}
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
              <h3 className="mb-4 font-display text-2xl">Vehicle details</h3>
              <div className="grid gap-4 md:grid-cols-4">
                {vehicleFields.map(([key, label, placeholder]) => (
                  <div key={key} className="space-y-2">
                    <Label>{label}</Label>
                    <Input
                      value={vehicle[key] || ""}
                      onChange={(event) => updateVehicle(key, event.target.value)}
                      placeholder={placeholder}
                      className={needsField(key) ? "border-amber-400/60 bg-amber-400/10" : undefined}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Decoded details are editable. ListingFlow uses exactly what staff confirms here.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
              <h3 className="mb-4 font-display text-2xl">Condition</h3>
              <div className="grid gap-4 md:grid-cols-3">
                {conditionFields.map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <Label>{label}</Label>
                    <Input
                      value={vehicle[key] || ""}
                      onChange={(event) => updateVehicle(key, event.target.value)}
                      className={needsField(key) ? "border-amber-400/60 bg-amber-400/10" : undefined}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
              <h3 className="mb-4 font-display text-2xl">Selling points</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {sellingFields.map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <Label>{label}</Label>
                    <Textarea
                      value={vehicle[key] || ""}
                      onChange={(event) => updateVehicle(key, event.target.value)}
                      className={needsField(key) ? "border-amber-400/60 bg-amber-400/10" : undefined}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
              <div className="mb-4 flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                <h3 className="font-display text-2xl">Images</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {imageFields.map(([key, label, placeholder]) => (
                  <div key={key} className="space-y-2">
                    <Label>{label}</Label>
                    <Textarea value={vehicle[key] || ""} onChange={(event) => updateVehicle(key, event.target.value)} placeholder={placeholder} />
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Images are tracked with the listing. AI photo decoding is intentionally held for a later integration.
              </p>
            </div>
            <Button
              onClick={() => {
                setVinConfirmed(true);
                setActiveTab("style");
              }}
              className="bg-primary text-primary-foreground hover:bg-red-500"
            >
              Confirm and continue
            </Button>
          </TabsContent>

          <TabsContent value="style" className="space-y-6 p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select value={tone} onValueChange={(value) => value && setTone(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Use dealership default", "Professional dealer", "Friendly local dealer", "Simple and direct", "Premium/luxury", "Value-focused", "Performance-focused"].map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Length</Label>
                <Select value={length} onValueChange={(value) => value && setLength(value as typeof length)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[.035] p-4 text-sm">
                <Checkbox checked={useStyleProfile} onCheckedChange={(checked) => setUseStyleProfile(Boolean(checked))} />
                Use dealership style profile
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {platforms.map((platform) => (
                <label key={platform} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[.035] p-3 text-sm">
                  <Checkbox
                    checked={selectedPlatforms.includes(platform)}
                    onCheckedChange={(checked) => {
                      setSelectedPlatforms((current) =>
                        checked ? [...current, platform] : current.filter((item) => item !== platform),
                      );
                    }}
                  />
                  {platform}
                </label>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Textarea value={customInstructions} onChange={(event) => setCustomInstructions(event.target.value)} placeholder="Optional custom instructions" />
              <Textarea value={wordsToAvoid} onChange={(event) => setWordsToAvoid(event.target.value)} placeholder="Words to avoid" />
              <Textarea value={ctaOverride} onChange={(event) => setCtaOverride(event.target.value)} placeholder="Call-to-action override" />
            </div>
            <Button onClick={() => setActiveTab("generate")} className="bg-primary text-primary-foreground hover:bg-red-500">Review generation</Button>
          </TabsContent>

          <TabsContent value="generate" className="space-y-5 p-5">
            <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
              <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
                <h3 className="font-semibold">{vehicleName || vehicle.vin || "Vehicle details incomplete"}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  This will use 1 generation from your monthly limit. ListingFlow will not claim warranty,
                  clean title, no accidents, one owner, service history, or financing unless explicitly provided.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedPlatforms.map((platform) => <Badge key={platform} variant="outline" className="border-white/10">{platform}</Badge>)}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0B0D10]/80 p-5">
                <div className="flex items-center justify-between">
                  <div className="font-display text-2xl">Quality Score</div>
                  <Badge className="bg-primary text-white">{qualityScore}/100</Badge>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${qualityScore}%` }} />
                </div>
                <div className="mt-4 space-y-2">
                  {qualityNotes.map((note) => (
                    <div key={note} className="flex gap-2 text-sm text-muted-foreground">
                      {note.includes("ready") ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" /> : <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-300" />}
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {output?.claimRiskAudit && (
              <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10">
                      <ShieldAlert className="h-5 w-5 text-red-100" />
                    </div>
                    <div>
                      <div className="font-display text-2xl">Claim Risk Auditor</div>
                      <p className="text-sm text-muted-foreground">
                        Risk level: {output.claimRiskAudit.riskLevel}. Score: {output.claimRiskAudit.score}/100.
                      </p>
                    </div>
                  </div>
                  <Badge className={output.claimRiskAudit.riskLevel === "high" ? "bg-red-600 text-white" : "bg-white/10 text-white"}>
                    {output.claimRiskAudit.riskClaims.length} risky claims
                  </Badge>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {output.claimRiskAudit.riskClaims.length ? output.claimRiskAudit.riskClaims.map((claim) => (
                    <div key={`${claim.claim}-${claim.reason}`} className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm">
                      <div className="font-semibold text-red-100">{claim.claim}</div>
                      <p className="mt-1 text-muted-foreground">{claim.reason}</p>
                    </div>
                  )) : (
                    <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">
                      No unsupported high-risk claims detected.
                    </div>
                  )}
                </div>
              </div>
            )}
            {loading && (
              <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
                <ListingFlowLoader
                  compact
                  label="Generating platform-ready listing copy..."
                />
              </div>
            )}
            <Button onClick={generate} disabled={loading} className="bg-primary text-primary-foreground hover:bg-red-500">
              {loading ? (
                <ListingFlowLoader compact label="Generating..." className="text-white" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Listing
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="outputs" className="p-5">
            {!output ? (
              <p className="text-sm text-muted-foreground">Generate a listing to review platform outputs.</p>
            ) : (
              <Tabs defaultValue="facebookListing">
                <TabsList className="grid grid-cols-6">
                  {outputTabs.map(([key, label]) => <TabsTrigger key={key} value={key}>{label}</TabsTrigger>)}
                </TabsList>
                {outputTabs.map(([key, label]) => {
                  const value = output[key];
                  const text = Array.isArray(value) ? value.join("\n") : String(value || "");
                  return (
                    <TabsContent key={key} value={key} className="space-y-4 pt-5">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{label}</h3>
                        <div className="flex gap-2">
                          <Button variant="outline" className="border-white/10 bg-white/5" onClick={() => copy(value)}>
                            <Clipboard className="h-4 w-4" /> Copy
                          </Button>
                          <Button variant="outline" className="border-white/10 bg-white/5" onClick={() => setActiveTab("generate")}>
                            Regenerate this section
                          </Button>
                          <Button onClick={() => setActiveTab("save")} className="bg-primary text-primary-foreground hover:bg-red-500">
                            <Save className="h-4 w-4" /> Save
                          </Button>
                        </div>
                      </div>
                      <Textarea rows={16} value={text} onChange={(event) => updateOutput(key, event.target.value)} />
                    </TabsContent>
                  );
                })}
                {!!output.reviewWarnings?.length && (
                  <div className="mt-5 rounded-md border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                    <strong>Review warnings:</strong> {output.reviewWarnings.join(" ")}
                  </div>
                )}
                {!!output.featureHighlights?.length && (
                  <div className="mt-5 rounded-xl border border-white/10 bg-white/[.025] p-4">
                    <div className="mb-3 text-sm font-semibold text-white">Feature Highlights</div>
                    <div className="flex flex-wrap gap-2">
                      {output.featureHighlights.map((feature) => {
                        const uncertain = feature.status === "unsure" || feature.status === "ask_user";
                        return (
                          <div
                            key={`${feature.label}-${feature.status}`}
                            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                              uncertain
                                ? "border-amber-400/25 bg-amber-400/10 text-amber-100"
                                : "border-white/10 bg-white/[.035] text-zinc-100"
                            }`}
                            title={feature.reason}
                          >
                            {uncertain ? <HelpCircle className="h-4 w-4 text-amber-300" /> : <CheckCircle2 className="h-4 w-4 text-primary" />}
                            {formatFeatureLabel(feature)}
                          </div>
                        );
                      })}
                    </div>
                    {!!output.featureQuestions?.length && (
                      <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
                        <div className="font-semibold">Ask staff to confirm:</div>
                        <ul className="mt-2 list-inside list-disc space-y-1">
                          {output.featureQuestions.map((question) => <li key={question}>{question}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </Tabs>
            )}
          </TabsContent>

          <TabsContent value="save" className="space-y-5 p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(value) => value && setStatus(value as ListingStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Tags</Label>
                <Input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="sedan, clean trade, website" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Internal notes</Label>
              <Textarea value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} placeholder="Notes for the dealership team" />
            </div>
            <Button onClick={saveListing} disabled={!output || loading} className="bg-primary text-primary-foreground hover:bg-red-500">
              {loading ? (
                <ListingFlowLoader compact label="Saving..." className="text-white" />
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save to shared dealership library
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
