import { getOpenAIClient, parseStrictJson } from "@/lib/openai/client";
import type { DraftSourceConflict, FeatureHighlight, VehicleInput } from "@/types/listing";

export type FillInQuestion = {
  id: string;
  label: string;
  helper: string;
  fieldHint?: keyof VehicleInput;
  inputType?: "text" | "textarea" | "choice";
  options?: string[];
  category?: "identity" | "condition" | "features" | "risk" | "selling";
  required?: boolean;
  why?: string;
};

export type FillInApplyResult = {
  updates: Partial<VehicleInput>;
  featureHighlights: FeatureHighlight[];
  warnings: string[];
  confidenceNotes: string[];
};

export type SourceTextExtractionResult = FillInApplyResult & {
  missingFields: string[];
  blankFieldUpdates: Partial<VehicleInput>;
  conflicts: DraftSourceConflict[];
};

const requiredQuestions: FillInQuestion[] = [
  {
    id: "mileage",
    label: "What is the odometer mileage?",
    helper: "Use the exact odometer reading if available. Approximate is okay for draft intake.",
    fieldHint: "mileage",
    inputType: "text",
    category: "condition",
    required: true,
    why: "Mileage is required before ListingFlow can write dealer-ready copy.",
  },
  {
    id: "condition",
    label: "What is the real-world condition?",
    helper: "Example: clean daily driver, excellent interior, normal exterior wear, small dent on rear bumper.",
    fieldHint: "condition",
    inputType: "textarea",
    category: "condition",
    required: true,
    why: "This prevents the listing from sounding cleaner than staff can support.",
  },
  {
    id: "titleStatus",
    label: "What title status can staff verify?",
    helper: "Choose unknown if it has not been checked. ListingFlow will not claim clean title unless staff confirms it.",
    fieldHint: "titleStatus",
    inputType: "choice",
    options: ["Unknown", "Clean title verified", "Rebuilt title", "Salvage title", "Ask manager"],
    category: "risk",
  },
  {
    id: "accidentHistory",
    label: "What accident history can staff verify?",
    helper: "Use only what is visible in your records or vehicle history report.",
    fieldHint: "accidentHistory",
    inputType: "choice",
    options: ["Unknown", "No accidents reported", "Minor prior damage", "Accident reported", "Ask manager"],
    category: "risk",
  },
  {
    id: "sellingPoints",
    label: "What should shoppers care about most?",
    helper: "Mention standout features, recent maintenance, tires, warranty details, financing info, or why this unit is a good fit.",
    inputType: "textarea",
    category: "selling",
    required: true,
  },
];

export function localFillInQuestions(vehicle: VehicleInput): FillInQuestion[] {
  const questions = [...requiredQuestions];
  const identity = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ");
  if (identity) {
    questions.unshift({
      id: "identity_confirm",
      label: `Does this vehicle identity look right?`,
      helper: `${identity}. If anything is wrong, type the correction. If it is right, type yes.`,
      fieldHint: "model",
      inputType: "text",
      category: "identity",
      required: true,
      why: "A correct year, make, model, and trim keeps every listing output aligned.",
    });
  }
  if (!vehicle.trim) {
    questions.splice(1, 0, {
      id: "trim_deciders",
      label: "What trim badge or package clues can staff see?",
      helper: "Look for the rear badge, window sticker, Monroney label, seat material, wheel size, sunroof, nav screen, AWD/FWD, or package labels.",
      fieldHint: "trim",
      inputType: "textarea",
      category: "identity",
      required: true,
      why: "Trim changes features, drivetrain, engine, and buyer expectations.",
    });
  } else {
    questions.splice(1, 0, {
      id: "trim_confirm",
      label: `Can staff confirm the ${vehicle.trim} trim?`,
      helper: "Type yes if the VIN/window sticker/badge confirms it. If unsure, list what you can see.",
      fieldHint: "trim",
      inputType: "text",
      category: "identity",
      required: true,
      why: "ListingFlow marks trim-based features as unsure unless the trim is supported.",
    });
  }
  if (!vehicle.engine || !vehicle.transmission || !vehicle.drivetrain || !vehicle.mpg) {
    questions.splice(2, 0, {
      id: "spec_confirm",
      label: "Which specs are visible or known?",
      helper: "Engine, transmission, drivetrain, fuel type, and MPG if they are on the listing sheet, window sticker, or vehicle history source.",
      inputType: "textarea",
      category: "identity",
      why: "VIN data fills what it can. Missing specs should be confirmed or marked unsure.",
    });
  }
  return prioritizeTrimQuestion(questions).slice(0, 8);
}

