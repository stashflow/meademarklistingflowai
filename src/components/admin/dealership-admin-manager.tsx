"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type DealershipItem = {
  id: string;
  name: string;
  subscription_status: string;
  created_at: string;
  creator_email?: string | null;
};

export function DealershipAdminManager({ dealerships }: { dealerships: DealershipItem[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function deleteDealership(dealership: DealershipItem) {
    if (!window.confirm(`Delete ${dealership.name}? This removes the dealership and all related records.`)) {
      return;
    }

    setPendingId(dealership.id);
    setMessage("");
    const response = await fetch(`/api/admin/dealerships/${dealership.id}`, {
      method: "DELETE",
    });
    const payload = await response.json().catch(() => ({}));
    setPendingId(null);
    if (!response.ok) {
      setMessage(payload.message || "Could not delete dealership.");
      return;
    }
    setMessage(`Deleted ${dealership.name}.`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {message && <div className="rounded-md border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">{message}</div>}
      <div className="grid gap-4 xl:grid-cols-2">
        {dealerships.map((dealership) => (
          <Card key={dealership.id} className="border-white/10 bg-white/[.035]">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium">{dealership.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{dealership.subscription_status}</div>
                </div>
                <Button
                  variant="outline"
                  className="border-red-500/30 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                  onClick={() => deleteDealership(dealership)}
                  disabled={pendingId === dealership.id}
                >
                  {pendingId === dealership.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                <div>Creator: {dealership.creator_email || "Unknown"}</div>
                <div>Created: {new Date(dealership.created_at).toLocaleString()}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
