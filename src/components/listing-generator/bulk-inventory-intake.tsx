"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Save, Send, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { deterministicVehicleValidation } from "@/lib/validators/listing";
import type { VehicleInput } from "@/types/listing";

const aliases: Record<string, keyof VehicleInput> = {
  vin: "vin",
  year: "year",
  make: "make",
  model: "model",
  trim: "trim",
  mileage: "mileage",
  miles: "mileage",
  price: "price",
  stock: "stockNumber",
  stocknumber: "stockNumber",
  stock_number: "stockNumber",
  condition: "condition",
  color: "exteriorColor",
  exteriorcolor: "exteriorColor",
  exterior_color: "exteriorColor",
  interiorcolor: "interiorColor",
  interior_color: "interiorColor",
  drivetrain: "drivetrain",
  transmission: "transmission",
  engine: "engine",
  fuel: "fuelType",
  fueltype: "fuelType",
  features: "keyFeatures",
  keyfeatures: "keyFeatures",
  notes: "sellerNotes",
  sellernotes: "sellerNotes",
  title: "titleStatus",
  titlestatus: "titleStatus",
  accidents: "accidentHistory",
  accidenthistory: "accidentHistory",
  images: "imageUrls",
  imageurls: "imageUrls",
};

const sampleCsv = `year,make,model,trim,mileage,price,stock,condition,features,notes
2021,Toyota,Camry,SE,45200,21995,A1234,Good,Backup camera; Bluetooth,Fresh trade-in
2019,Ford,F-150,XLT,78100,28995,T9021,Very good,4x4; tow package,Needs manager review before publishing`;

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (const character of line) {
    if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  cells.push(current.trim());
  return cells;
}

function normalizeHeader(header: string) {
  return header.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

function parseInventory(raw: string) {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((header) => aliases[normalizeHeader(header)]);
  return lines.slice(1).map((line, index) => {
    const cells = splitCsvLine(line);
    const input: VehicleInput = {};
    headers.forEach((key, cellIndex) => {
      if (key && cells[cellIndex]) input[key] = cells[cellIndex];
    });
    const validation = deterministicVehicleValidation(input);
    return {
      rowIndex: index + 1,
      input,
      validation,
    };
  });
}

export function BulkInventoryIntake({ dealershipId }: { dealershipId: string }) {
  const router = useRouter();
  const [batchName, setBatchName] = useState(`Inventory intake ${new Date().toLocaleDateString()}`);
  const [rawCsv, setRawCsv] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => parseInventory(rawCsv), [rawCsv]);
  const readyCount = rows.filter((row) => row.validation.canGenerate).length;
  const issueCount = rows.length - readyCount;

  async function saveBatch() {
    setSaving(true);
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Please log in before saving a batch.");

      const { data: batch, error } = await supabase
        .from("bulk_inventory_batches")
        .insert({
          dealership_id: dealershipId,
          created_by: auth.user.id,
          name: batchName,
          source: "csv_paste",
          row_count: rows.length,
          ready_count: readyCount,
          issue_count: issueCount,
          status: issueCount ? "draft" : "validated",
        })
        .select("*")
        .single();

      if (error) throw error;

      if (rows.length) {
        const { error: itemError } = await supabase.from("bulk_inventory_items").insert(rows.map((row) => ({
          batch_id: batch.id,
          dealership_id: dealershipId,
          created_by: auth.user.id,
          row_index: row.rowIndex,
          input_data: row.input,
          status: row.validation.canGenerate ? "ready" : "needs_info",
          validation_errors: row.validation.issues,
        })));
        if (itemError) throw itemError;
      }

      await supabase.from("feature_events").insert({
        dealership_id: dealershipId,
        user_id: auth.user.id,
        feature: "bulk_inventory",
        action: "batch_saved",
        route: "/dashboard/bulk-intake",
        metadata: { rowCount: rows.length, readyCount, issueCount },
      });

      router.push(`/dashboard/bulk-intake/${batch.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the intake batch.");
    } finally {
      setSaving(false);
    }
  }

  async function openInWorkspace(input: VehicleInput, batchItemId?: string) {
    setSaving(true);
    try {
      const response = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealershipId,
          inputData: input,
          batchItemId,
          preferences: {
            platforms: ["Facebook Marketplace", "CarGurus", "Dealer Website"],
            tone: "Use dealership default",
            length: "standard",
            useStyleProfile: true,
          },
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Could not start this vehicle.");
      router.push(`/dashboard/new-listing?draft=${payload.draft.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start this vehicle.");
      setSaving(false);
    }
  }

  return (
    <main className="space-y-6 p-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-[#0F1218]/95 p-6">
        <div className="industrial-grid absolute inset-0 opacity-20" />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <Badge className="mb-4 border-red-500/30 bg-red-500/10 text-red-100">Staff speed</Badge>
            <h1 className="font-display text-4xl">Bulk inventory intake</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Paste a CSV export or spreadsheet rows, validate the batch, then stage ready vehicles into the listing generator one at a time.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-white/10 bg-white/[.035] p-3">
              <div className="text-2xl font-semibold">{rows.length}</div>
              <div className="text-xs text-muted-foreground">Rows</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[.035] p-3">
              <div className="text-2xl font-semibold text-emerald-200">{readyCount}</div>
              <div className="text-xs text-muted-foreground">Ready</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[.035] p-3">
              <div className="text-2xl font-semibold text-amber-200">{issueCount}</div>
              <div className="text-xs text-muted-foreground">Need info</div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card className="app-card rounded-2xl border-white/10">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Intake source</CardTitle>
            <CardDescription>Headers can include year, make, model, mileage, price, stock, condition, features, notes, and images.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Batch name</Label>
              <Input value={batchName} onChange={(event) => setBatchName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>CSV / spreadsheet rows</Label>
              <Textarea
                rows={16}
                value={rawCsv}
                onChange={(event) => setRawCsv(event.target.value)}
                placeholder={sampleCsv}
              />
            </div>
            {message && <p className="rounded-lg border border-white/10 bg-white/[.035] p-3 text-sm text-muted-foreground">{message}</p>}
            <Button onClick={saveBatch} disabled={!rows.length || saving} className="w-full bg-primary text-primary-foreground hover:bg-red-500">
              {saving ? <Upload className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              Save intake batch
            </Button>
          </CardContent>
        </Card>

        <Card className="app-card rounded-2xl border-white/10">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Validated rows</CardTitle>
            <CardDescription>Rows with enough vehicle detail can be staged directly into the generator.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border border-white/10">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issues</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.rowIndex}>
                      <TableCell>
                        {[row.input.year, row.input.make, row.input.model, row.input.trim].filter(Boolean).join(" ") || `Row ${row.rowIndex}`}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{row.input.stockNumber || row.input.vin || "Not provided"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={row.validation.canGenerate ? "border-emerald-400/30 text-emerald-100" : "border-amber-400/30 text-amber-100"}>
                          {row.validation.canGenerate ? "Ready" : "Needs info"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md text-xs text-muted-foreground">
                        {row.validation.issues.slice(0, 2).join(" ") || "No blocking issues."}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-white/10 bg-white/5"
                          onClick={() => openInWorkspace(row.input)}
                        >
                          <Send className="h-4 w-4" />
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {!rows.length && (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[.035] p-6 text-center text-sm text-muted-foreground">
                <FileSpreadsheet className="mx-auto mb-3 h-6 w-6" />
                Paste CSV rows to preview the batch.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