function prioritizeTrimQuestion(questions: FillInQuestion[]) {
  const trimIndex = questions.findIndex((question) => question.id.toLowerCase().includes("trim"));
  if (trimIndex <= 0) return questions;
  const next = [...questions];
  const [trimQuestion] = next.splice(trimIndex, 1);
  return [trimQuestion, ...next];
}

export async function generateFillInQuestions(vehicle: VehicleInput): Promise<FillInQuestion[]> {
  const fallback = localFillInQuestions(vehicle);
  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.15,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Create short dealership staff questions to fill missing vehicle listing fields. Ask simple one-at-a-time questions that help confirm the actual year, make, model, trim, specs, condition, and safe selling points. Feature questions must ask whether the vehicle has one specific visible feature that distinguishes likely trims, never ask the user to list features generally. Do not ask for sensitive claims unless staff can verify them. Return strict JSON.",
        },
        {
          role: "user",
          content: `Return JSON:
{
  "questions": [
    {
      "id": "",
      "label": "",
      "helper": "",
      "fieldHint": "",
      "inputType": "text | textarea | choice",
      "options": [],
      "category": "identity | condition | features | risk | selling",
      "required": true,
      "why": ""
    }
  ]
}

Vehicle:
${JSON.stringify(vehicle, null, 2)}

Rules:
- Ask no more than 8 questions.
- Prioritize confirming actual model/trim, missing mechanical specs, mileage, condition, recent maintenance, title status, accident history, and seller notes.
- If trim is missing or ambiguous, ask yes/no/unknown deciding-factor questions such as "Does this vehicle have the panoramic roof?" using one specific visible feature per question.
- Never ask "What features does the car have?" or any open-ended feature inventory question.
- Every feature question must explain which trim possibilities the answer helps distinguish.
- If engine, transmission, drivetrain, fuel type, or MPG are missing, ask for a listing sheet/window sticker/source confirmation rather than guessing.
- Include 2-5 answer options for title status and accident history.
- Mark required true only for identity, mileage, condition, and selling-point questions needed to proceed.
- Keep each label short and easy for non-technical dealership staff.`,
        },
      ],
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) return fallback;
    const parsed = parseStrictJson<{ questions: FillInQuestion[] }>(content);
    return prioritizeTrimQuestion(parsed.questions || fallback).slice(0, 8);
  } catch {
    return fallback;
  }
}

export async function applyFillInAnswers(vehicle: VehicleInput, answers: Record<string, string>): Promise<FillInApplyResult> {
  const client = getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.12,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You safely fill dealership vehicle listing fields from staff answers, decoded VIN data, and sourced listing text. Return strict JSON only. Never invent title, accident, ownership, warranty, service, financing, or condition claims. Features can be confirmed only when staff entered them or decoded/source data explicitly supports them. Trim-derived/package features must be likely or unsure, not confirmed.",
      },
      {
        role: "user",
        content: `Return JSON:
{
  "updates": {},
  "featureHighlights": [
    { "label": "", "status": "confirmed | likely | unsure | ask_user", "source": "", "reason": "", "question": "" }
  ],
  "warnings": [],
  "confidenceNotes": []
}

Existing vehicle:
${JSON.stringify(vehicle, null, 2)}

Staff answers:
${JSON.stringify(answers, null, 2)}

Allowed update keys:
mileage, condition, overallCondition, titleStatus, accidentHistory, serviceHistory, ownershipHistory, tireCondition, interiorCondition, exteriorCondition, keyFeatures, recentMaintenance, upgrades, warrantyInfo, financingInfo, sellerNotes, trim, drivetrain, transmission, engine, fuelType, mpg, exteriorColor, interiorColor, price, stockNumber, vehicleType

Rules:
- Use staff answers as the only source for risky claims.
- If staff does not know title or accident history, do not fill a positive claim.
- Fill obvious specs like year, make, model, trim, engine, transmission, drivetrain, fuel type, and MPG only when decoded VIN data, staff answers, or pasted source text supports them.
- If a spec is probable from year/make/model/trim knowledge but not directly sourced, include it only in confidenceNotes or an unsure feature, not as a hard form update.
- If trim is uncertain, add warnings and mark package-specific features as "unsure".
- Put [unsure if applicable] in warnings only through the feature status, not inside update fields.
- Do not overwrite existing useful fields unless the staff answer clearly improves them.
- Keep updates concise and ready to put into form fields.`,
      },
    ],
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("LF Fill In returned no content.");
  const parsed = parseStrictJson<FillInApplyResult>(content);
  return {
    updates: parsed.updates || {},
    featureHighlights: (parsed.featureHighlights || []).slice(0, 14),
    warnings: parsed.warnings || [],
    confidenceNotes: parsed.confidenceNotes || [],
  };
}

