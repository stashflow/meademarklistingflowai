import { z } from "zod";
import type { InputQualityResult, VehicleInput } from "@/types/listing";

const numericString = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || !Number.isNaN(Number(value.replaceAll(",", ""))), {
    message: "Must be a number.",
  });

export const vehicleInputSchema = z.object({
  vin: z.string().trim().max(32).optional(),
  vinDecoded: z.string().trim().max(20).optional(),
  vinDecodeSource: z.string().trim().max(120).optional(),
  vinDecodeWarnings: z.string().trim().max(1000).optional(),
  vehicleIntelligenceSummary: z.string().trim().max(2000).optional(),
  vehicleSafetySummary: z.string().trim().max(2000).optional(),
  vehicleRecallSummary: z.string().trim().max(2000).optional(),
  vehicleValueNotes: z.string().trim().max(1000).optional(),
  vehicleIntelligenceScore: z.string().trim().max(20).optional(),
  vehicleIntelligenceSource: z.string().trim().max(240).optional(),
  vehicleIntelligenceCached: z.string().trim().max(20).optional(),
  vehicleIntelligenceWarnings: z.string().trim().max(2000).optional(),
  validatedFeaturesJson: z.string().trim().max(6000).optional(),
  featureClarificationQuestions: z.string().trim().max(2000).optional(),
  year: z.string().trim().max(4).optional(),
  make: z.string().trim().max(80).optional(),
  model: z.string().trim().max(80).optional(),
  trim: z.string().trim().max(120).optional(),
  mileage: numericString,
  price: numericString,
  exteriorColor: z.string().trim().max(80).optional(),
  interiorColor: z.string().trim().max(80).optional(),
  drivetrain: z.string().trim().max(80).optional(),
  transmission: z.string().trim().max(80).optional(),
  engine: z.string().trim().max(120).optional(),
  fuelType: z.string().trim().max(80).optional(),
  mpg: z.string().trim().max(80).optional(),
  stockNumber: z.string().trim().max(80).optional(),
  vehicleType: z.string().trim().max(80).optional(),
  imageUrls: z.string().trim().max(3000).optional(),
  photoNotes: z.string().trim().max(1000).optional(),
  condition: z.string().trim().max(120).optional(),
  overallCondition: z.string().trim().max(120).optional(),
  accidentHistory: z.string().trim().max(400).optional(),
  titleStatus: z.string().trim().max(400).optional(),
  serviceHistory: z.string().trim().max(600).optional(),
  ownershipHistory: z.string().trim().max(400).optional(),
  tireCondition: z.string().trim().max(400).optional(),
  interiorCondition: z.string().trim().max(400).optional(),
  exteriorCondition: z.string().trim().max(400).optional(),
  keyFeatures: z.string().trim().max(1500).optional(),
  recentMaintenance: z.string().trim().max(800).optional(),
  upgrades: z.string().trim().max(800).optional(),
  warrantyInfo: z.string().trim().max(800).optional(),
  financingInfo: z.string().trim().max(800).optional(),
  sellerNotes: z.string().trim().max(2000).optional(),
});

export const generationPreferencesSchema = z.object({
  platforms: z.array(z.string()).min(1),
  tone: z.string().min(1),
  length: z.enum(["short", "standard", "detailed"]),
  useStyleProfile: z.boolean(),
  customInstructions: z.string().max(1000).optional(),
  wordsToAvoid: z.string().max(600).optional(),
  ctaOverride: z.string().max(400).optional(),
});

export const listingGenerationRequestSchema = z.object({
  dealershipId: z.string().uuid(),
  vehicle: vehicleInputSchema,
  preferences: generationPreferencesSchema,
});

export function deterministicVehicleValidation(vehicle: VehicleInput): InputQualityResult {
  const issues: string[] = [];
  const vin = vehicle.vin?.trim();
  const hasVin = Boolean(vin);
  const hasYmm = Boolean(vehicle.year?.trim() && vehicle.make?.trim() && vehicle.model?.trim());

  if (!hasVin && !hasYmm) {
    issues.push("Provide either a VIN or year, make, and model.");
  }

  if (vin && (vin.length < 11 || vin.length > 17)) {
    issues.push("VIN length looks unusual. Enter a 17-character VIN or use year/make/model.");
  }

  const year = vehicle.year?.trim();
  if (year) {
    const parsedYear = Number(year);
    const nextModelYear = new Date().getFullYear() + 2;
    if (!Number.isInteger(parsedYear) || parsedYear < 1981 || parsedYear > nextModelYear) {
      issues.push(`Year should be between 1981 and ${nextModelYear}.`);
    }
  }

  const mileage = vehicle.mileage?.replaceAll(",", "").trim();
  if (!mileage) {
    issues.push("Mileage is required for a dealer-ready listing.");
  } else if (Number.isNaN(Number(mileage)) || Number(mileage) < 0) {
    issues.push("Mileage must be a positive number.");
  }

  if (!vehicle.condition?.trim() && !vehicle.overallCondition?.trim()) {
    issues.push("Condition is required for a dealer-ready listing.");
  }

  const price = vehicle.price?.replaceAll(",", "").trim();
  if (price && (Number.isNaN(Number(price)) || Number(price) < 0)) {
    issues.push("Price must be a positive number when provided.");
  }

  const meaningfulFields = Object.values(vehicle).filter(
    (value) => typeof value === "string" && value.trim().length > 1,
  ).length;
  if (meaningfulFields < 4) {
    issues.push("Add more vehicle details so the listing is accurate and useful.");
  }

  if (issues.length > 0) {
    return {
      status: "incomplete",
      issues,
      userMessage:
        "Please add at least a year, model, mileage, and condition so ListingFlow can write a useful listing.",
      canGenerate: false,
    };
  }

  return {
    status: "valid",
    issues: [],
    userMessage: "",
    canGenerate: true,
  };
}

export function normalizeNumber(value?: string) {
  if (!value) return null;
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : null;
}
