import { BarChart3, Clock, FileWarning, ShieldAlert, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isConfiguredAppAdmin } from "@/lib/admin";
import { getDealershipContext } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuditLog, FeatureEvent, SavedListing } from "@/types/listing";

export default async function AnalyticsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  if (!isConfiguredAppAdmin(user.email)) {
    return (
      <main className="p-6">
        <Card className="app-card max-w-xl">
          <CardHeader>
            <CardTitle>Analytics is admin-only</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Dealership analytics and audit tracking are only visible to configured MeadeMark Labs admins.
          </CardContent>
        </Card>
      </main>
    );
  }

  const { dealership } = await getDealershipContext(supabase, user.id);
  if (!dealership) return null;

  const [{ data: listings }, { data: events }, { data: audits }, { data: batches }] = await Promise.all([
    supabase.from("listings").select("*").eq("dealership_id", dealership.id).order("created_at", { ascending: false }),
    supabase.from("feature_events").select("*").eq("dealership_id", dealership.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("audit_logs").select("*").eq("dealership_id", dealership.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("bulk_inventory_batches").select("*").eq("dealership_id", dealership.id).order("created_at", { ascending: false }).limit(10),
  ]);

  const savedListings = (listings || []) as SavedListing[];
  const featureEvents = (events || []) as FeatureEvent[];
  const auditLogs = (audits || []) as AuditLog[];
  const highRisk = savedListings.filter((listing) => listing.risk_level === "high").length;
  const pendingReview = savedListings.filter((listing) => listing.status === "pending_review" || listing.approval_status === "pending_review").length;

  return (
    <main className="space-y-6 p-6">
      <section className="rounded-[2rem] border border-white/12 bg-[#0F1218]/95 p-6">
        <Badge className="mb-4 border-red-500/30 bg-red-500/10 text-red-100">Operational visibility</Badge>
        <h1 className="font-display text-4xl">Analytics</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Track dealership feature usage, approval flow, claim risk, and staff activity without turning this into a heavy analytics suite.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        {([
          ["Saved listings", savedListings.length, BarChart3],
          ["Pending review", pendingReview, Clock],
          ["High-risk listings", highRisk, ShieldAlert],
          ["Bulk batches", batches?.length || 0, FileWarning],
        ] as Array<[string, number, LucideIcon]>).map(([label, value, Icon]) => (
          <Card key={String(label)} className="app-card rounded-2xl border-white/10">
            <CardContent className="p-5">
              <Icon className="mb-4 h-5 w-5 text-primary" />
              <div className="text-2xl font-semibold">{String(value)}</div>
              <div className="mt-1 text-sm text-muted-foreground">{String(label)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="app-card rounded-2xl border-white/10">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Feature events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {featureEvents.map((event) => (
              <div key={event.id} className="rounded-lg border border-white/10 bg-white/[.035] p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{event.feature} · {event.action}</span>
                  <span className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{event.route || "No route captured"}</p>
              </div>
            ))}
            {!featureEvents.length && <p className="text-sm text-muted-foreground">No feature events yet.</p>}
          </CardContent>
        </Card>

        <Card className="app-card rounded-2xl border-white/10">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Audit history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="rounded-lg border border-white/10 bg-white/[.035] p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{log.entity_type} · {log.action}</span>
                  <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{log.entity_id || "System event"}</p>
              </div>
            ))}
            {!auditLogs.length && <p className="text-sm text-muted-foreground">No audit events yet.</p>}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
