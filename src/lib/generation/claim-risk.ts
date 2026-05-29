import type { ClaimRisk, ClaimRiskAudit, ListingOutput, RiskLevel, VehicleInput } from "@/types/listing";

const claimChecks: Array<{
  claim: string;
  pattern: RegExp;
  field: keyof VehicleInput;
  positivePattern: RegExp;
  reason: string;
  recommendation: string;
  severity: RiskLevel;
}> = [
  {
    claim: "Clean title",
    pattern: /\b(clean title|clear title)\b/i,
    field: "titleStatus",
    positivePattern: /\b(clean|clear)\b/i,
    reason: "Title status must be explicitly provided before the listing can claim clean title.",
    recommendation: "Confirm the title status or remove the clean-title claim.",
    severity: "high",
  },
  {
    claim: "No accidents",
    pattern: /\b(no accidents?|accident[-\s]?free)\b/i,
    field: "accidentHistory",
    positivePattern: /\b(no accidents?|accident[-\s]?free|none reported)\b/i,
    reason: "Accident history cannot be claimed unless it was entered by dealership staff.",
    recommendation: "Add verified accident history or remove the no-accident language.",
    severity: "high",
  },
  {
    claim: "One owner",
    pattern: /\b(one[-\s]?owner|1[-\s]?owner|single owner)\b/i,
    field: "ownershipHistory",
    positivePattern: /\b(one[-\s]?owner|1[-\s]?owner|single owner)\b/i,
    reason: "Ownership history cannot be claimed unless it was explicitly provided.",
    recommendation: "Verify ownership history before publishing.",
    severity: "high",
  },
  {
    claim: "Warranty",
    pattern: /\b(warranty|covered|factory coverage|extended coverage)\b/i,
    field: "warrantyInfo",
    positivePattern: /\b(warranty|covered|factory coverage|extended coverage|as-is)\b/i,
    reason: "Warranty language needs dealership-provided terms.",
    recommendation: "Add warranty terms or remove warranty-related copy.",
    severity: "high",
  },
  {
    claim: "Financing",
    pattern: /\b(financing available|approved|bad credit|low payments?|monthly payments?)\b/i,
    field: "financingInfo",
    positivePattern: /\b(financ|payment|credit|approved)\b/i,
    reason: "Financing claims need explicit dealership-provided details.",
    recommendation: "Add approved financing language or remove financing claims.",
    severity: "medium",
  },
  {
    claim: "Service history",
    pattern: /\b(service records?|well maintained|maintenance history|regularly serviced)\b/i,
    field: "serviceHistory",
    positivePattern: /\b(service|maintenance|records?|regularly serviced|well maintained)\b/i,
    reason: "Service history should only be referenced when supplied.",
    recommendation: "Add service history details or keep the copy focused on current condition.",
    severity: "medium",
  },
  {
    claim: "Perfect condition",
    pattern: /\b(perfect condition|flawless|like new|mint condition)\b/i,
    field: "overallCondition",
    positivePattern: /\b(perfect|flawless|like new|mint)\b/i,
    reason: "Absolute condition claims carry risk unless staff entered that language deliberately.",
    recommendation: "Use specific condition notes instead of absolute condition language.",
    severity: "medium",
  },
];

function outputToText(output: ListingOutput) {
  return [
    output.title,
    output.shortTitle,
    output.facebookListing,
    output.websiteDescription,
    output.craigslistListing,
    output.autoTraderStyleDescription,
    output.conditionNote,
    output.seoTitle,
    output.seoMetaDescription,
    output.salesAngle,
    output.disclaimer,
    ...(output.highlights || []),
    ...(output.features || []),
    ...(output.featureHighlights || []).map((feature) => `${feature.label} ${feature.status} ${feature.reason}`),
  ].join("\n");
}

function hasSupportedInput(vehicle: VehicleInput, field: keyof VehicleInput, positivePattern: RegExp) {
  const value = String(vehicle[field] || "");
  return positivePattern.test(value);
}

export function auditListingClaims(vehicle: VehicleInput, output: ListingOutput): ClaimRiskAudit {
  const text = outputToText(output);
  const riskClaims: ClaimRisk[] = claimChecks
    .filter((check) => check.pattern.test(text) && !hasSupportedInput(vehicle, check.field, check.positivePattern))
    .map((check) => ({
      claim: check.claim,
      reason: check.reason,
      severity: check.severity,
      recommendation: check.recommendation,
    }));

  const missingDetails = [
    !vehicle.titleStatus?.trim() ? "Title status" : null,
    !vehicle.accidentHistory?.trim() ? "Accident history" : null,
    !vehicle.serviceHistory?.trim() ? "Service history" : null,
    !vehicle.ownershipHistory?.trim() ? "Ownership history" : null,
    !vehicle.warrantyInfo?.trim() ? "Warranty terms" : null,
    !vehicle.financingInfo?.trim() ? "Financing terms" : null,
  ].filter(Boolean) as string[];

  const highRiskCount = riskClaims.filter((claim) => claim.severity === "high").length;
  const mediumRiskCount = riskClaims.filter((claim) => claim.severity === "medium").length;
  const score = Math.max(0, 100 - highRiskCount * 28 - mediumRiskCount * 14 - Math.min(missingDetails.length * 3, 15));
  const riskLevel: RiskLevel = highRiskCount > 0 ? "high" : mediumRiskCount > 0 ? "medium" : "low";

  const recommendations = [
    ...riskClaims.map((claim) => claim.recommendation),
    missingDetails.length ? "Add missing history and policy details when staff can verify them." : null,
  ].filter(Boolean) as string[];

  return {
    score,
    riskLevel,
    missingDetails,
    riskClaims,
    recommendations: [...new Set(recommendations)],
  };
}
