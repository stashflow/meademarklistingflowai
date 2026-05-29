import { notFound } from "next/navigation";
import { ListingDetailEditor } from "@/components/listing-generator/listing-detail-editor";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ListingImage, SavedListing } from "@/types/listing";

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const { data: images } = await supabase
    .from("listing_images")
    .select("*")
    .eq("listing_id", id)
    .order("sort_order", { ascending: true });

  return (
    <main className="p-6">
      <ListingDetailEditor listing={data as SavedListing} images={(images || []) as ListingImage[]} />
    </main>
  );
}
