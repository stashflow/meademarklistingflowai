import { SettingsManager } from "@/components/settings/settings-manager";
import { getDealershipContext, getProfile, requireRole } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DealershipStyleProfile } from "@/types/style-profile";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { dealership, member } = await getDealershipContext(supabase, user.id);
  const profile = await getProfile(supabase, user.id);
  const { data: styleProfile } = dealership
    ? await supabase.from("dealership_style_profiles").select("*").eq("dealership_id", dealership.id).maybeSingle()
    : { data: null };

  return (
    <main className="p-6">
      <SettingsManager
        profile={profile}
        dealership={dealership}
        styleProfile={styleProfile as DealershipStyleProfile | null}
        canManageDealership={requireRole(member, ["owner", "admin"])}
      />
    </main>
  );
}
