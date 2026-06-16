import { SavedListingsTable } from "@/components/listing-generator/saved-listings-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDealershipContext, hasPermission } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SavedListing } from "@/types/listing";

export default async function SavedListingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { dealership, member } = await getDealershipContext(supabase, user.id);

  const { data } = dealership
    ? await supabase
        .from("listings")
        .select("*")
        .eq("dealership_id", dealership.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <main className="p-6">
      <Card className="app-card">
        <CardHeader>
          <CardTitle>Inventory Audit</CardTitle>
          <p className="text-sm text-muted-foreground">
            Review saved vehicles by ListingFlow score, compliance risk, lead potential, search visibility, and missing optimization work.
          </p>
        </CardHeader>
        <CardContent>
          <SavedListingsTable
            listings={(data || []) as SavedListing[]}
            canDelete={hasPermission(member?.role, "delete_listings")}
          />
        </CardContent>
      </Card>
    </main>
  );
}
