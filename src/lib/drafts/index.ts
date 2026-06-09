import type { GenerationPreferences, ListingOutput, ListingPlatform, VehicleInput } from "@/types/listing";

export type DraftMutation = {
  inputData?: VehicleInput;
  preferences?: GenerationPreferences;
  generatedOutput?: ListingOutput | null;
  currentStep?: "facts" | "fill_in" | "copy";
  activePlatform?: ListingPlatform;
  status?: "draft" | "ready" | "generated" | "published" | "archived";
  listingId?: string | null;
  batchItemId?: string | null;
};

export function draftSearchColumns(vehicle: VehicleInput) {
  const title = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ");
  return {
    title: title || vehicle.vin || "Untitled vehicle",
    vin: vehicle.vin || null,
    stock_number: vehicle.stockNumber || null,
    year: vehicle.year || null,
    make: vehicle.make || null,
    model: vehicle.model || null,
    trim: vehicle.trim || null,
    exterior_color: vehicle.exteriorColor || null,
  };
}

export function hasMeaningfulDraftData(vehicle: VehicleInput) {
  return Boolean(
    vehicle.vin ||
      vehicle.make ||
      vehicle.model ||
      vehicle.year ||
      vehicle.stockNumber ||
      vehicle.sellerNotes ||
      vehicle.keyFeatures,
  );
}

