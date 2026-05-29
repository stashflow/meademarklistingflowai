import { BillingPanel } from "@/components/billing/billing-panel";
import { getDealershipContext } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function BillingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { dealership, member } = await getDealershipContext(supabase, user.id);
  if (!dealership) return <main className="p-6 text-sm text-muted-foreground">Set up a dealership first.</main>;

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold">Billing</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Demo billing mode. No real payment is processed.
        </p>
      </div>
      <BillingPanel dealership={dealership} canToggle={member?.role === "owner"} />
    </main>
  );
}
