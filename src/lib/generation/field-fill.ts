import { getOpenAIClient, parseStrictJson } from "@/lib/openai/client";
import type { VehicleInput } from "@/types/listing";

export type FieldFillResult = {
  canFill: boolean;
  value: string;
  message: string;
};

const fillableFields = new Set<keyof VehicleInput>([
  "keyFeatures",
  "recentMaintenance",
  "upgrades",
  "warrantyInfo",
  "financingInfo",
  "sellerNotes",
  "condition",
  "overallCondition",
  "interiorCondition",
  "exteriorCondition",
  "tireCondition",
]);

export function canAutoFillField(field: keyof VehicleInput) {
  return fillableFields.has(field);
}

function usefulContextCount(vehicle: VehicleInput) {
  return [
    vehicle.vin,
    vehicle.year,
    vehicle.make,
    vehicle.model,
    vehicle.trim,
    vehicle.mileage,
    vehicle.condition,
    vehicle.overallCondition,
    vehicle.keyFeatures,
    vehicle.sellerNotes,
    vehicle.vehicleIntelligenceSummary,
  ].filter((value) => typeof value === "string" && value.trim().length > 2).length;
}

export async function fillSingleVehicleField(vehicle: VehicleInput, field: keyof VehicleInput): Promise<FieldFillResult> {
  if (!canAutoFillField(field)) {
    return { canFill: false, value: "", message: "This field is not supported by LF quick fill." };
  }

  if (usefulContextCount(vehicle) < 4) {
    return {
      canFill: false,
      value: "",
      message: "Sorry, not enough info yet. Add a VIN or year/make/model, mileage, condition, and a few notes first.",
    };
  }

  const client = getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.15,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You fill exactly one vehicle listing form field from existing dealership data. Return strict JSON. Do not invent title status, accident history, warranty, financing, ownership, service history, condition, trim packages, or features. If there is not enough support, return canFill false.",
      },
      {
        role: "user",
        content: `Return JSON:
{
  "canFill": true,
  "value": "",
  "message": ""
}

Target field: ${field}

Vehicle context:
${JSON.stringify(vehicle, null, 2)}

Rules:
- Fill only the target field.
- Use only facts present in the context.
- For warrantyInfo or financingInfo, only fill if explicit warranty/financing details are present. Otherwise canFill false.
- For condition fields, do not make the vehicle sound cleaner than staff notes support.
- For keyFeatures, include only provided or clearly decoded/sourced features; mark uncertain feature text with [unsure if applicable].
- Keep the value concise and form-ready.`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    return { canFill: false, value: "", message: "Sorry, not enough info yet." };
  }
  return parseStrictJson<FieldFillResult>(content);
}
