import type { SupabaseClient } from "@supabase/supabase-js";
import type { Dealership, DealershipMember, DealershipRole, Profile } from "@/types/dealership";

export const ROLE_PERMISSIONS = {
  owner: [
    "manage_settings",
    "invite_users",
    "approve_join_requests",
    "edit_style",
    "generate",
    "save_listings",
    "delete_listings",
    "approve_listings",
    "toggle_billing",
  ],
  admin: [
    "invite_users",
    "approve_join_requests",
    "edit_style",
    "generate",
    "save_listings",
    "delete_listings",
    "approve_listings",
  ],
  manager: ["generate", "save_listings", "edit_listings", "view_style", "approve_listings"],
  staff: ["generate", "save_listings", "view_library"],
} as const;

export type Permission = (typeof ROLE_PERMISSIONS)[DealershipRole][number];

export function hasPermission(role: DealershipRole | null | undefined, permission: Permission) {
  if (!role) return false;
  return (ROLE_PERMISSIONS[role] as readonly string[]).includes(permission);
}

export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<Profile>();

  if (error) throw error;
  return data;
}

export async function getDealershipContext(
  supabase: SupabaseClient,
  userId: string,
  requestedDealershipId?: string,
) {
  const profile = await getProfile(supabase, userId);
  const dealershipId = requestedDealershipId || profile?.active_dealership_id;

  if (!dealershipId) {
    return { profile, dealership: null, member: null };
  }

  const { data: member, error: memberError } = await supabase
    .from("dealership_members")
    .select("*")
    .eq("dealership_id", dealershipId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle<DealershipMember>();

  if (memberError) throw memberError;

  if (!member) {
    return { profile, dealership: null, member: null };
  }

  const { data: dealership, error: dealershipError } = await supabase
    .from("dealerships")
    .select("*")
    .eq("id", dealershipId)
    .maybeSingle<Dealership>();

  if (dealershipError) throw dealershipError;
  return { profile, dealership, member };
}

export function requireRole(member: DealershipMember | null, roles: DealershipRole[]) {
  return Boolean(member && roles.includes(member.role));
}
