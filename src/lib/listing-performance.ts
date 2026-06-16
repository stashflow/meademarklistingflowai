import type { ClaimRisk, ClaimRiskAudit, ListingOutput, RiskLevel, SavedListing, VehicleInput } from "@/types/listing";

export type ListingFixPriority = "high" | "medium" | "low";

export type ListingPerformanceIssue = {
  id: string;
  label: string;
  detail: string;
  priority: ListingFixPriority;
};

export type PhotoChecklistItem = {
  id: string;
  label: string;
  complete: boolean;
  detail: string;
};

export type ListingPerformanceScore = {
  listingScore: number;
  completenessScore: number;
  seoScore: number;
  conversionScore: number;
  platformScore: number;
  complianceScore: number;
  leadPotentialScore: number;
  searchVisibilityScore: number;
  missingFields: ListingPerformanceIssue[];
  riskFlags: ListingPerformanceIssue[];
  suggestedFixes: ListingPerformanceIssue[];
  photoChecklist: PhotoChecklistItem[];
  recommendedAction: string;
};

type ChannelName = "facebook" | "craigslist" | "website" | "autotrader" | "seo";

type SignalIssueTarget = "missing" | "risk" | "fix";

type SignalIssue = ListingPerformanceIssue & {
  target: SignalIssueTarget;
  weight: number;
};

const PRIORITY_RANK: Record<ListingFixPriority, number> = { low: 1, medium: 2, high: 3 };

const FEATURE_KEYWORDS = [
  "backup camera",
  "rear camera",
  "bluetooth",
  "heated seats",
  "cooled seats",
  "navigation",
  "apple carplay",
  "android auto",
  "sunroof",
  "moonroof",
  "leather",
  "awd",
  "4wd",
  "third row",
  "remote start",
  "blind spot",
  "adaptive cruise",
  "lane keep",
  "tow package",
  "premium audio",
  "keyless entry",
  "push button",
];

const BUYER_BENEFIT_TERMS = [
  "commute",
  "family",
  "road trip",
  "work",
  "jobsite",
  "fuel",
  "efficient",
  "comfortable",
  "cargo",
  "space",
  "capability",
  "confidence",
  "daily",
  "weekend",
  "tow",
  "safe",
  "easy",
];

const TRUST_TERMS = [
  "service",
  "maintenance",
  "inspection",
  "history",
  "verified",
  "carfax",
  "autocheck",
  "warranty",
  "clean title",
  "title",
  "records",
  "dealer",
  "reconditioned",
];

const CTA_TERMS = [
  "call",
  "text",
  "message",
  "schedule",
  "test drive",
  "contact",
  "visit",
  "apply",
  "financing",
  "trade",
  "today",
];

const GENERIC_PHRASES = [
  "great car",
  "must see",
  "won't last",
  "runs great",
  "priced to sell",
  "loaded",
  "clean inside and out",
  "very nice",
  "great deal",
  "nice vehicle",
];

const UNSAFE_ABSOLUTES = [
  "perfect",
  "flawless",
  "guaranteed approval",
  "guaranteed financing",
  "accident free",
  "no accidents",
  "one owner",
  "clean title",
  "mint condition",
  "like new",
  "best price",
  "lowest price",
];

const PHOTO_REQUIREMENTS = [
  {
    id: "front_exterior",
    label: "Front exterior",
    detail: "Add a clear front three-quarter photo.",
    aliases: ["front", "front exterior", "front 3/4", "front three quarter"],
  },
  {
    id: "rear_exterior",
    label: "Rear exterior",
    detail: "Add a rear three-quarter photo.",
    aliases: ["rear", "back", "rear exterior", "rear 3/4", "rear three quarter"],
  },
  {
    id: "interior_dash",
    label: "Interior dashboard",
    detail: "Show the cabin, controls, and screen.",
    aliases: ["interior", "dash", "dashboard", "cockpit", "screen"],
  },
  {
    id: "odometer",
    label: "Odometer",
    detail: "Include mileage proof when possible.",
    aliases: ["odometer", "mileage", "cluster"],
  },
  {
    id: "wheels_tires",
    label: "Wheels and tires",
    detail: "Show tire and wheel condition.",
    aliases: ["wheel", "wheels", "tire", "tires", "rim"],
  },
  {
    id: "cargo_or_trunk",
    label: "Cargo or trunk",
    detail: "Show practical storage space.",
    aliases: ["cargo", "trunk", "bed", "hatch", "storage"],
  },
] as const;

