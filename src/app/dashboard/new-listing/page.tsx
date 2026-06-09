import Link from "next/link";
import { Palette } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { ListingGenerator } from "@/components/listing-generator/listing-generator";
import { Button } from "@/components/ui/button";
import { getDealershipContext } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function NewListingPage({
  searchParams,
}: {
  searchParams?: Promise<{ vin?: string; draft?: string }>;
}) {
  const params = await searchParams;
  const initialVin = params?.vin?.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "").slice(0, 17) || "";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { dealership, profile } = await getDealershipContext(supabase, user.id);
  const { data: initialDraft } = dealership && params?.draft
    ? await supabase
        .from("vehicle_drafts")
        .select("*")
        .eq("id", params.draft)
        .eq("dealership_id", dealership.id)
        .maybeSingle()
    : { data: null };

  return (
    <main className="p-3 md:p-5">
      {dealership ? (
        <ListingGenerator
          dealershipId={dealership.id}
          initialVin={initialVin}
          listingDefaults={dealership.listing_defaults || {}}
          autoOpenFillIn={profile?.feature_settings?.autoOpenFillIn !== false}
          fillInIntroSeen={Boolean(profile?.feature_settings?.fillInIntroSeen)}
          initialDraft={initialDraft}
        />
      ) : (
        <EmptyState
          icon={Palette}
          title="Set up a dealership workspace first"
          description="Listing generation is tied to a dealership workspace for shared usage limits and style profile."
          action={<Button asChild className="bg-primary hover:bg-red-700"><Link href="/onboarding">Open onboarding</Link></Button>}
        />
      )}
    </main>
  );
}
