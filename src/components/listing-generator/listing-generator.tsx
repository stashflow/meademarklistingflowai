"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Archive, Check, CheckCircle2, ChevronRight, Clipboard, FileText, HelpCircle, ImageIcon, PanelLeftClose, PanelLeftOpen, ScanLine, Save, ShieldAlert, Sparkles, Wand2 } from "lucide-react";
import { formatFeatureLabel } from "@/lib/generation/feature-highlights";
import { hasMeaningfulDraftData } from "@/lib/drafts";
import { isCompleteVin, parseVehicleStartInput } from "@/lib/generation/vehicle-start";
import { ListingFlowLoader } from "@/components/common/listingflow-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { scoreListingPerformance } from "@/lib/listing-performance";
import { normalizeNumber } from "@/lib/validators/listing";
import type { DraftSourceConflict, ListingOutput, ListingPlatform, ListingStatus, TrimResearchResult, VehicleDraft, VehicleInput } from "@/types/listing";
import type { FillInQuestion } from "@/lib/generation/fill-in";
import type { ListingDefaults } from "@/types/dealership";

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

const platforms = ["Facebook Marketplace", "CarGurus", "Dealer Website", "Craigslist", "AutoTrader-style", "Short SEO", "Highlights only"];

const outputTabs: Array<[keyof ListingOutput, string]> = [
  ["facebookListing", "Facebook"],
  ["carGurusListing", "CarGurus"],
  ["websiteDescription", "Website"],
  ["craigslistListing", "Craigslist"],
  ["seoMetaDescription", "SEO"],
  ["highlights", "Highlights"],
  ["disclaimer", "Notes / Disclaimers"],
];

