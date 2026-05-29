export type NhtsaRecall = {
  manufacturer?: string;
  campaignNumber?: string;
  component?: string;
  summary?: string;
  consequence?: string;
  remedy?: string;
  reportReceivedDate?: string;
};

export type NcapVehicleRating = {
  vehicleId?: number;
  vehicleDescription?: string;
  overallRating?: string;
  frontalCrashRating?: string;
  sideCrashRating?: string;
  rolloverRating?: string;
};

export type VehicleIntelligenceSummary = {
  summary: string;
  safetySummary: string;
  recallSummary: string;
  valueNotes: string;
  strengths: string[];
  cautions: string[];
  listingAngles: string[];
  validationWarnings: string[];
};

export type VehicleIntelligence = {
  modelKey: string;
  year: string;
  make: string;
  model: string;
  trim?: string;
  fromCache: boolean;
  intelligenceScore: number;
  safety: {
    source: "NHTSA NCAP";
    ratings: NcapVehicleRating[];
    bestOverallRating?: string;
    fetchedAt: string;
  };
  recalls: {
    source: "NHTSA Recalls";
    count: number;
    items: NhtsaRecall[];
    fetchedAt: string;
  };
  aiSummary: VehicleIntelligenceSummary;
  sources: Array<{ label: string; url: string }>;
  refreshedAt: string;
};
