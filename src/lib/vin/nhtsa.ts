import type { VehicleInput } from "@/types/listing";

export type VinDecodeResult = {
  vin: string;
  source: "NHTSA VPIC";
  decoded: VehicleInput;
  warnings: string[];
  raw: Record<string, string>;
};

const fieldMap: Array<[string, keyof VehicleInput]> = [
  ["Model Year", "year"],
  ["Make", "make"],
  ["Model", "model"],
  ["Trim", "trim"],
  ["Series", "trim"],
  ["Body Class", "vehicleType"],
  ["Drive Type", "drivetrain"],
  ["Transmission Style", "transmission"],
  ["Engine Model", "engine"],
  ["Engine Configuration", "engine"],
  ["Displacement (L)", "engine"],
  ["Fuel Type - Primary", "fuelType"],
];

function clean(value: unknown) {
  const text = String(value || "").trim();
  if (!text || text.toLowerCase() === "not applicable") return "";
  return text;
}

function mergeEngine(raw: Record<string, string>) {
  return [
    raw["Displacement (L)"] ? `${raw["Displacement (L)"]}L` : "",
    raw["Engine Configuration"],
    raw["Engine Model"],
  ].filter(Boolean).join(" ");
}

export async function decodeVinWithNhtsa(vin: string): Promise<VinDecodeResult> {
  const normalizedVin = vin.trim().toUpperCase();
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(normalizedVin)) {
    throw new Error("Enter a valid 17-character VIN. VINs do not use I, O, or Q.");
  }

  const response = await fetch(
    `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(normalizedVin)}?format=json`,
    { next: { revalidate: 60 * 60 * 24 * 30 } },
  );

  if (!response.ok) {
    throw new Error("VIN decoder is temporarily unavailable. Enter vehicle details manually or try again.");
  }

  const payload = await response.json() as { Results?: Array<Record<string, unknown>> };
  const result = payload.Results?.[0];
  if (!result) {
    throw new Error("VIN decoder returned no vehicle details.");
  }

  const raw = Object.fromEntries(
    Object.entries(result).map(([key, value]) => [key, clean(value)]),
  );

  const decoded: VehicleInput = {
    vin: normalizedVin,
    vinDecoded: "true",
    vinDecodeSource: "NHTSA VPIC",
  };

  for (const [sourceField, targetField] of fieldMap) {
    const value = raw[sourceField];
    if (!value || decoded[targetField]) continue;
    decoded[targetField] = value;
  }

  const engine = mergeEngine(raw);
  if (engine) decoded.engine = engine;

  const warnings = [
    raw.ErrorText && !raw.ErrorText.startsWith("0") ? raw.ErrorText : "",
    !decoded.year ? "NHTSA did not return model year." : "",
    !decoded.make ? "NHTSA did not return make." : "",
    !decoded.model ? "NHTSA did not return model." : "",
    "Confirm trim, mileage, condition, price, title, accident history, warranty, and selling points before generating.",
  ].filter(Boolean);

  decoded.vinDecodeWarnings = warnings.join("\n");

  return {
    vin: normalizedVin,
    source: "NHTSA VPIC",
    decoded,
    warnings,
    raw,
  };
}
