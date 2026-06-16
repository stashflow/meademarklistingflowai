import { getOpenAIClient, parseStrictJson } from "@/lib/openai/client";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  NcapVehicleRating,
  NhtsaRecall,
  VehicleIntelligence,
  VehicleIntelligenceSummary,
} from "@/types/vehicle-intelligence";

type VehicleLookup = {
  year?: string;
  make?: string;
  model?: string;
  trim?: string;
};

type CachedVehicleIntelligence = {
  model_key: string;
  year: string;
  make: string;
  model: string;
  trim: string | null;
  safety_data: VehicleIntelligence["safety"];
  recall_data: VehicleIntelligence["recalls"];
  ai_summary: VehicleIntelligenceSummary;
  intelligence_score: number;
  sources: VehicleIntelligence["sources"];
  refreshed_at: string;
};

const CACHE_TTL_DAYS = 30;

export function vehicleModelKey(input: VehicleLookup) {
  return [input.year, input.make, input.model, input.trim || ""]
    .map((part) => String(part || "").trim().toLowerCase().replace(/\s+/g, "-"))
    .filter(Boolean)
    .join(":");
}

function isFresh(refreshedAt: string) {
  const age = Date.now() - new Date(refreshedAt).getTime();
  return age < CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
}

function ratingToNumber(value?: string) {
  const parsed = Number.parseInt(String(value || "").replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildScore(ratings: NcapVehicleRating[], recallCount: number) {
  const bestRating = Math.max(...ratings.map((rating) => ratingToNumber(rating.overallRating)), 0);
  const safetyPoints = bestRating ? bestRating * 14 : 25;
  const recallPenalty = Math.min(recallCount * 3, 25);
  return Math.max(0, Math.min(100, safetyPoints + 30 - recallPenalty));
}

function normalizeNcapRating(item: Record<string, unknown>): NcapVehicleRating {
  return {
    vehicleId: Number(item.VehicleId || item.VehicleID || 0) || undefined,
    vehicleDescription: String(item.VehicleDescription || item.VehiclePicture || "").trim() || undefined,
    overallRating: String(item.OverallRating || item.OverallFrontCrashRating || "").trim() || undefined,
    frontalCrashRating: String(item.OverallFrontCrashRating || "").trim() || undefined,
    sideCrashRating: String(item.OverallSideCrashRating || "").trim() || undefined,
    rolloverRating: String(item.RolloverRating || "").trim() || undefined,
  };
}

function normalizeRecall(item: Record<string, unknown>): NhtsaRecall {
  return {
    manufacturer: String(item.Manufacturer || "").trim() || undefined,
    campaignNumber: String(item.NHTSACampaignNumber || "").trim() || undefined,
    component: String(item.Component || "").trim() || undefined,
    summary: String(item.Summary || "").trim() || undefined,
    consequence: String(item.Conequence || item.Consequence || "").trim() || undefined,
    remedy: String(item.Remedy || "").trim() || undefined,
    reportReceivedDate: String(item.ReportReceivedDate || "").trim() || undefined,
  };
}

async function fetchNcapRatings(input: Required<Pick<VehicleLookup, "year" | "make" | "model">>) {
  const url = `https://api.nhtsa.gov/SafetyRatings/modelyear/${encodeURIComponent(input.year)}/make/${encodeURIComponent(input.make)}/model/${encodeURIComponent(input.model)}?format=json`;
  const response = await fetch(url, { next: { revalidate: 60 * 60 * 24 * 30 } });
  if (!response.ok) return [];
  const payload = await response.json();
  const baseResults = Array.isArray(payload.Results) ? payload.Results : [];
  const detailed = await Promise.all(
    baseResults.slice(0, 5).map(async (item: Record<string, unknown>) => {
      const id = item.VehicleId || item.VehicleID;
      if (!id) return normalizeNcapRating(item);
      try {
        const detailResponse = await fetch(`https://api.nhtsa.gov/SafetyRatings/VehicleId/${encodeURIComponent(String(id))}?format=json`, {
          next: { revalidate: 60 * 60 * 24 * 30 },
        });
        if (!detailResponse.ok) return normalizeNcapRating(item);
        const detailPayload = await detailResponse.json();
        const detail = Array.isArray(detailPayload.Results) ? detailPayload.Results[0] : null;
        return normalizeNcapRating({ ...item, ...(detail || {}) });
      } catch {
        return normalizeNcapRating(item);
      }
    }),
  );
  return detailed.filter((rating) => rating.vehicleId || rating.vehicleDescription || rating.overallRating);
}

async function fetchNhtsaRecalls(input: Required<Pick<VehicleLookup, "year" | "make" | "model">>) {
  const params = new URLSearchParams({
    make: input.make,
    model: input.model,
    modelYear: input.year,
  });
  const response = await fetch(`https://api.nhtsa.gov/recalls/recallsByVehicle?${params.toString()}`, {
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!response.ok) return [];
  const payload = await response.json();
  const results = Array.isArray(payload.results) ? payload.results : Array.isArray(payload.Results) ? payload.Results : [];
  return results.slice(0, 10).map((item: Record<string, unknown>) => normalizeRecall(item));
}

async function summarizeIntelligence(input: {
  vehicle: VehicleLookup;
  ratings: NcapVehicleRating[];
  recalls: NhtsaRecall[];
  score: number;
}) {
  const fallback: VehicleIntelligenceSummary = {
    summary: "Vehicle intelligence is based on free NHTSA data. Staff should verify trim, equipment, title, condition, and history before publishing.",
    safetySummary: input.ratings.length
      ? `NHTSA safety rating data was found for this model family. Best available overall rating: ${Math.max(...input.ratings.map((rating) => ratingToNumber(rating.overallRating)), 0) || "not rated"}.`
      : "NHTSA NCAP safety rating data was not found for this exact year, make, and model.",
    recallSummary: input.recalls.length
      ? `${input.recalls.length} NHTSA recall record(s) were found for this year, make, and model. Staff should check open recall status before publishing.`
      : "No NHTSA recall records were returned for this year, make, and model lookup.",
    valueNotes: "",
    strengths: [],
    cautions: ["Do not claim clean title, no accidents, one owner, warranty, or open-recall status unless confirmed by staff or a trusted source."],
    listingAngles: [],
    validationWarnings: [],
  };

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You validate free NHTSA vehicle data for dealership listing software. Summarize only the supplied data. Do not invent safety ratings, title status, accident history, market value, warranty, open recall status, or features. Leave valueNotes empty because no market-value source is supplied. If other data is missing, say it is missing.",
        },
        {
          role: "user",
          content: `Return strict JSON:
{
  "summary": "",
  "safetySummary": "",
  "recallSummary": "",
  "valueNotes": "",
  "strengths": [],
  "cautions": [],
  "listingAngles": [],
  "validationWarnings": []
}

Vehicle:
${JSON.stringify(input.vehicle, null, 2)}

NHTSA NCAP ratings:
${JSON.stringify(input.ratings, null, 2)}

NHTSA recall records:
${JSON.stringify(input.recalls, null, 2)}

Internal intelligence score:
${input.score}

Rules:
- Mention NHTSA as the source for safety and recall data.
- Value notes must say no live market-value provider is connected.
- Title status is manual/staff-entered only.
- Never say recalls are open or closed; NHTSA recall lookup alone does not prove completion status.
- Keep it concise and dealership-safe.`,
        },
      ],
    });
    const content = completion.choices[0]?.message?.content;
    return content ? parseStrictJson<VehicleIntelligenceSummary>(content) : fallback;
  } catch {
    return fallback;
  }
}

