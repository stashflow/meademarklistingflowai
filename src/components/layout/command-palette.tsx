"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Car, FileSpreadsheet, Library, Palette, Search, Settings, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const baseActions = [
  { label: "New listing", href: "/dashboard/new-listing", icon: Car, keywords: "generate vehicle create" },
  { label: "Bulk inventory intake", href: "/dashboard/bulk-intake", icon: FileSpreadsheet, keywords: "csv spreadsheet import queue" },
  { label: "Saved listings", href: "/dashboard/saved-listings", icon: Library, keywords: "library drafts published copy" },
  { label: "Style library", href: "/dashboard/style-library", icon: Palette, keywords: "profile examples voice" },
  { label: "Team", href: "/dashboard/team", icon: Users, keywords: "invite roles members approvals" },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, keywords: "features animation account dealership" },
];

export function CommandPalette({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const trimmedQuery = query.trim();
  const savedSearchHref = `/dashboard/saved-listings${trimmedQuery ? `?search=${encodeURIComponent(trimmedQuery)}` : ""}`;
  const newVinHref = `/dashboard/new-listing${trimmedQuery ? `?vin=${encodeURIComponent(trimmedQuery.toUpperCase())}` : ""}`;
  const looksLikeVin = /^[A-HJ-NPR-Z0-9]{8,17}$/i.test(trimmedQuery);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    function onOpenCommand() {
      setOpen(true);
    }
    window.addEventListener("listingflow-open-command", onOpenCommand);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("listingflow-open-command", onOpenCommand);
    };
  }, []);

  const actions = useMemo(() => {
    const all = isAdmin
      ? [
          ...baseActions,
          { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3, keywords: "usage events audit quality admin" },
          { label: "Founder admin", href: "/dashboard/admin", icon: ShieldCheck, keywords: "global founder admin all dealerships" },
        ]
      : baseActions;
    const normalized = query.toLowerCase().trim();
    if (!normalized) return all;
    return all.filter((action) => `${action.label} ${action.keywords}`.toLowerCase().includes(normalized));
  }, [isAdmin, query]);

  function goToSavedSearch() {
    router.push(savedSearchHref);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="top-[18%] max-h-[min(78vh,720px)] w-[min(92vw,720px)] max-w-none translate-y-0 overflow-hidden rounded-2xl border-white/12 bg-[#11141A]/95 p-0 shadow-[0_34px_120px_rgba(0,0,0,.62)] backdrop-blur-2xl"
      >
        <div className="border-b border-white/10 bg-white/[.035] p-3">
          <div className="flex h-14 items-center gap-3 rounded-xl border border-white/10 bg-[#0B0D10]/80 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,.05)]">
            <Search className="h-5 w-5 shrink-0 text-zinc-400" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  goToSavedSearch();
                }
              }}
              placeholder="Search VIN, stock, year, make, model, or feature..."
              className="h-full min-w-0 border-0 bg-transparent px-0 text-lg text-white placeholder:text-zinc-500 focus-visible:ring-0"
            />
            <div className="hidden shrink-0 rounded-md border border-white/10 px-2 py-1 text-[10px] text-zinc-500 sm:block">
              Enter
            </div>
          </div>
        </div>
        <div className="max-h-[calc(min(78vh,720px)-88px)] overflow-y-auto p-3">
          <div className="grid gap-1.5">
            {looksLikeVin && (
              <Button
                asChild
                variant="ghost"
                className="h-auto justify-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3.5 text-left text-red-50 hover:bg-red-500/15"
              >
                <Link href={newVinHref} onClick={() => setOpen(false)}>
                  <Car className="h-4 w-4 text-primary" />
                  <span className="min-w-0 truncate">{`Start new VIN listing for ${trimmedQuery.toUpperCase()}`}</span>
                </Link>
              </Button>
            )}
            <Button
              asChild
              variant="ghost"
              className="h-auto justify-start gap-3 rounded-xl border border-white/10 bg-white/[.025] px-4 py-3.5 text-left hover:bg-white/[.06]"
            >
              <Link href={savedSearchHref} onClick={() => setOpen(false)}>
                <Search className="h-4 w-4 text-primary" />
                <span className="min-w-0 truncate">{trimmedQuery ? `Search saved listings for "${trimmedQuery}"` : "Search saved listings"}</span>
              </Link>
            </Button>
            {actions.map((action) => (
              <Button
                key={action.href}
                asChild
                variant="ghost"
                className="h-auto justify-start gap-3 rounded-xl border border-transparent bg-transparent px-4 py-3 text-left text-zinc-300 hover:border-white/10 hover:bg-white/[.05] hover:text-white"
              >
                <Link href={action.href} onClick={() => setOpen(false)}>
                  <action.icon className="h-4 w-4 text-primary" />
                  <span className="min-w-0 truncate">{action.label}</span>
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
