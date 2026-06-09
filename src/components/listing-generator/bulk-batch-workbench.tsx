"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  FileSpreadsheet,
  Loader2,
  Play,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { BulkInventoryBatch, BulkInventoryItem, VehicleDraft } from "@/types/listing";

type BulkBatchWorkbenchProps = {
  batch: BulkInventoryBatch;
  items: BulkInventoryItem[];
  drafts: VehicleDraft[];
  startAfterItemId?: string;
};

function vehicleName(item: BulkInventoryItem) {
  const vehicle = item.input_data;
  return [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ") || `Vehicle ${item.row_index}`;
}

export function BulkBatchWorkbench({
  batch,
  items,
  drafts,
  startAfterItemId,
}: BulkBatchWorkbenchProps) {
  const router = useRouter();
  const draftByItem = useMemo(
    () => new Map(drafts.filter((draft) => draft.batch_item_id).map((draft) => [draft.batch_item_id, draft])),
    [drafts],
  );
  const startingIndex = useMemo(() => {
    if (startAfterItemId) {
      const completedIndex = items.findIndex((item) => item.id === startAfterItemId);
      const nextUnresolved = items.findIndex((item, index) => index > completedIndex && item.status !== "generated");
      if (nextUnresolved >= 0) return nextUnresolved;
    }
    const firstUnresolved = items.findIndex((item) => item.status !== "generated");
    return firstUnresolved >= 0 ? firstUnresolved : 0;
  }, [items, startAfterItemId]);
  const [activeIndex, setActiveIndex] = useState(startingIndex);
  const [opening, setOpening] = useState(false);
  const [message, setMessage] = useState("");
  const activeItem = items[activeIndex];
  const completedCount = items.filter((item) => item.status === "generated").length;
  const unresolvedCount = items.length - completedCount;
  const progress = items.length ? Math.round((completedCount / items.length) * 100) : 0;

  async function openItem(item: BulkInventoryItem) {
    setOpening(true);
    setMessage("");
    try {
      const existingDraft = draftByItem.get(item.id);
      if (existingDraft) {
        router.push(`/dashboard/new-listing?draft=${existingDraft.id}`);
        return;
      }

      const response = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealershipId: batch.dealership_id,
          inputData: item.input_data,
          batchItemId: item.id,
          preferences: {
            platforms: ["Facebook Marketplace", "CarGurus", "Dealer Website"],
            tone: "Use dealership default",
            length: "standard",
            useStyleProfile: true,
          },
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Could not open this vehicle.");

      await createSupabaseBrowserClient()
        .from("bulk_inventory_batches")
        .update({ status: "in_progress", updated_at: new Date().toISOString() })
        .eq("id", batch.id);
      router.push(`/dashboard/new-listing?draft=${payload.draft.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not open this vehicle.");
      setOpening(false);
    }
  }

  function move(direction: -1 | 1) {
    setActiveIndex((current) => Math.min(items.length - 1, Math.max(0, current + direction)));
  }

  return (
    <main className="space-y-5 p-4 md:p-6">
      <section className="rounded-2xl border border-white/10 bg-[#0C0F14] p-5 md:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-zinc-500">
              <FileSpreadsheet className="h-4 w-4 text-red-400" />
              Saved batch
            </div>
            <h1 className="font-display text-3xl text-white md:text-4xl">{batch.name}</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Work through each vehicle in order. ListingFlow keeps every draft tied to its original row.
            </p>
          </div>
          <div className="min-w-64 space-y-2">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>{completedCount} complete</span>
              <span>{unresolvedCount} remaining</span>
            </div>
            <Progress value={progress} className="h-2 bg-white/8" />
          </div>
        </div>
      </section>

      {message && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-100">
          {message}
        </div>
      )}

      {activeItem ? (
        <section className="grid overflow-hidden rounded-2xl border border-white/10 bg-[#0B0E13] lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="max-h-[68vh] overflow-y-auto border-b border-white/8 bg-[#090C10] p-2 lg:border-b-0 lg:border-r">
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`mb-1 w-full rounded-xl border px-3 py-3 text-left transition ${
                  index === activeIndex
                    ? "border-red-500/35 bg-red-500/10"
                    : "border-transparent hover:border-white/8 hover:bg-white/[.035]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="truncate text-sm font-medium text-zinc-100">{vehicleName(item)}</span>
                  {item.status === "generated" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  ) : item.status === "needs_info" ? (
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  ) : (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-zinc-600" />
                  )}
                </div>
                <div className="mt-1 truncate font-mono text-[11px] text-zinc-500">
                  {item.input_data.stockNumber || item.input_data.vin || `Row ${item.row_index}`}
                </div>
              </button>
            ))}
          </aside>

          <div className="flex min-h-[520px] flex-col">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-white/10 text-zinc-300">
                  {activeIndex + 1} of {items.length}
                </Badge>
                <Badge
                  variant="outline"
                  className={activeItem.status === "generated"
                    ? "border-emerald-400/25 text-emerald-200"
                    : activeItem.status === "needs_info"
                      ? "border-amber-400/25 text-amber-100"
                      : "border-white/10 text-zinc-300"}
                >
                  {activeItem.status === "generated" ? "Listing saved" : activeItem.status === "needs_info" ? "Needs LF Fill In" : "Ready"}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="icon-sm" variant="outline" disabled={activeIndex === 0} onClick={() => move(-1)} title="Previous vehicle">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon-sm" variant="outline" disabled={activeIndex === items.length - 1} onClick={() => move(1)} title="Next vehicle">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </header>

            <div className="grid flex-1 gap-8 p-6 md:grid-cols-[minmax(0,1fr)_260px] md:p-8">
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">Current vehicle</p>
                <h2 className="mt-2 font-display text-4xl text-white">{vehicleName(activeItem)}</h2>
                <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                  {[
                    ["VIN", activeItem.input_data.vin],
                    ["Stock", activeItem.input_data.stockNumber],
                    ["Mileage", activeItem.input_data.mileage],
                    ["Price", activeItem.input_data.price],
                    ["Color", activeItem.input_data.exteriorColor],
                    ["Condition", activeItem.input_data.condition || activeItem.input_data.overallCondition],
                  ].map(([label, value]) => (
                    <div key={label} className="border-b border-white/8 pb-3">
                      <div className="text-xs text-zinc-500">{label}</div>
                      <div className={`mt-1 text-sm text-zinc-200 ${label === "VIN" || label === "Stock" ? "font-mono" : ""}`}>
                        {value || "Not provided"}
                      </div>
                    </div>
                  ))}
                </div>
                {activeItem.validation_errors.length > 0 && (
                  <div className="mt-6 rounded-xl border border-amber-400/15 bg-amber-400/[.05] p-4">
                    <div className="text-sm font-medium text-amber-100">ListingFlow will resolve these in LF Fill In</div>
                    <p className="mt-1 text-xs leading-5 text-zinc-400">{activeItem.validation_errors.slice(0, 3).join(" ")}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-white/8 bg-white/[.025] p-5">
                <div>
                  <div className="text-sm font-medium text-white">
                    {activeItem.status === "generated" ? "Continue editing" : "Start this listing"}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-zinc-400">
                    {draftByItem.has(activeItem.id)
                      ? "Your saved draft will reopen exactly where the team left it."
                      : "A shared draft will be created and kept with this batch row."}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => openItem(activeItem)}
                  disabled={opening}
                  className="mt-6 w-full bg-red-600 text-white hover:bg-red-500"
                >
                  {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : draftByItem.has(activeItem.id) ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {draftByItem.has(activeItem.id) ? "Open saved draft" : "Open in workspace"}
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-white/10 bg-[#0B0E13] p-10 text-center text-sm text-zinc-400">
          This batch does not contain any inventory rows.
        </section>
      )}
    </main>
  );
}