export function ListingGenerator({
  dealershipId,
  initialVin = "",
  listingDefaults = {},
  autoOpenFillIn = true,
  fillInIntroSeen = false,
  initialDraft = null,
}: {
  dealershipId: string;
  initialVin?: string;
  listingDefaults?: ListingDefaults;
  autoOpenFillIn?: boolean;
  fillInIntroSeen?: boolean;
  initialDraft?: VehicleDraft | null;
}) {
  const router = useRouter();
  const [stagedDraft] = useState(() => {
    if (initialDraft) {
      return {
        vehicle: initialDraft.input_data || {},
        message: "Draft restored.",
      };
    }
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
  const [workspaceView, setWorkspaceView] = useState<"facts" | "fill_in" | "copy">(initialDraft?.current_step || "facts");
  const [vehicle, setVehicle] = useState<VehicleInput>(stagedDraft.vehicle);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["Facebook Marketplace", "CarGurus", "Dealer Website"]);
  const [tone, setTone] = useState("Use dealership default");
  const [length, setLength] = useState<"short" | "standard" | "detailed">("standard");
  const [useStyleProfile, setUseStyleProfile] = useState(true);
  const [customInstructions, setCustomInstructions] = useState("");
  const [wordsToAvoid, setWordsToAvoid] = useState("");
  const [ctaOverride, setCtaOverride] = useState(listingDefaults.defaultCTA || "");
  const [useSavedFinancing, setUseSavedFinancing] = useState(false);
  const [useSavedWarranty, setUseSavedWarranty] = useState(false);
  const [output, setOutput] = useState<ListingOutput | null>(initialDraft?.generated_output || null);
  const [status, setStatus] = useState<ListingStatus>("draft");
  const [tags, setTags] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [message, setMessage] = useState(stagedDraft.message);
  const [technicalDetails, setTechnicalDetails] = useState("");
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
  const [attentionFields, setAttentionFields] = useState<string[]>([]);
  const [quickFillLoading, setQuickFillLoading] = useState<string | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [startText, setStartText] = useState(initialVin);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceEvidenceId, setSourceEvidenceId] = useState<string | null>(null);
  const [sourceConflicts, setSourceConflicts] = useState<DraftSourceConflict[]>([]);
  const [trimResearch, setTrimResearch] = useState<TrimResearchResult | null>(null);
  const [trimResearchLoading, setTrimResearchLoading] = useState(false);
  const [recentDrafts, setRecentDrafts] = useState<VehicleDraft[]>([]);
  const [draftId, setDraftId] = useState<string | null>(initialDraft?.id || null);
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved" | "offline">("idle");
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [activePlatform, setActivePlatform] = useState<ListingPlatform>(initialDraft?.active_platform || "facebook");
  const [linkedListingId, setLinkedListingId] = useState<string | null>(initialDraft?.listing_id || null);
  const [batchItemId, setBatchItemId] = useState<string | null>(initialDraft?.batch_item_id || null);
  const [fillInNoticeVisible, setFillInNoticeVisible] = useState(autoOpenFillIn && !fillInIntroSeen);
  const lastDecodedVin = useRef("");
  const autosaveReady = useRef(false);
  const draftVersionRef = useRef(initialDraft?.autosave_version || 1);

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
    if (!vehicle.trim) notes.push("Trim is unconfirmed; trim-specific features will stay out of public copy.");
    if (!vehicle.condition && !vehicle.overallCondition) notes.push("Condition is required for reliable copy.");
    if (!vehicle.keyFeatures && !vehicle.sellerNotes) notes.push("Add features or seller notes for stronger selling angles.");
    if (vehicle.vinDecoded === "true" && !vinConfirmed) notes.push("Confirm decoded VIN details before generating.");
    if (output?.reviewWarnings?.length) notes.push("Review AI warnings before publishing.");
    if (!notes.length) notes.push("Listing is ready for staff review.");
    return notes;
  }, [output, vehicle, vinConfirmed]);

  const generationPreferences = useMemo(() => ({
    platforms: selectedPlatforms,
    tone,
    length,
    useStyleProfile,
    customInstructions,
    wordsToAvoid,
    ctaOverride,
  }), [ctaOverride, customInstructions, length, selectedPlatforms, tone, useStyleProfile, wordsToAvoid]);

  const selectedPlatformText = useMemo(() => {
    if (!output) return "";
    if (activePlatform === "facebook") return output.facebookListing || "";
    if (activePlatform === "cargurus") return output.carGurusListing || "";
    return output.websiteDescription || "";
  }, [activePlatform, output]);

  const selectedTrimSpecification = useMemo(
    () => trimResearch?.specifications.find((specification) =>
      specification.trim.toLowerCase() === String(vehicle.trim || "").toLowerCase(),
    ) || null,
    [trimResearch, vehicle.trim],
  );

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/drafts?dealershipId=${encodeURIComponent(dealershipId)}`)
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled) setRecentDrafts(payload.drafts || []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [dealershipId]);

  useEffect(() => {
    if (!isCompleteVin(vehicle.vin) || vehicle.vin === lastDecodedVin.current || decodingVin) return;
    const timer = window.setTimeout(() => {
      lastDecodedVin.current = String(vehicle.vin || "");
      decodeVin();
    }, 420);
    return () => window.clearTimeout(timer);
  // decodeVin intentionally reads the latest vehicle state after the debounce.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodingVin, vehicle.vin]);

  useEffect(() => {
    if (!hasMeaningfulDraftData(vehicle)) return;
    if (!autosaveReady.current) {
      autosaveReady.current = true;
    }
    const timer = window.setTimeout(async () => {
      setDraftStatus("saving");
      try {
        const response = await fetch(draftId ? `/api/drafts/${draftId}` : "/api/drafts", {
          method: draftId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            draftId
              ? {
                  inputData: vehicle,
                  preferences: generationPreferences,
                  generatedOutput: output,
                  currentStep: workspaceView,
                  activePlatform,
                  status: output ? "generated" : "draft",
                  listingId: linkedListingId,
                  autosaveVersion: draftVersionRef.current,
                }
              : {
                  dealershipId,
                  inputData: vehicle,
                  preferences: generationPreferences,
                },
          ),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Autosave failed.");
        const saved = payload.draft as VehicleDraft;
        setDraftId(saved.id);
        draftVersionRef.current = saved.autosave_version;
        setDraftStatus("saved");
        setRecentDrafts((current) => [saved, ...current.filter((item) => item.id !== saved.id)].slice(0, 30));
      } catch {
        setDraftStatus("offline");
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [activePlatform, dealershipId, draftId, generationPreferences, linkedListingId, output, vehicle, workspaceView]);

  useEffect(() => {
    function typingTarget(target: EventTarget | null) {
      const element = target as HTMLElement | null;
      return Boolean(element?.closest("input, textarea, select, [contenteditable='true'], [role='textbox']"));
    }
    function onShortcut(event: KeyboardEvent) {
      if (typingTarget(event.target)) return;
      const command = event.metaKey || event.ctrlKey;
      if (!command) return;
      if (event.key === "Enter") {
        event.preventDefault();
        generate();
      } else if (event.shiftKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        if (selectedPlatformText) copy(selectedPlatformText);
      } else if (event.shiftKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        saveAndNext();
      } else if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        setMessage("Draft saved automatically.");
      }
    }
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  });

  function updateVehicle(key: keyof VehicleInput, value: string) {
    setVehicle((current) => ({ ...current, [key]: value }));
    setAttentionFields((current) => current.filter((field) => field !== key));
    if (["vin", "year", "make", "model", "trim"].includes(key)) {
      setVinConfirmed(false);
    }
  }

  function startFromText() {
    const parsed = parseVehicleStartInput(startText);
    if (!hasMeaningfulDraftData(parsed)) {
      setMessage("Enter a VIN or basic vehicle name such as 2021 Audi A4.");
      return;
    }
    const nextVehicle = { ...vehicle, ...parsed };
    setVehicle(nextVehicle);
    setWorkspaceView("facts");
    setActiveTab("vehicle");
    setMessage(isCompleteVin(parsed.vin) ? "VIN recognized. Decoding automatically." : "Vehicle started. Add what you know; VIN can be added later.");
    if (
      autoOpenFillIn &&
      !isCompleteVin(parsed.vin) &&
      nextVehicle.year &&
      nextVehicle.make &&
      nextVehicle.model &&
      (!nextVehicle.trim || !nextVehicle.mileage || !nextVehicle.condition)
    ) {
      window.setTimeout(() => startFillIn(nextVehicle), 180);
    }
  }

  function loadDraft(draft: VehicleDraft) {
    setDraftId(draft.id);
    draftVersionRef.current = draft.autosave_version;
    setVehicle(draft.input_data || {});
    setOutput(draft.generated_output || null);
    setLinkedListingId(draft.listing_id);
    setBatchItemId(draft.batch_item_id);
    setActivePlatform(draft.active_platform || "facebook");
    setWorkspaceView(draft.current_step || "facts");
    setActiveTab(draft.current_step === "copy" ? "outputs" : "vehicle");
    setVinConfirmed(Boolean(draft.input_data?.year && draft.input_data?.make && draft.input_data?.model));
    setMessage("Draft restored.");
  }

  function startNextVehicle() {
    lastDecodedVin.current = "";
    setDraftId(null);
    draftVersionRef.current = 1;
    setLinkedListingId(null);
    setBatchItemId(null);
    setVehicle({});
    setOutput(null);
    setStartText("");
    setSourceText("");
    setSourceConflicts([]);
    setTrimResearch(null);
    setFillInOpen(false);
    setWorkspaceView("facts");
    setActiveTab("vehicle");
    setDraftStatus("idle");
    setMessage("Ready for the next vehicle.");
  }

  async function archiveCurrentDraft() {
    if (!draftId) {
      startNextVehicle();
      return;
    }
    await fetch(`/api/drafts/${draftId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived", autosaveVersion: draftVersionRef.current }),
    });
    setRecentDrafts((current) => current.filter((draft) => draft.id !== draftId));
    startNextVehicle();
  }

  async function acknowledgeFillInIntro() {
    setFillInNoticeVisible(false);
    const supabase = createSupabaseBrowserClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data: profile } = await supabase.from("profiles").select("feature_settings").eq("user_id", auth.user.id).maybeSingle();
    await supabase
      .from("profiles")
      .update({
        feature_settings: {
          ...(profile?.feature_settings || {}),
          fillInIntroSeen: true,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", auth.user.id);
  }

  async function researchTrims(sourceVehicle?: VehicleInput) {
    const targetVehicle = sourceVehicle || vehicle;
    if (!targetVehicle.year || !targetVehicle.make || !targetVehicle.model) return;
    setTrimResearchLoading(true);
    try {
      const response = await fetch("/api/trim/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealershipId,
          year: targetVehicle.year,
          make: targetVehicle.make,
          model: targetVehicle.model,
          trim: targetVehicle.trim,
          market: "US",
        }),
      });
      const payload = await response.json();
      if (response.ok) setTrimResearch(payload);
    } finally {
      setTrimResearchLoading(false);
    }
  }

  function needsField(key: keyof VehicleInput) {
    if (attentionFields.includes(key)) return true;
    if (!highlightMissing) return false;
    return ["mileage", "condition", "overallCondition", "keyFeatures", "sellerNotes"].includes(String(key)) && !vehicle[key];
  }

  function mergeCommaText(...values: Array<string | undefined>) {
    const seen = new Set<string>();
    return values
      .flatMap((value) => String(value || "").split(","))
      .map((value) => value.trim())
      .filter((value) => {
        const key = value.toLowerCase();
        if (!value || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .join(", ");
  }

  function applyStructuredFillPayload(payload: {
    updates?: Partial<VehicleInput>;
    featureHighlights?: Array<{ label: string; status: string }>;
    warnings?: string[];
    confidenceNotes?: string[];
    missingFields?: string[];
  }) {
    const features = payload.featureHighlights?.length
      ? payload.featureHighlights.map((feature) =>
          feature.status === "unsure" || feature.status === "ask_user"
            ? `${feature.label} [unsure if applicable]`
            : feature.label,
        ).join(", ")
      : "";

    const previewVehicle = {
      ...vehicle,
      ...(payload.updates || {}),
      keyFeatures: mergeCommaText(payload.updates?.keyFeatures || vehicle.keyFeatures, features),
    };
    const resolvedMissingFields = (payload.missingFields || []).filter(
      (field) => !String(previewVehicle[field as keyof VehicleInput] || "").trim(),
    );
    setVehicle((current) => {
      const nextVehicle = {
        ...current,
        ...(payload.updates || {}),
        keyFeatures: mergeCommaText(
          payload.updates?.keyFeatures || current.keyFeatures,
          features,
        ),
        validatedFeaturesJson: payload.featureHighlights?.length
          ? JSON.stringify(payload.featureHighlights)
          : current.validatedFeaturesJson,
      };
      return {
        ...nextVehicle,
        featureClarificationQuestions: [
          ...(payload.warnings || []),
          ...(resolvedMissingFields.length ? [`Still missing: ${resolvedMissingFields.join(", ")}`] : []),
        ].join("\n"),
      };
    });
    setFillInWarnings([...(payload.warnings || []), ...(payload.confidenceNotes || [])]);
    setAttentionFields(resolvedMissingFields);
    setHighlightMissing(true);
  }

  async function startFillIn(sourceVehicle?: VehicleInput) {
    const targetVehicle = sourceVehicle || vehicle;
    setFillInOpen(true);
    setWorkspaceView("fill_in");
    setFillInLoading(true);
    setFillInWarnings([]);
    setMessage("");
    if (targetVehicle.year && targetVehicle.make && targetVehicle.model && !trimResearch) {
      researchTrims(targetVehicle);
    }
    try {
      const response = await fetch("/api/fill-in/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealershipId, vehicle: targetVehicle }),
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
      applyStructuredFillPayload(payload);
      setWorkspaceView("facts");
      setMessage("LF Fill In added safe fields and feature highlights. Review anything marked unsure before generating.");
    } catch (error) {
      setActiveTab("vehicle");
      setMessage(error instanceof Error ? error.message : "LF Fill In paused. Review the current vehicle details and try again.");
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

  async function quickFillField(key: keyof VehicleInput) {
    setQuickFillLoading(String(key));
    setMessage("");
    try {
      const response = await fetch("/api/fill-in/field", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealershipId, vehicle, field: key }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Could not fill this field.");
      if (!payload.canFill) {
        setMessage(payload.message || "Sorry, not enough info yet.");
        return;
      }
      updateVehicle(key, payload.value);
      setMessage(payload.message || "LF quick fill updated that field.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not fill this field.");
    } finally {
      setQuickFillLoading(null);
    }
  }

  async function extractSourceText() {
    const text = sourceText.trim();
    if (text.length < 20) {
      setMessage("Paste an old listing, inventory note, or window-sticker notes first.");
      return;
    }
    setSourceLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/fill-in/source-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealershipId, vehicle, sourceText: text, draftId: draftId || undefined }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Smart intake could not read that text.");
      applyStructuredFillPayload({
        ...payload,
        updates: payload.blankFieldUpdates || {},
      });
      setSourceConflicts(payload.conflicts || []);
      setSourceEvidenceId(payload.sourceId || null);
      setMessage(
        payload.conflicts?.length
          ? `Smart intake filled blank fields and found ${payload.conflicts.length} difference${payload.conflicts.length === 1 ? "" : "s"} for review.`
          : payload.missingFields?.length
          ? `Smart intake filled what it could. Review highlighted fields: ${payload.missingFields.join(", ")}.`
          : "Smart intake filled the form from the pasted text. Review the details, then continue.",
      );
    } catch (error) {
      setActiveTab("vehicle");
      setMessage(error instanceof Error ? error.message : "Smart intake paused. Paste a clearer old listing or add details manually.");
    } finally {
      setSourceLoading(false);
    }
  }

  function resolveSourceConflict(conflict: DraftSourceConflict, replace: boolean) {
    if (replace) updateVehicle(conflict.field, conflict.extractedValue);
    setSourceConflicts((current) => current.filter((item) => item.field !== conflict.field));
  }

  async function deleteSourceEvidence() {
    if (sourceEvidenceId) {
      await fetch(`/api/draft-sources/${sourceEvidenceId}`, { method: "DELETE" });
    }
    setSourceEvidenceId(null);
    setSourceText("");
    setSourceConflicts([]);
    setMessage("Pasted source text removed from this draft.");
  }

  function LfQuickFillButton({ field }: { field: keyof VehicleInput }) {
    return (
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        disabled={quickFillLoading === field}
        onClick={() => quickFillField(field)}
        className="absolute right-2 top-2 z-10 border border-white/10 bg-[#0B0D10]/85 p-1 hover:bg-white/10"
        title="LF quick fill"
      >
        <span className="relative h-4 w-4 overflow-hidden rounded-sm">
          <Image src="/brand/lf-favicon.png" alt="LF quick fill" fill sizes="16px" className="object-cover" />
        </span>
      </Button>
    );
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
      const decodedVehicle = { ...vehicle, ...payload.decoded, vin };
      setVehicle(decodedVehicle);
      setVinConfirmed(false);
      setMessage("VIN decoded. Confirm the vehicle details, then add mileage, condition, and selling points.");
      if (
        autoOpenFillIn &&
        (!decodedVehicle.trim ||
          !decodedVehicle.engine ||
          !decodedVehicle.transmission ||
          !decodedVehicle.drivetrain ||
          !decodedVehicle.mileage ||
          !decodedVehicle.condition)
      ) {
        window.setTimeout(() => startFillIn(decodedVehicle), 180);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not decode this VIN.");
    } finally {
      setDecodingVin(false);
    }
  }

  function guideGenerationFailure(payload: { code?: string; userMessage?: string; message?: string; issues?: string[] }) {
    const reference = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8).toUpperCase()
      : String(Date.now()).slice(-8);
    setTechnicalDetails(`Reference ${reference} · ${payload.code || "GENERATION_FAILED"} · ${payload.message || "No additional server detail was returned."}`);
    if (payload.code === "INPUT_QUALITY") {
      const fields = ["mileage", "condition", "overallCondition", "keyFeatures", "sellerNotes"];
      setHighlightMissing(true);
      setAttentionFields(fields);
      setActiveTab("vehicle");
      setMessage(payload.userMessage || "ListingFlow needs a few vehicle details before it can generate. The fields to review are highlighted.");
      window.setTimeout(() => {
        const target = document.querySelector<HTMLElement>(`[data-field="${fields[0]}"]`);
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
        target?.focus();
      }, 80);
      return;
    }

    if (payload.code === "TRIAL_LIMIT_REACHED" || payload.code === "PLAN_LIMIT_REACHED") {
      setActiveTab("generate");
      setMessage(payload.message || "This dealership has reached the current generation limit. Open Billing to adjust the plan.");
      return;
    }

    if (payload.code === "RATE_LIMITED") {
      setActiveTab("generate");
      setMessage("Generation is cooling down for a moment. Wait a few minutes, then try again.");
      return;
    }

    if (payload.code === "INVALID_INPUT") {
      setHighlightMissing(true);
      setActiveTab("vehicle");
      setMessage("Some vehicle details need attention. Review highlighted fields, then try Generate again.");
      return;
    }

    setActiveTab("generate");
    setMessage("Generation paused during the final copy step. Your vehicle details are still saved on this screen. Try again, or adjust the highlighted details first.");
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
    setTechnicalDetails("");
    try {
      const generationVehicle = {
        ...vehicle,
        financingInfo: vehicle.financingInfo || (useSavedFinancing ? listingDefaults.financingLanguage : undefined),
        warrantyInfo: vehicle.warrantyInfo || (useSavedWarranty ? listingDefaults.warrantyLanguage : undefined),
      };
      const response = await fetch("/api/generate-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealershipId,
          vehicle: generationVehicle,
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

      if (!response.ok) {
        guideGenerationFailure(payload);
        return;
      }

      setOutput(payload.output);
      setActiveTab("outputs");
      setWorkspaceView("copy");
      await persistListing(payload.output, true);
      setMessage(`Generated successfully. Usage: ${payload.usage.count}/${payload.usage.limit}`);
    } catch {
      guideGenerationFailure({ code: "GENERATION_FAILED" });
    } finally {
      setLoading(false);
    }
  }

  async function persistListing(generatedOutput: ListingOutput, silent = false) {
    if (status === "published" && generatedOutput.claimRiskAudit?.riskLevel === "high") {
      setActiveTab("generate");
      setWorkspaceView("facts");
      setMessage("Publishing is blocked until the unsupported high-risk claims in Claim Risk Auditor are resolved. Drafting and copying remain available.");
      return null;
    }
    setLoading(true);
    if (!silent) setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Please log in before saving.");
      const imageRows = (vehicle.imageUrls || "")
        .split("\n")
        .map((url, index) => ({ url: url.trim(), index }))
        .filter((item) => item.url);
      const performance = scoreListingPerformance(vehicle, generatedOutput, imageRows.length);
      const listingPayload = {
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
        generated_output: generatedOutput,
        status,
        approval_status: status,
        quality_score: performance.listingScore,
        risk_level: generatedOutput.claimRiskAudit?.riskLevel ?? "unknown",
        risk_summary: generatedOutput.claimRiskAudit || {},
        listing_score: performance.listingScore,
        completeness_score: performance.completenessScore,
        seo_score: performance.seoScore,
        conversion_score: performance.conversionScore,
        platform_score: performance.platformScore,
        compliance_score: performance.complianceScore,
        lead_potential_score: performance.leadPotentialScore,
        search_visibility_score: performance.searchVisibilityScore,
        missing_fields: performance.missingFields,
        risk_flags: performance.riskFlags,
        suggested_fixes: performance.suggestedFixes,
        photo_checklist: performance.photoChecklist,
        tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        internal_notes: internalNotes || null,
        updated_at: new Date().toISOString(),
      };
      const query = linkedListingId
        ? supabase.from("listings").update(listingPayload).eq("id", linkedListingId)
        : supabase.from("listings").insert(listingPayload);
      const { data: saved, error } = await query.select("id").single();
      if (error) throw error;
      const savedId = saved?.id || linkedListingId;
      if (savedId) setLinkedListingId(savedId);
      if (savedId && batchItemId) {
        await supabase
          .from("bulk_inventory_items")
          .update({ status: "generated", listing_id: savedId, updated_at: new Date().toISOString() })
          .eq("id", batchItemId);
      }
      if (imageRows.length && !linkedListingId) {
        await supabase.from("listing_images").insert(imageRows.map((item) => ({
          listing_id: savedId || null,
          dealership_id: dealershipId,
          created_by: auth.user.id,
          image_url: item.url,
          alt_text: [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle image",
          sort_order: item.index,
          metadata: { source: "manual_url", photoNotes: vehicle.photoNotes || null },
        })));
      }
      await supabase.from("listing_quality_reports").insert({
        listing_id: savedId || null,
        dealership_id: dealershipId,
        created_by: auth.user.id,
        score: performance.listingScore,
        risk_level: generatedOutput.claimRiskAudit?.riskLevel ?? "unknown",
        missing_details: performance.missingFields,
        risk_claims: generatedOutput.claimRiskAudit?.riskClaims || [],
        recommendations: performance.suggestedFixes.map((fix) => fix.detail),
      });
      await supabase.from("feature_events").insert({
        dealership_id: dealershipId,
        user_id: auth.user.id,
        feature: "listing_library",
        action: "save_listing",
        route: "/dashboard/new-listing",
        metadata: { status, riskLevel: generatedOutput.claimRiskAudit?.riskLevel || "unknown", automatic: silent },
      });
      await supabase.from("audit_logs").insert({
        dealership_id: dealershipId,
        actor_user_id: auth.user.id,
        entity_type: "listing",
        entity_id: savedId || null,
        action: "saved",
        after_data: { vehicle, status, riskLevel: generatedOutput.claimRiskAudit?.riskLevel || "unknown", listingScore: performance.listingScore },
      });
      if (!silent) setMessage("Saved to the shared dealership library.");
      return savedId || null;
    } catch (error) {
      if (!silent) setMessage(error instanceof Error ? error.message : "Could not save this listing.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function saveListing() {
    if (!output) return;
    await persistListing(output);
  }

  async function saveAndNext() {
    if (output) await persistListing(output);
    if (batchItemId) {
      const supabase = createSupabaseBrowserClient();
      const { data: batchItem } = await supabase
        .from("bulk_inventory_items")
        .select("batch_id")
        .eq("id", batchItemId)
        .maybeSingle();
      if (batchItem?.batch_id) {
        router.push(`/dashboard/bulk-intake/${batchItem.batch_id}?after=${batchItemId}`);
        return;
      }
    }
    startNextVehicle();
  }

  async function saveAndReturnHome() {
    if (output) await persistListing(output);
    router.push("/dashboard");
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
    <div className={`grid min-h-[calc(100vh-7rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#0B0E13] shadow-[0_28px_90px_rgba(0,0,0,.28)] ${
      railCollapsed ? "xl:grid-cols-[56px_minmax(0,1fr)_360px]" : "xl:grid-cols-[250px_minmax(0,1fr)_360px]"
    }`}>
      <aside className="hidden min-w-0 border-r border-white/8 bg-[#090C10] xl:block">
        <div className="flex h-14 items-center justify-between border-b border-white/8 px-3">
          {!railCollapsed && <span className="text-xs font-semibold uppercase text-zinc-500">Recent vehicles</span>}
          <Button type="button" size="icon-sm" variant="ghost" onClick={() => setRailCollapsed((current) => !current)} title="Toggle recent vehicles">
            {railCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
        {!railCollapsed && (
          <div className="max-h-[calc(100vh-11rem)] space-y-1 overflow-y-auto p-2">
            <Button type="button" onClick={startNextVehicle} className="mb-2 w-full justify-start bg-primary hover:bg-red-500">
              <Sparkles className="h-4 w-4" />
              New vehicle
            </Button>
            {recentDrafts.map((draft) => (
              <button
                key={draft.id}
                type="button"
                onClick={() => loadDraft(draft)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  draft.id === draftId
                    ? "border-red-500/35 bg-red-500/10"
                    : "border-transparent hover:border-white/10 hover:bg-white/[.035]"
                }`}
              >
                <div className="truncate text-sm font-medium text-zinc-100">{draft.title || "Untitled vehicle"}</div>
                <div className="mt-1 truncate font-mono text-[11px] text-zinc-500">{draft.vin || draft.stock_number || "Draft"}</div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-zinc-500">
                  <span className="truncate">{draft.exterior_color || "Color not set"}</span>
                  <span>{draft.status}</span>
                </div>
              </button>
            ))}
            {!recentDrafts.length && (
              <p className="px-2 py-6 text-xs leading-5 text-zinc-500">Vehicle drafts will appear here automatically.</p>
            )}
          </div>
        )}
      </aside>

      <section className="min-w-0 bg-[#0E1117]">
      <div className="border-b border-white/8 px-5 py-4">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="font-display text-2xl font-semibold">Listing workspace</h1>
            <p className="mt-1 text-sm text-muted-foreground">Start with a VIN, vehicle name, or old listing. ListingFlow keeps the draft saved.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => startFillIn()} className="bg-white text-[#0B0D10] hover:bg-zinc-200">
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
            <Badge variant="outline" className={`w-fit border-white/10 ${
              draftStatus === "offline" ? "text-amber-200" : draftStatus === "saving" ? "text-zinc-300" : "text-emerald-200"
            }`}>
              {draftStatus === "saving" ? "Saving..." : draftStatus === "offline" ? "Offline" : draftStatus === "saved" ? "Saved" : "New draft"}
            </Badge>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Input
            value={startText}
            onChange={(event) => setStartText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                startFromText();
              }
            }}
            placeholder="Enter VIN or vehicle, for example 2021 Audi A4"
            className="h-11 min-w-0 bg-[#090C10]"
          />
          <Button type="button" onClick={startFromText} className="shrink-0 bg-primary hover:bg-red-500">
            Start
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-3 rounded-xl border border-white/8 bg-[#090C10] p-1 md:hidden">
          {(["facts", "fill_in", "copy"] as const).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => {
                setWorkspaceView(view);
                if (view === "fill_in") startFillIn();
                if (view === "copy") setActiveTab("outputs");
              }}
              className={`rounded-lg px-3 py-2 text-xs font-medium capitalize ${workspaceView === view ? "bg-white/10 text-white" : "text-zinc-500"}`}
            >
              {view === "fill_in" ? "Fill In" : view}
            </button>
          ))}
        </div>
      </div>
      <div className="p-0">
        {message && (
          <div className="m-5 rounded-lg border border-white/10 bg-white/[.035] p-4 text-sm text-muted-foreground">
            {message}
            {technicalDetails && (
              <details className="mt-3 border-t border-white/8 pt-3 text-xs">
                <summary className="cursor-pointer text-zinc-500">Technical details</summary>
                <p className="mt-2 font-mono leading-5 text-zinc-500">{technicalDetails}</p>
              </details>
            )}
          </div>
        )}
        {fillInNoticeVisible && fillInOpen && (
          <div className="mx-5 mt-5 flex flex-col justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/[.07] p-4 text-sm sm:flex-row sm:items-center">
            <p className="leading-6 text-zinc-300">
              LF Fill In opens automatically when important vehicle details are missing. You can turn this off anytime under Settings → LF Behavior.
            </p>
            <Button type="button" size="sm" variant="outline" onClick={acknowledgeFillInIntro} className="shrink-0 border-white/10 bg-white/[.03]">
              Got it
            </Button>
          </div>
        )}
        {fillInOpen && (
          <div className="m-5 overflow-hidden rounded-2xl border border-red-500/25 bg-[#0B0D10]/95">
            <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(220,38,38,0.18),transparent_42%)] p-5">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-white/10 bg-[#111827] shadow-[0_0_28px_rgba(220,38,38,0.18)]">
                    <Image src="/brand/lf-favicon.png" alt="ListingFlow" fill sizes="48px" className="object-cover" />
                  </div>
                  <div>
                    <div className="font-display text-2xl text-white">LF Fill In</div>
                    <p className="text-sm text-muted-foreground">A guided intake that confirms identity, trim, specs, condition, and safe feature highlights.</p>
                  </div>
                </div>
                <Button variant="ghost" onClick={() => setFillInOpen(false)}>Close</Button>
              </div>
              {!!fillInQuestions.length && (
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Question {Math.min(fillInIndex + 1, fillInQuestions.length)} of {fillInQuestions.length}</span>
                    <span>{Math.round(((fillInIndex + 1) / fillInQuestions.length) * 100)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${((fillInIndex + 1) / fillInQuestions.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="p-5">
              {fillInLoading ? (
                <div className="rounded-xl border border-white/10 bg-white/[.035] p-5">
                  <ListingFlowLoader compact label="LF Fill In is working" />
                </div>
              ) : fillInQuestions[fillInIndex] ? (
                <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-white/10 text-zinc-300">
                          {fillInQuestions[fillInIndex].category || "intake"}
                        </Badge>
                        {fillInQuestions[fillInIndex].required && (
                          <Badge className="bg-primary/90 text-white">Required</Badge>
                        )}
                      </div>
                      <Label className="text-lg text-white">{fillInQuestions[fillInIndex].label}</Label>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{fillInQuestions[fillInIndex].helper}</p>
                      {fillInQuestions[fillInIndex].why && (
                        <p className="mt-2 rounded-lg border border-white/10 bg-white/[.035] p-3 text-xs leading-5 text-zinc-300">
                          {fillInQuestions[fillInIndex].why}
                        </p>
                      )}
                    </div>
                    {fillInQuestions[fillInIndex].category === "identity" && trimResearchLoading && (
                      <div className="rounded-xl border border-white/10 bg-white/[.025] p-4">
                        <ListingFlowLoader compact label="Checking likely trims..." />
                      </div>
                    )}
                    {fillInQuestions[fillInIndex].category === "identity" && !!trimResearch?.candidates.length && (
                      <div className="space-y-3">
                        <div className="text-xs font-semibold uppercase text-zinc-500">Likely trims</div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {trimResearch.candidates.map((candidate) => (
                            <button
                              key={candidate.name}
                              type="button"
                              onClick={() => {
                                setFillInAnswer(candidate.name);
                                updateVehicle("trim", candidate.name);
                              }}
                              className={`rounded-xl border p-3 text-left transition ${
                                fillInAnswer === candidate.name || vehicle.trim === candidate.name
                                  ? "border-red-500/40 bg-red-500/10"
                                  : "border-white/10 bg-white/[.025] hover:border-white/20"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-white">{candidate.name}</span>
                                <Badge variant="outline" className="border-white/10 text-[10px]">{candidate.confidence}</Badge>
                              </div>
                              <p className="mt-2 text-xs leading-5 text-zinc-400">{candidate.summary}</p>
                              {!!candidate.indicators.length && (
                                <p className="mt-2 text-[11px] text-zinc-500">{candidate.indicators.slice(0, 3).join(" · ")}</p>
                              )}
                            </button>
                          ))}
                        </div>
                        <details className="rounded-xl border border-white/10 bg-white/[.02] p-3 text-xs">
                          <summary className="cursor-pointer font-medium text-zinc-300">Why these trims?</summary>
                          <p className="mt-2 leading-5 text-zinc-500">{trimResearch.warning}</p>
                          {!!trimResearch.sources.length && (
                            <div className="mt-3 space-y-1">
                              {trimResearch.sources.map((source) => (
                                <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="block truncate text-red-200 hover:text-red-100">
                                  {source.label}
                                </a>
                              ))}
                            </div>
                          )}
                        </details>
                      </div>
                    )}
                    {fillInQuestions[fillInIndex].inputType === "choice" && !!fillInQuestions[fillInIndex].options?.length && (
                      <div className="flex flex-wrap gap-2">
                        {fillInQuestions[fillInIndex].options?.map((option) => (
                          <Button
                            key={option}
                            type="button"
                            variant={fillInAnswer === option ? "default" : "outline"}
                            onClick={() => setFillInAnswer(option)}
                            className={fillInAnswer === option ? "bg-primary text-white" : "border-white/10 bg-white/[.035]"}
                          >
                            {option}
                          </Button>
                        ))}
                      </div>
                    )}
                    <Textarea
                      value={fillInAnswer}
                      onChange={(event) => setFillInAnswer(event.target.value)}
                      placeholder={fillInQuestions[fillInIndex].inputType === "choice" ? "Or type a custom answer" : "Type the staff answer here"}
                      rows={4}
                      className="bg-[#111827]/70"
                    />
                    <div className="flex flex-wrap justify-between gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={fillInIndex === 0}
                        onClick={() => {
                          setFillInIndex((current) => Math.max(0, current - 1));
                          setFillInAnswer(fillInAnswers[fillInQuestions[Math.max(0, fillInIndex - 1)]?.id] || "");
                        }}
                        className="border-white/10 bg-white/[.035]"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            const question = fillInQuestions[fillInIndex];
                            const nextAnswers = { ...fillInAnswers, [question.id]: "I don't know" };
                            setFillInAnswers(nextAnswers);
                            setFillInAnswer("");
                            if (fillInIndex + 1 >= fillInQuestions.length) {
                              finishFillIn(nextAnswers);
                            } else {
                              setFillInIndex((current) => current + 1);
                            }
                          }}
                        >
                          I don&apos;t know
                        </Button>
                        {!fillInQuestions[fillInIndex].required && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setFillInAnswer("");
                              if (fillInIndex + 1 >= fillInQuestions.length) {
                                finishFillIn(fillInAnswers);
                              } else {
                                setFillInIndex((current) => current + 1);
                              }
                            }}
                          >
                            Skip
                          </Button>
                        )}
                        <Button onClick={submitFillInAnswer} className="bg-primary text-primary-foreground hover:bg-red-500">
                          {fillInIndex + 1 >= fillInQuestions.length ? "Fill fields" : "Next question"}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[.025] p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Current vehicle</div>
                    <div className="mt-3 font-display text-xl text-white">{vehicleName || vehicle.vin || "No vehicle confirmed yet"}</div>
                    <div className="mt-4 space-y-2 text-sm text-zinc-300">
                      {[
                        ["Trim", vehicle.trim || "Needs confirmation"],
                        ["Engine", vehicle.engine || selectedTrimSpecification?.engine || "Not filled"],
                        ["Transmission", vehicle.transmission || selectedTrimSpecification?.transmission || "Not filled"],
                        ["Drivetrain", vehicle.drivetrain || selectedTrimSpecification?.drivetrain || "Not filled"],
                        ["MPG", vehicle.mpg || selectedTrimSpecification?.mpg || "Not filled"],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-4 rounded-lg border border-white/10 bg-white/[.03] px-3 py-2">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="text-right">{value}</span>
                        </div>
                      ))}
                    </div>
                    {selectedTrimSpecification && (
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-4 w-full border-white/10 bg-white/[.035]"
                        onClick={() => {
                          setVehicle((current) => ({
                            ...current,
                            engine: current.engine || selectedTrimSpecification.engine,
                            transmission: current.transmission || selectedTrimSpecification.transmission,
                            drivetrain: current.drivetrain || selectedTrimSpecification.drivetrain,
                            fuelType: current.fuelType || selectedTrimSpecification.fuelType,
                            mpg: current.mpg || selectedTrimSpecification.mpg,
                          }));
                          setMessage("Suggested specifications added for staff confirmation.");
                        }}
                      >
                        <Check className="h-4 w-4" />
                        This looks right
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                  LF Fill In is ready. Review highlighted fields before generating.
                </div>
              )}
              {!!fillInWarnings.length && (
                <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
                  {fillInWarnings.join(" ")}
                </div>
              )}
            </div>
          </div>
        )}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mx-5 mt-5 grid h-auto grid-cols-2 gap-1 md:grid-cols-5">
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
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div className="flex gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10">
                    <FileText className="h-5 w-5 text-red-100" />
                  </div>
                  <div>
                    <h3 className="font-display text-2xl">Smart paste intake</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Paste an old listing, auction note, window-sticker text, or inventory description. ListingFlow extracts the facts into the form and highlights what still needs staff review.
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="w-fit border-white/10 text-zinc-300">Fastest for messy notes</Badge>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <Textarea
                  value={sourceText}
                  onChange={(event) => setSourceText(event.target.value)}
                  placeholder="Paste old listing text here. Example: 2021 Honda Accord Sport, 48,210 miles, automatic, black on black, backup camera, Apple CarPlay, clean title verified..."
                  rows={6}
                  className="min-h-36 bg-[#111827]/70"
                />
                <Button
                  type="button"
                  onClick={extractSourceText}
                  disabled={sourceLoading}
                  className="bg-white text-[#0B0D10] hover:bg-zinc-200"
                >
                  {sourceLoading ? <ListingFlowLoader compact label="Reading..." /> : <><Wand2 className="h-4 w-4" /> Extract details</>}
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-md border border-white/10 bg-white/[.035] px-2 py-1">Risk claims stay unfilled unless explicit</span>
                <span className="rounded-md border border-white/10 bg-white/[.035] px-2 py-1">Features become highlight chips</span>
                <span className="rounded-md border border-white/10 bg-white/[.035] px-2 py-1">Unsure specs are flagged for review</span>
                {(sourceEvidenceId || sourceText) && (
                  <button type="button" onClick={deleteSourceEvidence} className="rounded-md border border-white/10 bg-white/[.035] px-2 py-1 text-zinc-400 hover:text-white">
                    Delete pasted source
                  </button>
                )}
              </div>
              {!!sourceConflicts.length && (
                <div className="mt-4 overflow-hidden rounded-xl border border-amber-400/20 bg-amber-400/[.06]">
                  <div className="border-b border-amber-400/15 px-4 py-3 text-sm font-semibold text-amber-100">
                    Review differences before replacing existing details
                  </div>
                  <div className="divide-y divide-white/8">
                    {sourceConflicts.map((conflict) => (
                      <div key={conflict.field} className="grid gap-3 p-4 md:grid-cols-[120px_1fr_1fr_auto] md:items-center">
                        <div className="text-xs font-semibold uppercase text-zinc-500">{String(conflict.field)}</div>
                        <div className="rounded-lg border border-white/8 bg-[#0B0D10] p-3">
                          <div className="text-[10px] uppercase text-zinc-600">Keep existing</div>
                          <div className="mt-1 text-sm text-zinc-200">{conflict.existingValue}</div>
                        </div>
                        <div className="rounded-lg border border-amber-400/15 bg-amber-400/[.05] p-3">
                          <div className="text-[10px] uppercase text-amber-300/70">Pasted source</div>
                          <div className="mt-1 text-sm text-zinc-100">{conflict.extractedValue}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant="ghost" onClick={() => resolveSourceConflict(conflict, false)}>Keep</Button>
                          <Button type="button" size="sm" onClick={() => resolveSourceConflict(conflict, true)} className="bg-primary hover:bg-red-500">Replace</Button>
                        </div>
                      </div>
                    ))}
                  </div>
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
                      data-field={key}
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
                    {["condition", "overallCondition", "tireCondition", "interiorCondition", "exteriorCondition"].includes(String(key)) ? (
                      <div className="relative">
                        <Input
                          data-field={key}
                          value={vehicle[key] || ""}
                          onChange={(event) => updateVehicle(key, event.target.value)}
                          className={`${needsField(key) ? "border-amber-400/60 bg-amber-400/10" : ""} pr-10`}
                        />
                        <LfQuickFillButton field={key} />
                      </div>
                    ) : (
                      <Input
                        data-field={key}
                        value={vehicle[key] || ""}
                        onChange={(event) => updateVehicle(key, event.target.value)}
                        className={needsField(key) ? "border-amber-400/60 bg-amber-400/10" : undefined}
                      />
                    )}
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
                    <div className="relative">
                      <Textarea
                        data-field={key}
                        value={vehicle[key] || ""}
                        onChange={(event) => updateVehicle(key, event.target.value)}
                        className={`${needsField(key) ? "border-amber-400/60 bg-amber-400/10" : ""} pr-11`}
                      />
                      <LfQuickFillButton field={key} />
                    </div>
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
            {(listingDefaults.financingLanguage || listingDefaults.warrantyLanguage) && (
              <div className="grid gap-3 md:grid-cols-2">
                {listingDefaults.financingLanguage && (
                  <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[.025] p-4 text-sm">
                    <Checkbox checked={useSavedFinancing} onCheckedChange={(checked) => setUseSavedFinancing(Boolean(checked))} />
                    <span><span className="font-medium text-white">Use saved financing language</span><span className="mt-1 block leading-5 text-muted-foreground">{listingDefaults.financingLanguage}</span></span>
                  </label>
                )}
                {listingDefaults.warrantyLanguage && (
                  <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[.025] p-4 text-sm">
                    <Checkbox checked={useSavedWarranty} onCheckedChange={(checked) => setUseSavedWarranty(Boolean(checked))} />
                    <span><span className="font-medium text-white">Use saved warranty language</span><span className="mt-1 block leading-5 text-muted-foreground">{listingDefaults.warrantyLanguage}</span></span>
                  </label>
                )}
              </div>
            )}
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
                <TabsList className="grid h-auto grid-cols-3 gap-1 md:grid-cols-7">
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
                <Select
                  value={status}
                  onValueChange={(value) => {
                    if (value === "published" && output?.claimRiskAudit?.riskLevel === "high") {
                      setMessage("Resolve high-risk unsupported claims before marking this listing Published.");
                      setActiveTab("generate");
                      return;
                    }
                    if (value) setStatus(value as ListingStatus);
                  }}
                >
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
      </div>
      </section>

      <aside className="hidden min-w-0 border-l border-white/8 bg-[#090C10] xl:block">
        <div className="sticky top-16 flex max-h-[calc(100vh-4rem)] flex-col">
          <div className="border-b border-white/8 p-4">
            <div className="text-xs font-semibold uppercase text-zinc-500">Copy companion</div>
            <div className="mt-3 grid grid-cols-3 rounded-xl border border-white/8 bg-[#0E1117] p-1">
              {([
                ["facebook", "Facebook"],
                ["cargurus", "CarGurus"],
                ["website", "Website"],
              ] as Array<[ListingPlatform, string]>).map(([platform, label]) => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => setActivePlatform(platform)}
                  className={`rounded-lg px-2 py-2 text-xs font-medium transition ${
                    activePlatform === platform ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{vehicleName || "Vehicle copy"}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  {selectedPlatformText.length} characters
                  {activePlatform === "facebook" ? " · recommended 500–2,000" : activePlatform === "cargurus" ? " · concise inventory copy" : " · detailed website copy"}
                </div>
              </div>
              <Button type="button" size="icon-sm" variant="ghost" onClick={() => setActiveTab("outputs")} title="Open full editor">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {output ? (
              <Textarea
                value={selectedPlatformText}
                onChange={(event) => {
                  const key = activePlatform === "facebook"
                    ? "facebookListing"
                    : activePlatform === "cargurus"
                      ? "carGurusListing"
                      : "websiteDescription";
                  updateOutput(key, event.target.value);
                }}
                rows={24}
                className="min-h-[420px] resize-none border-white/8 bg-[#0E1117] text-sm leading-6"
              />
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#0E1117] p-6 text-center">
                <Clipboard className="h-6 w-6 text-zinc-600" />
                <p className="mt-3 text-sm text-zinc-400">Your selected platform copy will stay pinned here after generation.</p>
              </div>
            )}
          </div>
          <div className="space-y-2 border-t border-white/8 p-4">
            <Button
              type="button"
              disabled={!selectedPlatformText}
              onClick={() => copy(selectedPlatformText)}
              className="w-full bg-primary hover:bg-red-500"
            >
              <Clipboard className="h-4 w-4" />
              Copy selected platform
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" disabled={!output} onClick={saveListing} className="border-white/10 bg-white/[.03]">
                <Save className="h-4 w-4" />
                Save
              </Button>
              <Button type="button" variant="outline" onClick={saveAndNext} className="border-white/10 bg-white/[.03]">
                Save & next
              </Button>
            </div>
            <Button type="button" variant="outline" onClick={saveAndReturnHome} className="w-full border-white/10 bg-white/[.03]">
              Save & return home
            </Button>
            <Button type="button" variant="ghost" onClick={archiveCurrentDraft} className="w-full text-zinc-500">
              <Archive className="h-4 w-4" />
              Archive draft
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
