export type FormattingRules = {
  length?: string;
  bulletStyle?: string;
  emojiUsage?: string;
  capitalization?: string;
  paragraphStyle?: string;
};

export type PlatformPreferences = {
  facebook?: string;
  cargurus?: string;
  website?: string;
  craigslist?: string;
  autotrader?: string;
  seo?: string;
};

export type StyleProfileOutput = {
  voiceSummary: string;
  formattingRules: FormattingRules;
  preferredPhrases: string[];
  bannedPhrases: string[];
  defaultCTA: string;
  defaultDisclaimer: string;
  platformPreferences: PlatformPreferences;
  commonSellingAngles: string[];
  aiStyleSummary: string;
};

export type DealershipStyleProfile = {
  id: string;
  dealership_id: string;
  voice_summary: string | null;
  formatting_rules: FormattingRules | null;
  preferred_phrases: string[] | null;
  banned_phrases: string[] | null;
  default_cta: string | null;
  default_disclaimer: string | null;
  platform_preferences: PlatformPreferences | null;
  example_listings: unknown[] | null;
  ai_style_summary: string | null;
  created_at: string;
  updated_at: string;
};
