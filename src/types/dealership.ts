export type DealershipRole = "owner" | "admin" | "manager" | "staff";

export type SubscriptionStatus =
  | "trial"
  | "starter_demo"
  | "pro_demo"
  | "unlimited_demo";

export type Profile = {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  onboarding_completed: boolean;
  active_dealership_id: string | null;
  animation_preference: "none" | "simple" | "amaze";
  feature_settings: Record<string, boolean | string>;
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
  trial_generation_limit: number;
  subscription_status: SubscriptionStatus;
  fake_paid_mode: boolean;
  created_at: string;
  updated_at: string;
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
  trial: 35,
  starter_demo: 150,
  pro_demo: 500,
  unlimited_demo: "unlimited",
};

export const ROLE_LABELS: Record<DealershipRole, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
};
