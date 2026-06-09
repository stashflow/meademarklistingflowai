import { AppSidebar } from "@/components/layout/app-sidebar";
import { CommandPalette } from "@/components/layout/command-palette";
import { FeatureTracker } from "@/components/layout/feature-tracker";
import { Topbar } from "@/components/layout/topbar";
import { isConfiguredAppAdmin } from "@/lib/admin";
import { getDealershipContext } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DealershipRole } from "@/types/dealership";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let dealershipName: string | null = null;
  let userEmail: string | null = null;
  let isAdmin = false;
  let role: DealershipRole | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email || null;
    isAdmin = isConfiguredAppAdmin(userEmail);
    if (user) {
      const context = await getDealershipContext(supabase, user.id);
      dealershipName = context.dealership?.name || null;
      role = context.member?.role || null;
    }
  } catch {
    dealershipName = null;
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar isAdmin={isAdmin} role={role} />
      <div className="min-w-0 flex-1">
        <Topbar dealershipName={dealershipName} userEmail={userEmail} isAdmin={isAdmin} role={role} />
        <CommandPalette isAdmin={isAdmin} />
        <FeatureTracker />
        {children}
      </div>
    </div>
  );
}
