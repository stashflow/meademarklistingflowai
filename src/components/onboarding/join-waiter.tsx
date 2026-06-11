"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock3 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function JoinWaiter({ dealershipId }: { dealershipId: string | null }) {
  const router = useRouter();

  useEffect(() => {
    if (!dealershipId) return;

    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    const poll = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: profile }, { data: request }] = await Promise.all([
        supabase.from("profiles").select("active_dealership_id").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("join_requests")
          .select("status")
          .eq("user_id", user.id)
          .eq("dealership_id", dealershipId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      if (profile?.active_dealership_id === dealershipId || request?.status === "approved") {
        router.push("/dashboard");
      }
    };

    poll();
    const interval = window.setInterval(poll, 6000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [dealershipId, router]);

  return (
    <div className="flex items-center gap-3 rounded-md border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
      <Clock3 className="h-4 w-4 shrink-0" />
      We’re checking for approval automatically. Leave this tab open and we’ll move you into the dealership as soon as it’s approved.
    </div>
  );
}
