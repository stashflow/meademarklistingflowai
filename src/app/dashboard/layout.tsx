import { AppSidebar } from "@/components/layout/app-sidebar";
import { CommandPalette } from "@/components/layout/command-palette";
import { FeatureTracker } from "@/components/layout/feature-tracker";
import { Topbar } from "@/components/layout/topbar";
import { isConfiguredAppAdmin } from "@/lib/admin";
import { getDealershipContext } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let dealershipName: string | null = null;
  let userEmail: string | null = null;
  let isAdmin = false;

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
    }
  } catch {
    dealershipName = null;
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar isAdmin={isAdmin} />
      <div className="min-w-0 flex-1">
        <Topbar dealershipName={dealershipName} userEmail={userEmail} isAdmin={isAdmin} />
        <CommandPalette isAdmin={isAdmin} />
        <FeatureTracker />
        {children}
      </div>
    </div>
  );
}
