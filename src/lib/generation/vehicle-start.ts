import type { VehicleInput } from "@/types/listing";

const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/i;
const yearPattern = /^(19[8-9]\d|20\d{2})$/;

export function parseVehicleStartInput(raw: string): VehicleInput {
  const text = raw.trim();
  if (!text) return {};
  const compact = text.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
  if (vinPattern.test(compact)) return { vin: compact };

  const parts = text.split(/\s+/).filter(Boolean);
  const input: VehicleInput = {};
  if (parts[0] && yearPattern.test(parts[0])) {
    input.year = parts.shift();
  }
  if (parts[0]) input.make = parts.shift();
  if (parts[0]) input.model = parts.shift();
  if (parts.length) input.trim = parts.join(" ");
  return input;
}

export function isCompleteVin(value?: string) {
  return vinPattern.test(String(value || "").trim().toUpperCase());
}

