export type ListingStatus =
  | "draft"
  | "pending_review"
  | "changes_requested"
  | "reviewed"
  | "approved"
  | "published"
  | "archived";

export type RiskLevel = "low" | "medium" | "high" | "unknown";

export type ClaimRisk = {
  claim: string;
  reason: string;
  severity: RiskLevel;
  recommendation: string;
};

export type ClaimRiskAudit = {
  score: number;
  riskLevel: RiskLevel;
  missingDetails: string[];
  riskClaims: ClaimRisk[];
  recommendations: string[];
};

export type ListingPerformanceIssue = {
  id: string;
  label: string;
  detail: string;
  priority: "high" | "medium" | "low";
};

export type PhotoChecklistItem = {
  id: string;
  label: string;
  complete: boolean;
  detail: string;
};

export type FeatureConfidence = "confirmed" | "likely" | "unsure" | "ask_user";

export type FeatureHighlight = {
  label: string;
  status: FeatureConfidence;
  source: string;
  reason: string;
  question?: string;
};

export type ListingPlatform = "facebook" | "cargurus" | "website";

export type PlatformCopyBlocks = {
  title: string;
  price: string;
  description: string;
  features: string[];
  condition: string;
  cta: string;
  disclaimer: string;
};

export type VehicleDraft = {
  id: string;
  dealership_id: string;
  created_by: string;
  last_edited_by: string | null;
  listing_id: string | null;
  batch_item_id: string | null;
  input_data: VehicleInput;
  preferences: GenerationPreferences;
  generated_output: ListingOutput | null;
  current_step: "facts" | "fill_in" | "copy";
  active_platform: ListingPlatform;
  status: "draft" | "ready" | "generated" | "published" | "archived";
  title: string | null;
  vin: string | null;
  stock_number: string | null;
  year: string | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  exterior_color: string | null;
  autosave_version: number;
  last_generated_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DraftSourceConflict = {
  field: keyof VehicleInput;
  existingValue: string;
  extractedValue: string;
  confidence: "low" | "medium" | "high";
  source: string;
};

export type TrimResearchSource = {
  label: string;
  url: string;
};

export type TrimCandidate = {
  name: string;
  confidence: "low" | "medium" | "high";
  indicators: string[];
  summary: string;
};

export type TrimSpecification = {
  trim: string;
  engine?: string;
  transmission?: string;
  drivetrain?: string;
  fuelType?: string;
  mpg?: string;
  features: string[];
  variableFields: string[];
};

export type TrimResearchQuestion = {
  id: string;
  label: string;
  helper: string;
  why: string;
  inputType: "choice" | "yes_no_unknown" | "text";
  options: Array<{
    label: string;
    supportsTrims: string[];
  }>;
};

export type TrimResearchResult = {
  researchKey: string;
  fromCache: boolean;
  candidates: TrimCandidate[];
  specifications: TrimSpecification[];
  questions: TrimResearchQuestion[];
  sources: TrimResearchSource[];
  confidence: "low" | "medium" | "high";
  warning: string;
};

export type VehicleInput = {
  vin?: string;
  vinDecoded?: string;
  vinDecodeSource?: string;
  vinDecodeWarnings?: string;
  vehicleIntelligenceSummary?: string;
  vehicleSafetySummary?: string;
  vehicleRecallSummary?: string;
  vehicleValueNotes?: string;
  vehicleIntelligenceScore?: string;
  vehicleIntelligenceSource?: string;
  vehicleIntelligenceCached?: string;
  vehicleIntelligenceWarnings?: string;
  validatedFeaturesJson?: string;
  featureClarificationQuestions?: string;
  year?: string;
  make?: string;
  model?: string;
  trim?: string;
  mileage?: string;
  price?: string;
  exteriorColor?: string;
  interiorColor?: string;
  drivetrain?: string;
  transmission?: string;
  engine?: string;
  fuelType?: string;
  mpg?: string;
  stockNumber?: string;
  vehicleType?: string;
  imageUrls?: string;
  photoNotes?: string;
  condition?: string;
  overallCondition?: string;
  accidentHistory?: string;
  titleStatus?: string;
  serviceHistory?: string;
  ownershipHistory?: string;
  tireCondition?: string;
  interiorCondition?: string;
  exteriorCondition?: string;
  keyFeatures?: string;
  recentMaintenance?: string;
  upgrades?: string;
  warrantyInfo?: string;
  financingInfo?: string;
  sellerNotes?: string;
};

export type GenerationPreferences = {
  platforms: string[];
  tone: string;
  length: "short" | "standard" | "detailed";
  useStyleProfile: boolean;
  customInstructions?: string;
  wordsToAvoid?: string;
  ctaOverride?: string;
};

export type ListingGenerationRequest = {
  dealershipId: string;
  vehicle: VehicleInput;
  preferences: GenerationPreferences;
};

export type ListingOutput = {
  title: string;
  shortTitle: string;
  facebookListing: string;
  carGurusListing: string;
  websiteDescription: string;
  craigslistListing: string;
  autoTraderStyleDescription: string;
  highlights: string[];
  features: string[];
  conditionNote: string;
  seoTitle: string;
  seoMetaDescription: string;
  salesAngle: string;
  disclaimer: string;
  reviewWarnings: string[];
  featureHighlights?: FeatureHighlight[];
  featureQuestions?: string[];
  claimRiskAudit?: ClaimRiskAudit;
  copyBlocks?: Partial<Record<ListingPlatform, PlatformCopyBlocks>>;
};

export type SavedListing = {
  id: string;
  dealership_id: string;
  created_by: string;
  vin: string | null;
  year: string | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  mileage: number | null;
  price: number | null;
  condition: string | null;
  input_data: VehicleInput;
  generated_output: ListingOutput;
  status: ListingStatus;
  approval_status?: ListingStatus;
  review_requested_by?: string | null;
  review_requested_at?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  quality_score?: number | null;
  risk_level?: RiskLevel | null;
  risk_summary?: ClaimRiskAudit | Record<string, unknown> | null;
  listing_score?: number | null;
  completeness_score?: number | null;
  seo_score?: number | null;
  conversion_score?: number | null;
  platform_score?: number | null;
  compliance_score?: number | null;
  lead_potential_score?: number | null;
  search_visibility_score?: number | null;
  missing_fields?: ListingPerformanceIssue[] | null;
  risk_flags?: ListingPerformanceIssue[] | null;
  suggested_fixes?: ListingPerformanceIssue[] | null;
  photo_checklist?: PhotoChecklistItem[] | null;
  days_listed?: number | null;
  last_optimized_at?: string | null;
  tags: string[] | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BulkInventoryBatch = {
  id: string;
  dealership_id: string;
  created_by: string;
  name: string;
  source: string;
  row_count: number;
  ready_count: number;
  issue_count: number;
  status: "draft" | "validated" | "in_progress" | "completed" | "archived";
  created_at: string;
  updated_at: string;
};

export type BulkInventoryItem = {
  id: string;
  batch_id: string;
  dealership_id: string;
  created_by: string;
  row_index: number;
  input_data: VehicleInput;
  status: "ready" | "needs_info" | "generated" | "skipped";
  validation_errors: string[];
  listing_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AuditLog = {
  id: string;
  dealership_id: string | null;
  actor_user_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type FeatureEvent = {
  id: string;
  dealership_id: string | null;
  user_id: string | null;
  feature: string;
  action: string;
  route: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ListingImage = {
  id: string;
  listing_id: string | null;
  dealership_id: string;
  created_by: string | null;
  image_url: string | null;
  storage_path: string | null;
  alt_text: string | null;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type InputQualityResult = {
  status: "valid" | "incomplete" | "contradictory" | "nonsense";
  issues: string[];
  userMessage: string;
  canGenerate: boolean;
};
