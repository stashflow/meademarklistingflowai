import { notFound } from "next/navigation";
import { BulkBatchWorkbench } from "@/components/listing-generator/bulk-batch-workbench";
import { getDealershipContext } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { BulkInventoryBatch, BulkInventoryItem, VehicleDraft } from "@/types/listing";

export default async function BulkBatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ after?: string }>;
}) {
  const { id } = await params;
  const { after } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: batch } = await supabase.from("bulk_inventory_batches").select("*").eq("id", id).maybeSingle();
  if (!batch) notFound();

  const { dealership } = await getDealershipContext(supabase, user.id, batch.dealership_id);
  if (!dealership) notFound();

  const { data: items } = await supabase
    .from("bulk_inventory_items")
    .select("*")
    .eq("batch_id", id)
    .order("row_index");
  const itemIds = (items || []).map((item) => item.id);
  const { data: drafts } = itemIds.length
    ? await supabase
        .from("vehicle_drafts")
        .select("*")
        .eq("dealership_id", dealership.id)
        .in("batch_item_id", itemIds)
    : { data: [] };

  return (
    <BulkBatchWorkbench
      batch={batch as BulkInventoryBatch}
      items={(items || []) as BulkInventoryItem[]}
      drafts={(drafts || []) as VehicleDraft[]}
      startAfterItemId={after}
    />
  );
}
