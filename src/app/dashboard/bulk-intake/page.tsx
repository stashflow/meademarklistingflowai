import Link from "next/link";
import { FileSpreadsheet } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { BulkInventoryIntake } from "@/components/listing-generator/bulk-inventory-intake";
import { Button } from "@/components/ui/button";
import { getDealershipContext } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function BulkIntakePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { dealership } = await getDealershipContext(supabase, user.id);

  return dealership ? (
    <BulkInventoryIntake dealershipId={dealership.id} />
  ) : (
    <main className="p-6">
      <EmptyState
        icon={FileSpreadsheet}
        title="Set up a dealership workspace first"
        description="Bulk intake batches belong to a dealership workspace so the team can share them."
        action={<Button asChild className="bg-primary hover:bg-red-700"><Link href="/onboarding">Open onboarding</Link></Button>}
      />
    </main>
  );
}