function toVehicleIntelligence(row: CachedVehicleIntelligence, fromCache: boolean): VehicleIntelligence {
  return {
    modelKey: row.model_key,
    year: row.year,
    make: row.make,
    model: row.model,
    trim: row.trim || undefined,
    fromCache,
    intelligenceScore: row.intelligence_score,
    safety: row.safety_data,
    recalls: row.recall_data,
    aiSummary: row.ai_summary,
    sources: row.sources,
    refreshedAt: row.refreshed_at,
  };
}

export async function getVehicleIntelligence(input: VehicleLookup): Promise<VehicleIntelligence | null> {
  if (!input.year || !input.make || !input.model) return null;

  const modelKey = vehicleModelKey(input);
  const supabase = getSupabaseAdminClient();
  const { data: cached } = await supabase
    .from("vehicle_model_intelligence")
    .select("*")
    .eq("model_key", modelKey)
    .maybeSingle<CachedVehicleIntelligence>();

  if (cached && isFresh(cached.refreshed_at)) {
    return toVehicleIntelligence(cached, true);
  }

  const lookup = { year: input.year, make: input.make, model: input.model };
  const [ratings, recalls] = await Promise.all([fetchNcapRatings(lookup), fetchNhtsaRecalls(lookup)]);
  const bestOverallRating = Math.max(...ratings.map((rating) => ratingToNumber(rating.overallRating)), 0);
  const now = new Date().toISOString();
  const intelligenceScore = buildScore(ratings, recalls.length);
  const aiSummary = await summarizeIntelligence({
    vehicle: input,
    ratings,
    recalls,
    score: intelligenceScore,
  });

  const row = {
    model_key: modelKey,
    year: input.year,
    make: input.make,
    model: input.model,
    trim: input.trim || null,
    safety_data: {
      source: "NHTSA NCAP" as const,
      ratings,
      bestOverallRating: bestOverallRating ? `${bestOverallRating} stars` : undefined,
      fetchedAt: now,
    },
    recall_data: {
      source: "NHTSA Recalls" as const,
      count: recalls.length,
      items: recalls,
      fetchedAt: now,
    },
    ai_summary: aiSummary,
    intelligence_score: intelligenceScore,
    sources: [
      { label: "NHTSA VPIC VIN decoder", url: "https://vpic.nhtsa.dot.gov/api/" },
      { label: "NHTSA Safety Ratings", url: "https://api.nhtsa.gov/SafetyRatings" },
      { label: "NHTSA Recalls", url: "https://api.nhtsa.gov/recalls" },
    ],
    refreshed_at: now,
    updated_at: now,
  };

  const { data } = await supabase
    .from("vehicle_model_intelligence")
    .upsert(row, { onConflict: "model_key" })
    .select("*")
    .single<CachedVehicleIntelligence>();

  return data ? toVehicleIntelligence(data, false) : toVehicleIntelligence(row, false);
}
