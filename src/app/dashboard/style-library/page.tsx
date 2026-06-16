import { StyleLibraryManager } from "@/components/style-profile/style-library-manager";
import { getDealershipContext } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DealershipStyleProfile } from "@/types/style-profile";

export default async function StyleLibraryPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { dealership, member } = await getDealershipContext(supabase, user.id);
  if (!dealership) return <main className="p-6 text-sm text-muted-foreground">Set up a dealership first.</main>;

  const [{ data: profile }, { data: examples }] = await Promise.all([
    supabase.from("dealership_style_profiles").select("*").eq("dealership_id", dealership.id).maybeSingle(),
    supabase.from("style_examples").select("*").eq("dealership_id", dealership.id).order("created_at", { ascending: false }),
  ]);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold">Style Library</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add old listings, writing notes, banned phrases, preferred CTAs, and re-analyze the dealership style profile.
        </p>
      </div>
      <StyleLibraryManager
        dealershipId={dealership.id}
        profile={profile as DealershipStyleProfile | null}
        examples={(examples || []) as never}
        canEdit={Boolean(member && ["owner", "admin"].includes(member.role))}
      />
    </main>
  );
}