export async function extractVehicleFromSourceText(
  vehicle: VehicleInput,
  sourceText: string,
): Promise<SourceTextExtractionResult> {
  const client = getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.08,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You extract vehicle listing form data from pasted dealership text. Return strict JSON only. Preserve facts. Do not create unsupported title, accident, ownership, warranty, service, financing, condition, or feature claims. Treat vague words like loaded or mint as notes unless specific features or condition details are stated.",
      },
      {
        role: "user",
        content: `Return JSON:
{
  "updates": {},
  "featureHighlights": [
    { "label": "", "status": "confirmed | likely | unsure | ask_user", "source": "", "reason": "", "question": "" }
  ],
  "warnings": [],
  "confidenceNotes": [],
  "missingFields": []
}

Existing vehicle:
${JSON.stringify(vehicle, null, 2)}

Pasted source text:
${sourceText}

Allowed update keys:
vin, year, make, model, trim, mileage, price, exteriorColor, interiorColor, drivetrain, transmission, engine, fuelType, mpg, stockNumber, vehicleType, condition, overallCondition, accidentHistory, titleStatus, serviceHistory, ownershipHistory, tireCondition, interiorCondition, exteriorCondition, keyFeatures, recentMaintenance, upgrades, warrantyInfo, financingInfo, sellerNotes

Extraction rules:
- Extract VIN, year, make, model, trim, mileage, price, colors, stock number, specs, condition, and features when directly stated.
- Normalize mileage and price as plain numbers without currency symbols where possible.
- If source text says clean title, no accidents, one-owner, warranty, financing, or service history, capture it only when explicit.
- If source text implies a risky claim without proof, put it in warnings instead of updates.
- Feature highlights must be machine-readable objects. Use confirmed only for directly stated features. Use likely or unsure for trim/package-based features.
- If a needed field is still missing, put a plain field name in missingFields.
- Keep form updates short and dealership-ready.`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Source text extraction returned no content.");
  const parsed = parseStrictJson<SourceTextExtractionResult>(content);
  const extracted = { ...(parsed.updates || {}) };
  const normalizedSource = sourceText.replace(/\s+/g, " ").trim();

  if (!extracted.titleStatus && /\bclean title\b/i.test(normalizedSource)) {
    extracted.titleStatus = "Clean title stated in pasted source";
  }
  if (!extracted.accidentHistory && /\b(no accidents?|accident[- ]free)\b/i.test(normalizedSource)) {
    extracted.accidentHistory = "No accidents stated in pasted source";
  }
  if (!extracted.ownershipHistory && /\b(one owner|1 owner|one-owner)\b/i.test(normalizedSource)) {
    extracted.ownershipHistory = "One owner stated in pasted source";
  }
  if (!extracted.trim && vehicle.model) {
    const escapedModel = vehicle.model.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const trimMatch = normalizedSource.match(new RegExp(`\\b${escapedModel}\\s+([A-Za-z0-9][A-Za-z0-9 +./-]{1,36}?)\\s+with\\b`, "i"));
    if (trimMatch?.[1]) extracted.trim = trimMatch[1].trim();
  }

  const blankFieldUpdates: Partial<VehicleInput> = {};
  const conflicts: DraftSourceConflict[] = [];
  for (const [rawField, rawValue] of Object.entries(extracted)) {
    const field = rawField as keyof VehicleInput;
    const extractedValue = String(rawValue || "").trim();
    if (!extractedValue) continue;
    const existingValue = String(vehicle[field] || "").trim();
    if (!existingValue) {
      blankFieldUpdates[field] = extractedValue;
    } else if (existingValue.toLowerCase() !== extractedValue.toLowerCase()) {
      conflicts.push({
        field,
        existingValue,
        extractedValue,
        confidence: "medium",
        source: "Pasted source text",
      });
    }
  }
  const mergedVehicle = { ...vehicle, ...blankFieldUpdates };
  const hasExtractedFeatures = Boolean(
    mergedVehicle.keyFeatures ||
    parsed.featureHighlights?.some((feature) => feature.status === "confirmed"),
  );
  const missingFields = (parsed.missingFields || []).filter((field) => {
    if (field === "keyFeatures") return !hasExtractedFeatures;
    return !String(mergedVehicle[field as keyof VehicleInput] || "").trim();
  });

  return {
    updates: extracted,
    blankFieldUpdates,
    conflicts,
    featureHighlights: (parsed.featureHighlights || []).slice(0, 18),
    warnings: parsed.warnings || [],
    confidenceNotes: parsed.confidenceNotes || [],
    missingFields,
  };
}
