import { getOpenAIClient, parseStrictJson } from "@/lib/openai/client";
import type { FeatureHighlight, VehicleInput } from "@/types/listing";

export type FillInQuestion = {
  id: string;
  label: string;
  helper: string;
  fieldHint?: keyof VehicleInput;
};

export type FillInApplyResult = {
  updates: Partial<VehicleInput>;
  featureHighlights: FeatureHighlight[];
  warnings: string[];
  confidenceNotes: string[];
};

const requiredQuestions: FillInQuestion[] = [
  { id: "mileage", label: "What is the mileage?", helper: "Approximate is okay, but use the odometer reading if you have it.", fieldHint: "mileage" },
  { id: "condition", label: "How would you describe the condition?", helper: "Example: clean daily driver, excellent interior, normal exterior wear.", fieldHint: "condition" },
  { id: "titleStatus", label: "What title status can staff verify?", helper: "Only enter clean title, rebuilt, salvage, etc. if the dealership can confirm it.", fieldHint: "titleStatus" },
  { id: "accidentHistory", label: "What accident history can staff verify?", helper: "Use plain language like no accidents reported, minor prior damage, unknown, or leave blank.", fieldHint: "accidentHistory" },
  { id: "sellingPoints", label: "What should shoppers care about most?", helper: "Mention features, recent maintenance, tires, ownership notes, warranty, financing, or anything that helps sell it." },
];

export function localFillInQuestions(vehicle: VehicleInput): FillInQuestion[] {
  const questions = [...requiredQuestions];
  if (!vehicle.trim) {
    questions.splice(1, 0, {
      id: "trim_deciders",
      label: "Do you know anything that helps confirm the trim or package?",
      helper: "Examples: leather or cloth, navigation screen, sunroof, AWD/FWD, premium package, wheel size, safety package.",
      fieldHint: "trim",
    });
  }
  if (!vehicle.keyFeatures) {
    questions.push({
      id: "features",
      label: "Which features can staff see or verify?",
      helper: "Examples: backup camera, heated seats, CarPlay, blind spot monitoring, remote start, navigation.",
      fieldHint: "keyFeatures",
    });
  }
  return questions.slice(0, 8);
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
            "Create short dealership staff questions to fill missing vehicle listing fields. Ask simple one-at-a-time questions. Do not ask for sensitive claims unless staff can verify them. Return strict JSON.",
        },
        {
          role: "user",
          content: `Return JSON:
{
  "questions": [
    { "id": "", "label": "", "helper": "", "fieldHint": "" }
  ]
}

Vehicle:
${JSON.stringify(vehicle, null, 2)}

Rules:
- Ask no more than 8 questions.
- Prioritize missing mileage, condition, title status, accident history, trim/package deciding factors, visible features, recent maintenance, and seller notes.
- If trim is missing or ambiguous, ask deciding-factor questions instead of guessing.
- Keep each label short and easy for non-technical dealership staff.`,
        },
      ],
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) return fallback;
    const parsed = parseStrictJson<{ questions: FillInQuestion[] }>(content);
    return (parsed.questions || fallback).slice(0, 8);
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
          "You safely fill dealership vehicle listing fields from staff answers. Return strict JSON only. Never invent title, accident, ownership, warranty, service, financing, or condition claims. Features can be confirmed only when staff entered them or decoded data explicitly supports them. Trim-derived/package features must be likely or unsure, not confirmed.",
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
