import Link from "next/link";
import { ShieldCheck, Users, Warehouse, Zap, type LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isConfiguredAppAdmin } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function FounderAdminPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isConfiguredAppAdmin(user?.email)) {
    return (
      <main className="p-6">
        <EmptyState
          icon={ShieldCheck}
          title="Founder admin access required"
          description="Add your email to LISTINGFLOW_ADMIN_EMAILS to unlock global admin visibility."
          action={<Button asChild className="bg-primary hover:bg-red-700"><Link href="/dashboard">Back to dashboard</Link></Button>}
        />
      </main>
    );
  }

  const admin = getSupabaseAdminClient();
  const [{ count: dealershipCount }, { count: profileCount }, { data: events }, { data: dealerships }] = await Promise.all([
    admin.from("dealerships").select("*", { count: "exact", head: true }),
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("feature_events").select("*").order("created_at", { ascending: false }).limit(25),
    admin.from("dealerships").select("*").order("created_at", { ascending: false }).limit(10),
  ]);

  return (
    <main className="space-y-6 p-6">
      <section className="rounded-[2rem] border border-white/12 bg-[#0F1218]/95 p-6">
        <Badge className="mb-4 border-red-500/30 bg-red-500/10 text-red-100">MeadeMark Labs admin</Badge>
        <h1 className="font-display text-4xl">Founder admin</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Global product visibility for dealerships, profiles, and feature usage. This is gated by server-only admin email configuration.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {([
          ["Dealerships", dealershipCount || 0, Warehouse],
          ["Profiles", profileCount || 0, Users],
          ["Recent events", events?.length || 0, Zap],
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
            <CardTitle className="font-display text-2xl">Recent dealerships</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(dealerships || []).map((dealership) => (
              <div key={dealership.id} className="rounded-lg border border-white/10 bg-white/[.035] p-3 text-sm">
                <div className="font-medium">{dealership.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {dealership.subscription_status} · {new Date(dealership.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="app-card rounded-2xl border-white/10">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Global feature events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(events || []).map((event) => (
              <div key={event.id} className="rounded-lg border border-white/10 bg-white/[.035] p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{event.feature} · {event.action}</span>
                  <span className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{event.route || "No route captured"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
