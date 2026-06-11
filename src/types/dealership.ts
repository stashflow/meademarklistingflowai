export type DealershipRole = "owner" | "admin" | "manager" | "staff";

export type SubscriptionStatus =
  | "trial"
  | "starter"
  | "pro"
  | "dealer_group"
  | "past_due"
  | "canceled";

export type Profile = {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  onboarding_completed: boolean;
  active_dealership_id: string | null;
  animation_preference: "none" | "simple" | "amaze";
  feature_settings: {
    qualityScore?: boolean;
    desktopNotifications?: boolean;
    fastDraftMode?: boolean;
    autoCopyLastOutput?: boolean;
    vinDataProvider?: string;
    autoOpenFillIn?: boolean;
    fillInIntroSeen?: boolean;
    workspaceMode?: "compact" | "manager";
    [key: string]: boolean | string | undefined;
  };
  created_at: string;
  updated_at: string;
};

export type Dealership = {
  id: string;
  name: string;
  website: string | null;
  phone: string | null;
  location: string | null;
  monthly_vehicle_volume: string | null;
  default_tone: string | null;
  default_cta: string | null;
  default_disclaimer: string | null;
  listing_defaults: ListingDefaults;
  trial_generation_limit: number;
  subscription_status: SubscriptionStatus;
  fake_paid_mode: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  stripe_current_period_end: string | null;
  trial_ends_at: string | null;
  billing_email: string | null;
  created_at: string;
  updated_at: string;
};

export type PlatformListingPreference = {
  tone: string;
  length: "short" | "standard" | "detailed";
};

export type ListingDefaults = {
  contactText?: string;
  defaultCTA?: string;
  financingLanguage?: string;
  warrantyLanguage?: string;
  platforms?: {
    facebook?: PlatformListingPreference;
    cargurus?: PlatformListingPreference;
    website?: PlatformListingPreference;
  };
};

export type DealershipMember = {
  id: string;
  dealership_id: string;
  user_id: string;
  role: DealershipRole;
  status: "active" | "pending" | "removed";
  created_at: string;
  profiles?: Pick<Profile, "full_name" | "email"> | null;
};

export type JoinRequest = {
  id: string;
  dealership_id: string;
  user_id: string;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  profiles?: Pick<Profile, "full_name" | "email"> | null;
};

export type PlanLimit = number | "unlimited";

export const PLAN_LIMITS: Record<SubscriptionStatus, PlanLimit> = {
  trial: 10,
  starter: 150,
  pro: 500,
  dealer_group: "unlimited",
  past_due: 0,
  canceled: 0,
};

export const ROLE_LABELS: Record<DealershipRole, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
};
