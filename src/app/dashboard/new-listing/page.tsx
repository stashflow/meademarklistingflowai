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
  searchParams?: Promise<{ vin?: string }>;
}) {
  const params = await searchParams;
  const initialVin = params?.vin?.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "").slice(0, 17) || "";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { dealership } = await getDealershipContext(supabase, user.id);

  return (
    <main className="p-6">
      {dealership ? (
        <ListingGenerator dealershipId={dealership.id} initialVin={initialVin} />
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
