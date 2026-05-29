import type { SupabaseClient } from "@supabase/supabase-js";

type JsonRecord = Record<string, unknown>;

export async function trackFeatureEvent(
  supabase: SupabaseClient,
  input: {
    dealershipId?: string | null;
    userId?: string | null;
    feature: string;
    action: string;
    route?: string;
    metadata?: JsonRecord;
  },
) {
  try {
    await supabase.from("feature_events").insert({
      dealership_id: input.dealershipId || null,
      user_id: input.userId || null,
      feature: input.feature,
      action: input.action,
      route: input.route || null,
      metadata: input.metadata || {},
    });
  } catch {
    // Telemetry should never block dealership work.
  }
}

export async function writeAuditLog(
  supabase: SupabaseClient,
  input: {
    dealershipId?: string | null;
    actorUserId?: string | null;
    entityType: string;
    entityId?: string | null;
    action: string;
    beforeData?: JsonRecord | null;
    afterData?: JsonRecord | null;
    metadata?: JsonRecord;
  },
) {
  try {
    await supabase.from("audit_logs").insert({
      dealership_id: input.dealershipId || null,
      actor_user_id: input.actorUserId || null,
      entity_type: input.entityType,
      entity_id: input.entityId || null,
      action: input.action,
      before_data: input.beforeData || null,
      after_data: input.afterData || null,
      metadata: input.metadata || {},
    });
  } catch {
    // Audit writes are best-effort when the migration has not been applied yet.
  }
}
