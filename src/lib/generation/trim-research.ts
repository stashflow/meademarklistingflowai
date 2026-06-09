import { getOpenAIClient, parseStrictJson } from "@/lib/openai/client";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type {
  TrimCandidate,
  TrimResearchQuestion,
  TrimResearchResult,
  TrimResearchSource,
  TrimSpecification,
} from "@/types/listing";

const researchPayloadSchema = z.object({
  candidates: z.array(z.object({
    name: z.string(),
    confidence: z.enum(["low", "medium", "high"]),
    indicators: z.array(z.string()),
    summary: z.string(),
  })),
  specifications: z.array(z.object({
    trim: z.string(),
    engine: z.string().nullable(),
    transmission: z.string().nullable(),
    drivetrain: z.string().nullable(),
    fuelType: z.string().nullable(),
    mpg: z.string().nullable(),
    features: z.array(z.string()),
    variableFields: z.array(z.string()),
  })),
  questions: z.array(z.object({
    id: z.string(),
    label: z.string(),
    helper: z.string(),
    why: z.string(),
    inputType: z.enum(["choice", "yes_no_unknown", "text"]),
    options: z.array(z.object({
      label: z.string(),
      supportsTrims: z.array(z.string()),
    })),
  })),
  confidence: z.enum(["low", "medium", "high"]),
});

type ResearchPayload = z.infer<typeof researchPayloadSchema>;

type CachedResearch = {
  research_key: string;
  trim_candidates: TrimCandidate[];
  specification_matrix: { specifications?: TrimSpecification[] };
  distinguishing_questions: TrimResearchQuestion[];
  sources: TrimResearchSource[];
  confidence: "low" | "medium" | "high";
  refreshed_at: string;
};

const CACHE_TTL_MS = 180 * 24 * 60 * 60 * 1000;

type NhtsaModelValidation = {
  checked: boolean;
  matched: boolean;
  matchedModel?: string;
  source?: TrimResearchSource;
};

