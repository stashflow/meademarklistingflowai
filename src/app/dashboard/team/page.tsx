import { TeamManager } from "@/components/team/team-manager";
import { getDealershipContext, requireRole } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DealershipMember, JoinRequest } from "@/types/dealership";

export default async function TeamPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { dealership, member } = await getDealershipContext(supabase, user.id);
  if (!dealership) return <main className="p-6 text-sm text-muted-foreground">Set up a dealership first.</main>;

  const [{ data: members }, { data: requests }] = await Promise.all([
    supabase
      .from("dealership_members")
      .select("*, profiles(full_name,email)")
      .eq("dealership_id", dealership.id)
      .eq("status", "active"),
    supabase
      .from("join_requests")
      .select("*, profiles(full_name,email)")
      .eq("dealership_id", dealership.id)
      .eq("status", "pending"),
  ]);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold">Team</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Invite team members, review join requests, and keep dealership access controlled.
        </p>
      </div>
      <TeamManager
        dealershipId={dealership.id}
        members={(members || []) as DealershipMember[]}
        joinRequests={(requests || []) as JoinRequest[]}
        canManage={requireRole(member, ["owner", "admin"])}
      />
    </main>
  );
}