const FIELD_LABELS: Partial<Record<keyof VehicleInput, string>> = {
  vin: "VIN",
  year: "Year",
  make: "Make",
  model: "Model",
  trim: "Trim",
  mileage: "Mileage",
  price: "Price",
  drivetrain: "Drivetrain",
  transmission: "Transmission",
  engine: "Engine",
  exteriorColor: "Exterior color",
  interiorColor: "Interior color",
  keyFeatures: "Key features",
  condition: "Condition",
  overallCondition: "Overall condition",
  titleStatus: "Title status",
  accidentHistory: "Accident history",
  serviceHistory: "Service history",
  ownershipHistory: "Ownership history",
  warrantyInfo: "Warranty terms",
  financingInfo: "Financing terms",
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeText(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\w\s$.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasValue(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value !== "string") return true;
  const normalized = normalizeText(value);
  return Boolean(normalized) && !["n/a", "na", "none", "unknown", "not sure", "tbd", "null", "undefined"].includes(normalized);
}

function parseNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function hasValidVin(vin: unknown) {
  return /^[A-HJ-NPR-Z0-9]{17}$/i.test(String(vin || "").trim());
}

function textIncludes(text: string, terms: string[]) {
  const normalized = normalizeText(text);
  return terms.filter(Boolean).some((term) => normalized.includes(normalizeText(term)));
}

function countMatches(text: string, terms: string[]) {
  const normalized = normalizeText(text);
  return new Set(terms.filter((term) => term && normalized.includes(normalizeText(term)))).size;
}

function wordCount(text: string) {
  return normalizeText(text).split(/\s+/).filter(Boolean).length;
}

function sentenceCount(text: string) {
  return Math.max(1, String(text || "").split(/[.!?]+/).filter((sentence) => sentence.trim().length > 8).length);
}

function outputText(output: ListingOutput) {
  return [
    output.title,
    output.shortTitle,
    output.facebookListing,
    output.carGurusListing,
    output.websiteDescription,
    output.craigslistListing,
    output.autoTraderStyleDescription,
    output.seoTitle,
    output.seoMetaDescription,
    output.salesAngle,
    output.conditionNote,
    output.disclaimer,
    ...(output.highlights || []),
    ...(output.features || []),
    ...(output.featureHighlights || []).map((feature) => `${feature.label} ${feature.status} ${feature.reason}`),
  ].filter(Boolean).join("\n");
}

function vehicleNameTerms(vehicle: VehicleInput) {
  return [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(hasValue).map(String);
}

function parseFeatureCount(vehicle: VehicleInput, output: ListingOutput) {
  const inputFeatures = String(vehicle.keyFeatures || "")
    .split(/[,;\n|]+/)
    .map((feature) => feature.trim())
    .filter(Boolean);
  return new Set([...inputFeatures, ...(output.features || []), ...(output.highlights || [])].map(normalizeText).filter(Boolean)).size;
}

function issuePriorityFromWeight(weight: number): ListingFixPriority {
  if (weight >= 3.5) return "high";
  if (weight >= 1.75) return "medium";
  return "low";
}

function makeIssue(
  target: SignalIssueTarget,
  id: string,
  label: string,
  detail: string,
  weight: number,
  priority: ListingFixPriority = issuePriorityFromWeight(weight),
): SignalIssue {
  return { target, id, label, detail, priority, weight };
}

function dedupeIssues(issues: SignalIssue[], target: SignalIssueTarget) {
  const byId = new Map<string, SignalIssue>();
  issues.filter((issue) => issue.target === target).forEach((issue) => {
    const existing = byId.get(issue.id);
    if (!existing || issue.weight > existing.weight || PRIORITY_RANK[issue.priority] > PRIORITY_RANK[existing.priority]) {
      byId.set(issue.id, issue);
    }
  });
  return [...byId.values()]
    .sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || b.weight - a.weight)
    .map((issue) => ({
      id: issue.id,
      label: issue.label,
      detail: issue.detail,
      priority: issue.priority,
    }));
}

function scoreCategory(maxPoints: number, checks: Array<{ points: number; issue?: SignalIssue | null }>, issues: SignalIssue[]) {
  let points = 0;
  checks.forEach((check) => {
    points += clamp(check.points, 0, maxPoints);
    if (check.issue) issues.push(check.issue);
  });
  return { raw: clamp(points, 0, maxPoints), score: clampScore((clamp(points, 0, maxPoints) / maxPoints) * 100) };
}

function fieldIssue(field: keyof VehicleInput, detail: string, weight: number, priority?: ListingFixPriority) {
  const label = FIELD_LABELS[field] || String(field);
  return makeIssue("missing", `missing_${String(field)}`, `${label} missing`, detail, weight, priority);
}

function getReadabilityScore(text: string) {
  const words = wordCount(text);
  const avgSentenceLength = words / sentenceCount(text);
  const paragraphs = String(text || "").split(/\n{2,}/).filter((paragraph) => paragraph.trim().length > 20).length;
  const bulletCount = (String(text || "").match(/(^|\n)\s*[-*•]/g) || []).length;
  const tooShort = words < 80;
  const tooLong = words > 700;
  const sentencePenalty = avgSentenceLength > 28 ? 1.2 : avgSentenceLength > 22 ? 0.6 : 0;
  const structureBonus = paragraphs >= 2 || bulletCount >= 3 ? 1 : 0;
  return clamp(3.5 - sentencePenalty - (tooShort ? 1.3 : 0) - (tooLong ? 0.9 : 0) + structureBonus, 0, 4);
}

function channelReadiness(text: string, channel: ChannelName, vehicle: VehicleInput) {
  const words = wordCount(text);
  const hasVehicleName = countMatches(text, vehicleNameTerms(vehicle).slice(1)) >= Math.min(2, vehicleNameTerms(vehicle).slice(1).length);
  const hasCta = textIncludes(text, CTA_TERMS);
  const hasPrice = hasValue(vehicle.price) || /\$[0-9]/.test(text);
  const hasMileage = hasValue(vehicle.mileage) || /\b[0-9,]{2,}\s*(mi|miles|mile)\b/i.test(text);
  const hasBullets = /(^|\n)\s*[-*•]/.test(text) || (text.match(/\n/g) || []).length >= 3;

  if (channel === "facebook") {
    return clamp((words >= 55 && words <= 220 ? 1.2 : 0.4) + (hasVehicleName ? 0.8 : 0) + (hasPrice ? 0.5 : 0) + (hasMileage ? 0.4 : 0) + (hasCta ? 0.6 : 0), 0, 3.5);
  }
  if (channel === "craigslist") {
    return clamp((words >= 70 && words <= 320 ? 0.9 : 0.3) + (hasBullets ? 0.6 : 0) + (hasPrice ? 0.35 : 0) + (hasMileage ? 0.3 : 0) + (hasCta ? 0.35 : 0), 0, 2.5);
  }
  if (channel === "website") {
    return clamp((words >= 110 && words <= 550 ? 1.2 : 0.4) + (countMatches(text, FEATURE_KEYWORDS) >= 2 ? 0.8 : 0) + (hasVehicleName ? 0.7 : 0) + (textIncludes(text, TRUST_TERMS) ? 0.5 : 0) + (hasCta ? 0.3 : 0), 0, 3.5);
  }
  if (channel === "autotrader") {
    return clamp((words >= 80 && words <= 420 ? 0.7 : 0.25) + (hasVehicleName ? 0.5 : 0) + (countMatches(text, FEATURE_KEYWORDS) >= 1 ? 0.45 : 0) + (hasCta ? 0.35 : 0), 0, 2);
  }
  return 0;
}

function photoChecklist(vehicle: VehicleInput, imageCount: number) {
  const notes = vehicle.photoNotes || "";
  return PHOTO_REQUIREMENTS.map((requirement, index) => ({
    id: requirement.id,
    label: requirement.label,
    detail: requirement.detail,
    complete: imageCount > index || textIncludes(notes, [...requirement.aliases, "complete", "all photos"]),
  }));
}

function riskPenalty(riskClaims: ClaimRisk[], missingDetails: string[], allOutput: string) {
  const severityPenalty = riskClaims.reduce((total, claim) => {
    if (claim.severity === "high") return total + 7.5;
    if (claim.severity === "medium") return total + 4;
    if (claim.severity === "low") return total + 1.5;
    return total + 2.5;
  }, 0);
  const absolutePenalty = Math.min(countMatches(allOutput, UNSAFE_ABSOLUTES) * 0.8, 4);
  const missingEvidencePenalty = Math.min(missingDetails.length * 0.65, 4);
  return severityPenalty + absolutePenalty + missingEvidencePenalty;
}

function recommendedAction(score: ListingPerformanceScore) {
  if (score.riskFlags.some((risk) => risk.priority === "high")) return "Resolve unsupported advertising-risk claims before publishing";
  if (score.completenessScore < 68) return "Fill missing vehicle facts, then regenerate copy";
  if (score.listingScore < 58) return "Rebuild the listing before it goes live";
  if (score.photoChecklist.filter((item) => item.complete).length < 4) return "Add core photos before promoting this vehicle";
  if (score.seoScore < 70) return "Improve title, keywords, and SEO assets";
  if (score.conversionScore < 70) return "Rewrite for buyer benefits, trust signals, and CTA";
  if (score.listingScore < 82) return "Optimize copy before syndicating broadly";
  return "Ready to publish or syndicate";
}

export function scoreListingPerformance(
  vehicle: VehicleInput,
  output: ListingOutput,
  imageCount = 0,
  daysListed = 0,
): ListingPerformanceScore {
  const issues: SignalIssue[] = [];
  const allOutput = outputText(output);
  const titleText = `${output.title || ""} ${output.shortTitle || ""} ${output.seoTitle || ""}`;
  const featureText = `${vehicle.keyFeatures || ""} ${(output.features || []).join(" ")} ${(output.highlights || []).join(" ")}`;
  const featureCount = parseFeatureCount(vehicle, output);
  const vinVerified = hasValidVin(vehicle.vin) && (vehicle.vinDecoded === "true" || hasValue(vehicle.vinDecodeSource) || hasValue(vehicle.vehicleIntelligenceSummary));
  const vinPresent = hasValidVin(vehicle.vin) || hasValue(vehicle.vin);
  const mileage = parseNumber(vehicle.mileage);
  const price = parseNumber(vehicle.price);
  const year = parseNumber(vehicle.year);
  const implausibleMileage = mileage !== null && mileage > 350000;
  const implausiblePrice = price !== null && (price < 500 || price > 500000);
  const implausibleYear = year !== null && (year < 1981 || year > new Date().getFullYear() + 1);

  const completeness = scoreCategory(25, [
    {
      points: vinVerified ? 4 : vinPresent ? 2.4 : 0,
      issue: vinPresent && !vinVerified
        ? makeIssue("fix", "verify_vin", "Verify VIN decode", "VIN is present, but decoded source data is not confirmed.", 1.6, "medium")
        : !vinPresent
          ? fieldIssue("vin", "Add a valid 17-character VIN or verified source record.", 4, "high")
          : null,
    },
    {
      points: [vehicle.year, vehicle.make, vehicle.model].filter(hasValue).length / 3 * 4,
      issue: [vehicle.year, vehicle.make, vehicle.model].every(hasValue) ? null : fieldIssue("model", "Add year, make, and model so every channel can classify the vehicle.", 4, "high"),
    },
    {
      points: hasValue(vehicle.trim) ? 3 : 0,
      issue: hasValue(vehicle.trim) ? null : fieldIssue("trim", "Add trim to improve search matching, shopper confidence, and pricing context.", 3, "medium"),
    },
    {
      points: mileage && !implausibleMileage ? 3 : mileage ? 1.2 : 0,
      issue: mileage && !implausibleMileage ? null : fieldIssue("mileage", implausibleMileage ? "Mileage looks unusually high. Confirm it before publishing." : "Add mileage before publishing or syndicating.", 3, "high"),
    },
    {
      points: price && !implausiblePrice ? 3 : price ? 1.2 : 0,
      issue: price && !implausiblePrice ? null : fieldIssue("price", implausiblePrice ? "Price looks unusual. Confirm pricing before publishing." : "Add price or clear pricing instructions.", 3, "high"),
    },
    {
      points: [vehicle.drivetrain, vehicle.transmission, vehicle.engine].filter(hasValue).length,
      issue: [vehicle.drivetrain, vehicle.transmission, vehicle.engine].filter(hasValue).length === 3 ? null : makeIssue("missing", "missing_powertrain", "Powertrain details incomplete", "Add drivetrain, transmission, and engine when verified.", 2.2, "medium"),
    },
    {
      points: featureCount >= 6 ? 3 : featureCount >= 3 ? 2 : featureCount >= 1 ? 1 : 0,
      issue: featureCount >= 3 ? null : fieldIssue("keyFeatures", "Add at least three buyer-facing equipment highlights.", 2.4, "medium"),
    },
    {
      points: hasValue(vehicle.condition) || hasValue(vehicle.overallCondition) || hasValue(output.conditionNote) ? 2 : 0,
      issue: hasValue(vehicle.condition) || hasValue(vehicle.overallCondition) || hasValue(output.conditionNote) ? null : fieldIssue("overallCondition", "Add honest condition notes and known imperfections.", 2, "medium"),
    },
  ], issues);

  if (implausibleYear) {
    issues.push(makeIssue("risk", "implausible_year", "Vehicle year needs review", "The year looks outside a normal VIN-supported range. Confirm before publishing.", 3, "medium"));
  }

  const titleTerms = vehicleNameTerms(vehicle);
  const titleMatchRatio = titleTerms.length ? countMatches(titleText, titleTerms) / titleTerms.length : 0;
  const bodyCoreTerms = [vehicle.make, vehicle.model, vehicle.trim].filter(hasValue).map(String);
  const seoMetaLength = output.seoMetaDescription?.trim().length || 0;
  const duplicatedSections = new Set([
    normalizeText(output.facebookListing),
    normalizeText(output.craigslistListing),
    normalizeText(output.websiteDescription),
    normalizeText(output.autoTraderStyleDescription),
  ].filter(Boolean)).size;
  const generatedSections = [output.facebookListing, output.craigslistListing, output.websiteDescription, output.autoTraderStyleDescription].filter((section) => wordCount(section || "") > 20).length;
  const genericCount = countMatches(allOutput, GENERIC_PHRASES);

  const seo = scoreCategory(20, [
    {
      points: titleMatchRatio >= 1 ? 5 : titleMatchRatio >= 0.75 ? 4 : titleMatchRatio >= 0.5 ? 2.5 : 0,
      issue: titleMatchRatio >= 0.75 ? null : makeIssue("fix", "seo_title", "Strengthen SEO title", "Use year, make, model, and trim in the title when verified.", 3, "medium"),
    },
    {
      points: bodyCoreTerms.length ? countMatches(allOutput, bodyCoreTerms) / bodyCoreTerms.length * 4 : 0,
      issue: bodyCoreTerms.length && countMatches(allOutput, bodyCoreTerms) >= Math.min(2, bodyCoreTerms.length) ? null : makeIssue("fix", "seo_keywords", "Core search terms are thin", "Repeat important vehicle terms naturally in the body copy.", 3, "medium"),
    },
    {
      points: clamp(countMatches(featureText, FEATURE_KEYWORDS) / 4 * 4, 0, 4),
      issue: countMatches(featureText, FEATURE_KEYWORDS) >= 2 ? null : makeIssue("fix", "feature_keywords", "Feature keywords missing", "Call out searchable features like camera, CarPlay, leather, AWD, safety tech, or third row when verified.", 2, "low"),
    },
    {
      points: seoMetaLength >= 120 && seoMetaLength <= 160 ? 3 : seoMetaLength >= 90 && seoMetaLength <= 175 ? 2.2 : seoMetaLength > 0 ? 1 : 0,
      issue: seoMetaLength >= 90 && seoMetaLength <= 175 ? null : makeIssue("fix", "meta_length", "SEO meta needs tuning", "Keep the meta description specific and near search-result length.", 1.6, "low"),
    },
    {
      points: genericCount === 0 && wordCount(allOutput) >= 140 ? 2 : genericCount <= 1 ? 1 : 0,
      issue: genericCount <= 1 && wordCount(allOutput) >= 100 ? null : makeIssue("fix", "generic_copy", "Copy feels generic", "Replace filler phrases with specific facts, equipment, condition, and buyer benefits.", 2.4, "medium"),
    },
    {
      points: generatedSections >= 3 && duplicatedSections >= Math.min(3, generatedSections) ? 2 : generatedSections >= 2 ? 1 : 0,
      issue: generatedSections >= 3 && duplicatedSections >= 3 ? null : makeIssue("fix", "duplicate_copy", "Channel copy is too similar", "Create distinct copy for marketplace, website, and classified formats.", 1.8, "low"),
    },
  ], issues);

  const readabilityScore = getReadabilityScore(allOutput);
  const benefitMatches = countMatches(allOutput, BUYER_BENEFIT_TERMS);
  const trustMatches = countMatches(allOutput, TRUST_TERMS);
  const ctaMatches = countMatches(allOutput, CTA_TERMS);
  const conditionOrObjectionHandled = textIncludes(allOutput, ["condition", "wear", "scratch", "dent", "as-is", "inspection", "history", "title", "accident"]) || hasValue(vehicle.overallCondition) || hasValue(vehicle.accidentHistory) || hasValue(vehicle.titleStatus);

  const conversion = scoreCategory(20, [
    {
      points: wordCount(output.title || output.shortTitle || "") >= 5 && titleMatchRatio >= 0.5 ? 3 : 1,
      issue: wordCount(output.title || output.shortTitle || "") >= 5 ? null : makeIssue("fix", "headline", "Headline is too thin", "Create a clearer buyer-facing headline with the vehicle and primary angle.", 2, "medium"),
    },
    {
      points: clamp(benefitMatches / 4 * 4, 0, 4),
      issue: benefitMatches >= 2 || hasValue(output.salesAngle) ? null : makeIssue("fix", "buyer_benefits", "Buyer benefits missing", "Translate specs into why the vehicle fits a shopper's life or job.", 3, "medium"),
    },
    {
      points: readabilityScore,
      issue: readabilityScore >= 3 ? null : makeIssue("fix", "readability", "Improve scanability", "Use shorter sections, bullets, and less dense wording.", 2, "low"),
    },
    {
      points: clamp(trustMatches / 3 * 4, 0, 4),
      issue: trustMatches >= 2 ? null : makeIssue("fix", "trust_signals", "Trust signals missing", "Add verified history, inspection, warranty, title, or service notes when available.", 3, "medium"),
    },
    {
      points: ctaMatches >= 2 ? 3 : ctaMatches === 1 ? 2 : 0,
      issue: ctaMatches > 0 ? null : makeIssue("fix", "cta", "Call to action missing", "Tell shoppers exactly what to do next.", 3, "high"),
    },
    {
      points: conditionOrObjectionHandled ? 2 : 0,
      issue: conditionOrObjectionHandled ? null : makeIssue("fix", "objections", "Condition context missing", "Address condition, title, history, or inspection context instead of sounding generic.", 2, "medium"),
    },
  ], issues);

  const facebookScore = channelReadiness(output.facebookListing || "", "facebook", vehicle);
  const craigslistScore = channelReadiness(output.craigslistListing || "", "craigslist", vehicle);
  const websiteScore = channelReadiness(output.websiteDescription || "", "website", vehicle);
  const autoTraderScore = channelReadiness(output.autoTraderStyleDescription || output.carGurusListing || "", "autotrader", vehicle);
  const seoAssetsScore = output.seoTitle && output.seoMetaDescription ? 3.5 : output.seoTitle || output.seoMetaDescription ? 1.75 : 0;
  const platform = scoreCategory(15, [
    {
      points: facebookScore,
      issue: facebookScore >= 2.6 ? null : makeIssue("fix", "facebook_copy", "Facebook copy incomplete", "Create concise marketplace copy with price, mileage, highlights, and CTA.", 2.2, "medium"),
    },
    {
      points: craigslistScore,
      issue: craigslistScore >= 1.8 ? null : makeIssue("fix", "craigslist_copy", "Craigslist copy incomplete", "Add standalone classified copy with scannable details.", 1.4, "low"),
    },
    {
      points: websiteScore,
      issue: websiteScore >= 2.6 ? null : makeIssue("fix", "website_copy", "Website description light", "Add richer website description copy with benefits and trust signals.", 2.2, "medium"),
    },
    {
      points: autoTraderScore,
      issue: autoTraderScore >= 1.4 ? null : makeIssue("fix", "autotrader_copy", "Syndication copy needs work", "Add concise third-party marketplace copy that does not rely on website formatting.", 1.2, "low"),
    },
    {
      points: seoAssetsScore,
      issue: seoAssetsScore >= 3.5 ? null : makeIssue("fix", "seo_assets", "SEO assets missing", "Add both SEO title and meta description.", 2.4, "medium"),
    },
  ], issues);

  const riskAudit = output.claimRiskAudit;
  const riskClaims = riskAudit?.riskClaims || [];
  riskClaims.forEach((claim) => {
    issues.push(makeIssue(
      "risk",
      `claim_${claim.claim.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      claim.claim,
      claim.recommendation || claim.reason,
      claim.severity === "high" ? 5 : claim.severity === "medium" ? 3 : 1.5,
      claim.severity === "high" ? "high" : claim.severity === "medium" ? "medium" : "low",
    ));
  });
  (riskAudit?.missingDetails || []).forEach((detail, index) => {
    issues.push(makeIssue("missing", `risk_missing_${index}`, detail, "Add supporting detail before using sensitive claims.", 1.4, "medium"));
  });
  if (countMatches(allOutput, UNSAFE_ABSOLUTES) > riskClaims.length) {
    issues.push(makeIssue("risk", "absolute_language", "Absolute claim language detected", "Review absolute phrases like perfect, guaranteed, accident-free, clean title, or one-owner before publishing.", 3.5, "medium"));
  }

  const complianceRaw = clamp(20 - riskPenalty(riskClaims, riskAudit?.missingDetails || [], allOutput), 0, 20);
  const complianceScore = clampScore((complianceRaw / 20) * 100);
  const photoItems = photoChecklist(vehicle, imageCount);
  const photoCompletion = photoItems.filter((item) => item.complete).length / PHOTO_REQUIREMENTS.length;
  if (photoCompletion < 0.5) {
    issues.push(makeIssue("fix", "photos", "Photo set incomplete", "Add front, rear, interior, odometer, tire, and cargo/trunk photos.", 3.5, "high"));
  } else if (photoCompletion < 0.84) {
    issues.push(makeIssue("fix", "photo_depth", "Photo set needs depth", "Round out the missing photo angles before promoting this listing.", 1.8, "medium"));
  }

  const severeRiskCount = riskClaims.filter((claim) => claim.severity === "high").length;
  const complianceGate = severeRiskCount > 0 ? 0.82 : complianceScore < 60 ? 0.9 : 1;
  const qualityRaw = completeness.raw + seo.raw + conversion.raw + platform.raw + complianceRaw;
  const listingScore = clampScore(qualityRaw * complianceGate);
  const stalePenalty = Math.min(Math.max(daysListed - 14, 0) * 0.32, 12);
  const merchandisingConfidence = clamp((completeness.score * 0.45 + complianceScore * 0.35 + photoCompletion * 100 * 0.2) / 100, 0.55, 1);
  const leadPotentialScore = clampScore((
    conversion.score * 0.36 +
    completeness.score * 0.18 +
    platform.score * 0.18 +
    complianceScore * 0.12 +
    photoCompletion * 100 * 0.16
  ) * merchandisingConfidence - stalePenalty);
  const searchVisibilityScore = clampScore(
    seo.score * 0.46 +
    completeness.score * 0.28 +
    platform.score * 0.18 +
    (featureCount >= 5 ? 8 : featureCount >= 3 ? 4 : 0) -
    Math.min(genericCount * 2, 8),
  );

  const result: ListingPerformanceScore = {
    listingScore,
    completenessScore: completeness.score,
    seoScore: seo.score,
    conversionScore: conversion.score,
    platformScore: platform.score,
    complianceScore,
    leadPotentialScore,
    searchVisibilityScore,
    missingFields: dedupeIssues(issues, "missing"),
    riskFlags: dedupeIssues(issues, "risk"),
    suggestedFixes: dedupeIssues(issues, "fix"),
    photoChecklist: photoItems,
    recommendedAction: "Ready to publish or syndicate",
  };
  return { ...result, recommendedAction: recommendedAction(result) };
}

export function scoreSavedListing(listing: SavedListing, imageCount = 0): ListingPerformanceScore {
  const daysListed = getListingDaysListed(listing);
  return scoreListingPerformance(listing.input_data || {}, listing.generated_output, imageCount, daysListed);
}

export function getListingDaysListed(listing: Pick<SavedListing, "created_at" | "days_listed">) {
  if (typeof listing.days_listed === "number") return listing.days_listed;
  const createdAt = listing.created_at ? new Date(listing.created_at).getTime() : Date.now();
  return Math.max(0, Math.floor((Date.now() - createdAt) / 86_400_000));
}

export function riskLevelFromScore(score: number, audit?: ClaimRiskAudit): RiskLevel {
  if (audit?.riskLevel) return audit.riskLevel;
  if (score < 65) return "high";
  if (score < 82) return "medium";
  return "low";
}
