import { NextResponse } from "next/server";
import { getDealershipContext } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { trackFeatureEvent } from "@/lib/telemetry/audit";

const routeFeatureMap: Array<[string, string]> = [
  ["/dashboard/new-listing", "listing_generator"],
  ["/dashboard/bulk-intake", "bulk_inventory"],
  ["/dashboard/saved-listings", "listing_library"],
  ["/dashboard/style-library", "style_library"],
  ["/dashboard/team", "team_management"],
  ["/dashboard/settings", "settings"],
  ["/dashboard/billing", "billing_subscriptions"],
  ["/dashboard/analytics", "analytics"],
  ["/dashboard/admin", "founder_admin"],
];

function featureForRoute(route?: string) {
  return routeFeatureMap.find(([prefix]) => route?.startsWith(prefix))?.[1] || "dashboard";
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const route = typeof body.route === "string" ? body.route : "/dashboard";
    const { dealership } = await getDealershipContext(supabase, user.id);

    await trackFeatureEvent(supabase, {
      dealershipId: dealership?.id || null,
      userId: user.id,
      feature: featureForRoute(route),
      action: "view",
      route,
      metadata: { source: "dashboard_tracker" },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
