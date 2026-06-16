import { DashboardShell } from "@/components/layout/dashboard-shell";
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
    <DashboardShell
      dealershipName={dealershipName}
      userEmail={userEmail}
      isAdmin={isAdmin}
      role={role}
    >
      {children}
    </DashboardShell>
  );
}
