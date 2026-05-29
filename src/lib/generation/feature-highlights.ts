import { getOpenAIClient, parseStrictJson } from "@/lib/openai/client";
import type { FeatureHighlight, VehicleInput } from "@/types/listing";

type FeatureExtractionResult = {
  featureHighlights: FeatureHighlight[];
  featureQuestions: string[];
};

const fallbackFeatureLabels = [
  "Backup Camera",
  "Bluetooth",
  "Apple CarPlay",
  "Android Auto",
  "Heated Seats",
  "Blind Spot Monitoring",
  "Navigation",
  "Leather Seats",
  "Sunroof",
  "Remote Start",
  "Adaptive Cruise Control",
  "Lane Keep Assist",
  "Alloy Wheels",
  "Third Row Seating",
  "Tow Package",
];

function featureFromText(label: string, text: string): FeatureHighlight | null {
  const pattern = new RegExp(`\\b${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  if (!pattern.test(text)) return null;
  return {
    label,
    status: "confirmed",
    source: "staff input",
    reason: "This feature was included in dealership-entered notes or feature fields.",
  };
}

export function formatFeatureLabel(feature: FeatureHighlight) {
  return feature.status === "unsure" || feature.status === "ask_user"
    ? `${feature.label} [unsure if applicable]`
    : feature.label;
}

export function localFeatureFallback(vehicle: VehicleInput): FeatureExtractionResult {
  const staffText = [
    vehicle.keyFeatures,
    vehicle.sellerNotes,
    vehicle.upgrades,
    vehicle.vehicleIntelligenceSummary,
  ].filter(Boolean).join("\n");
  const featureHighlights = fallbackFeatureLabels
    .map((label) => featureFromText(label, staffText))
    .filter(Boolean) as FeatureHighlight[];

  if (vehicle.mpg) {
    featureHighlights.push({
      label: `${vehicle.mpg} MPG`,
      status: "confirmed",
      source: "staff input",
      reason: "MPG was entered by dealership staff.",
    });
  }

  return {
    featureHighlights: featureHighlights.slice(0, 12),
    featureQuestions: vehicle.trim ? [] : ["Which trim is this vehicle? Trim helps confirm package-specific features."],
  };
}

export async function extractFeatureHighlights(vehicle: VehicleInput): Promise<FeatureExtractionResult> {
  const client = getOpenAIClient();
  const fallback = localFeatureFallback(vehicle);

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.15,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You extract dealership vehicle feature highlights. Return strict JSON only. Use confirmed only for staff-entered or decoded/provided facts. Use likely only when trim and provided data strongly support it. Use unsure for trim/package features that may vary. Use ask_user for deciding factors when trim or packages are missing. Never invent title, accident, warranty, owner, service, financing, or condition claims.",
        },
        {
          role: "user",
          content: `Return JSON exactly:
{
  "featureHighlights": [
    {
      "label": "",
      "status": "confirmed | likely | unsure | ask_user",
      "source": "",
      "reason": "",
      "question": ""
    }
  ],
  "featureQuestions": []
}

Vehicle input:
${JSON.stringify(vehicle, null, 2)}

Rules:
- Prefer short chip labels like "Heated Seats", "Backup Camera", "Blind Spot Monitoring", "37 MPG Highway".
- If the trim is missing, ask deciding-factor questions such as drivetrain, package, seat material, screen/navigation, safety package, or roof.
- If you are unsure whether a feature applies, include it with status "unsure"; the UI will display [unsure if applicable].
- Do not include unsupported premium features as confirmed.
- Do not exceed 14 feature highlights.
- Do not put title status, accident history, warranty, financing, service history, or ownership history in featureHighlights.
- If staff entered features directly, those can be confirmed.`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return fallback;
    const parsed = parseStrictJson<FeatureExtractionResult>(content);
    return {
      featureHighlights: (parsed.featureHighlights || []).slice(0, 14),
      featureQuestions: (parsed.featureQuestions || []).slice(0, 6),
    };
  } catch {
    return fallback;
  }
}