function researchKey(year: string, make: string, model: string, market: string) {
  return [year, make, model, market]
    .map((part) => part.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"))
    .join(":");
}

async function validateModelWithNhtsa(input: { year: string; make: string; model: string }): Promise<NhtsaModelValidation> {
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodeURIComponent(input.make)}/modelyear/${encodeURIComponent(input.year)}?format=json`;
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return { checked: false, matched: false };
    const payload = await response.json() as { Results?: Array<{ Model_Name?: string }> };
    const normalizedModel = input.model.toLowerCase().replace(/[^a-z0-9]/g, "");
    const match = (payload.Results || []).find((item) => {
      const candidate = String(item.Model_Name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      return candidate === normalizedModel;
    });
    return {
      checked: true,
      matched: Boolean(match),
      matchedModel: match?.Model_Name,
      source: { label: "NHTSA vPIC make/model data", url },
    };
  } catch {
    return { checked: false, matched: false };
  }
}

function fresh(date: string) {
  return Date.now() - new Date(date).getTime() < CACHE_TTL_MS;
}

function collectSources(value: unknown, found = new Map<string, string>()) {
  if (!value || typeof value !== "object") return found;
  if (Array.isArray(value)) {
    value.forEach((item) => collectSources(item, found));
    return found;
  }
  const record = value as Record<string, unknown>;
  const url = typeof record.url === "string" ? record.url : "";
  const title = typeof record.title === "string" ? record.title : url;
  if (url.startsWith("http")) found.set(url, title);
  Object.values(record).forEach((item) => collectSources(item, found));
  return found;
}

function toResult(row: CachedResearch, fromCache: boolean): TrimResearchResult {
  return {
    researchKey: row.research_key,
    fromCache,
    candidates: row.trim_candidates || [],
    specifications: row.specification_matrix?.specifications || [],
    questions: row.distinguishing_questions || [],
    sources: row.sources || [],
    confidence: row.confidence,
    warning: "Trim research is supporting evidence. Dealership staff must confirm the final trim and specifications.",
  };
}

function fallbackResult(input: { year: string; make: string; model: string; trim?: string; market: string }): TrimResearchResult {
  return {
    researchKey: researchKey(input.year, input.make, input.model, input.market),
    fromCache: false,
    candidates: input.trim
      ? [{ name: input.trim, confidence: "medium", indicators: ["Staff-entered trim"], summary: "Confirm using the badge, window sticker, or dealership records." }]
      : [],
    specifications: [],
    questions: [{
      id: "trim_badge",
      label: "What trim or package badge can you see?",
      helper: "Check the trunk, tailgate, front fender, window sticker, or inventory record.",
      why: "A visible badge or window sticker is stronger evidence than a trim guess.",
      inputType: "text",
      options: [],
    }],
    sources: [],
    confidence: "low",
    warning: "Live trim research was unavailable. Confirm trim and specifications from dealership records.",
  };
}

export async function researchVehicleTrims(input: {
  year: string;
  make: string;
  model: string;
  trim?: string;
  market?: string;
}): Promise<TrimResearchResult> {
  const market = input.market || "US";
  const key = researchKey(input.year, input.make, input.model, market);
  const supabase = getSupabaseAdminClient();
  const { data: cached } = await supabase
    .from("vehicle_trim_research_cache")
    .select("*")
    .eq("research_key", key)
    .maybeSingle<CachedResearch>();
  if (cached && fresh(cached.refreshed_at)) return toResult(cached, true);

  try {
    const nhtsa = await validateModelWithNhtsa(input);
    const client = getOpenAIClient();
    const response = await client.responses.parse({
      model: process.env.OPENAI_RESEARCH_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini",
      tools: [{ type: "web_search_preview" }],
      include: ["web_search_call.action.sources"],
      text: {
        format: zodTextFormat(researchPayloadSchema, "vehicle_trim_research"),
      },
      input: `Research the ${market}-market ${input.year} ${input.make} ${input.model}${input.trim ? `, especially the ${input.trim} trim` : ""}.

NHTSA vPIC was checked first. ${nhtsa.checked
  ? nhtsa.matched
    ? `It matched the model as "${nhtsa.matchedModel}".`
    : "It did not return an exact normalized model match, so verify the model naming carefully."
  : "The NHTSA request was unavailable, so do not imply NHTSA validation."}

Prefer OEM brochures, OEM manuals, OEM media/specification pages, and reputable vehicle specification sources. Do not use dealer sales copy as the only source.

Rules:
- Include only trims that appear supported for this year/model/market.
- Keep MPG ranges qualified when configuration changes them.
- Put configuration-dependent fields in variableFields.
- Questions must use visible indicators staff can check quickly: badge, wheels, seats, screen, roof, lighting, drivetrain controls, engine label, or window sticker.
- Web research is evidence, never final confirmation.
- Maximum 8 trim candidates and 8 questions.`,
    });

    const payload = response.output_parsed || parseStrictJson<ResearchPayload>(response.output_text);
    const sourceMap = collectSources(response.output);
    if (nhtsa.source) sourceMap.set(nhtsa.source.url, nhtsa.source.label);
    const sources = [...sourceMap.entries()].map(([url, label]) => ({ label, url })).slice(0, 12);
    const now = new Date().toISOString();
    const specifications: TrimSpecification[] = (payload.specifications || []).slice(0, 12).map((specification) => ({
      trim: specification.trim,
      engine: specification.engine || undefined,
      transmission: specification.transmission || undefined,
      drivetrain: specification.drivetrain || undefined,
      fuelType: specification.fuelType || undefined,
      mpg: specification.mpg || undefined,
      features: specification.features,
      variableFields: specification.variableFields,
    }));
    const row = {
      research_key: key,
      year: input.year,
      make: input.make,
      model: input.model,
      market,
      trim_candidates: (payload.candidates || []).slice(0, 8),
      specification_matrix: { specifications },
      distinguishing_questions: (payload.questions || []).slice(0, 8),
      sources,
      confidence: payload.confidence || "low",
      refreshed_at: now,
      updated_at: now,
    };
    await supabase.from("vehicle_trim_research_cache").upsert(row, { onConflict: "research_key" });
    return toResult(row as CachedResearch, false);
  } catch (error) {
    console.error("Trim research fallback:", error);
    return fallbackResult({ ...input, market });
  }
}
