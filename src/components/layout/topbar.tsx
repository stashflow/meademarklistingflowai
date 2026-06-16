"use client";

import Link from "next/link";
import { Menu, PanelLeftClose, PanelLeftOpen, Plus, Search } from "lucide-react";
import { HowToUseButton } from "@/components/common/how-to-use-button";
import { LogoutButton } from "@/components/layout/logout-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AppSidebar } from "./app-sidebar";
import type { DealershipRole } from "@/types/dealership";

export function Topbar({
  dealershipName,
  userEmail,
  isAdmin = false,
  role = null,
  sidebarOpen = true,
  onToggleSidebar,
}: {
  dealershipName?: string | null;
  userEmail?: string | null;
  isAdmin?: boolean;
  role?: DealershipRole | null;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0B0D10]/88 backdrop-blur-xl">
      <div className="grid h-16 grid-cols-[minmax(0,1fr)_max-content] items-center gap-3 px-4 md:grid-cols-[minmax(0,1fr)_minmax(180px,520px)_max-content] md:gap-4 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="hidden lg:inline-flex"
            title={sidebarOpen ? "Close navigation" : "Open navigation"}
          >
            {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
          </Button>
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" />}>
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-white/10 bg-[#0B0D10] p-0">
              <AppSidebar mobile isAdmin={isAdmin} role={role} />
            </SheetContent>
          </Sheet>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Workspace</div>
            <div className="truncate font-semibold">{dealershipName || "No workspace yet"}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("listingflow-open-command"))}
          className="hidden h-10 min-w-0 max-w-full overflow-hidden items-center gap-2 justify-self-stretch rounded-xl border border-white/10 bg-white/[.04] px-3 text-left text-sm text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,.05),0_10px_35px_rgba(0,0,0,.18)] transition hover:border-white/20 hover:bg-white/[.06] min-[980px]:flex"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">Search VIN, stock, year, make, model</span>
          <span className="hidden shrink-0 items-center gap-1 rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-zinc-500 lg:inline-flex">
            Search
          </span>
        </button>
        <div className="flex shrink-0 items-center justify-end gap-2 md:gap-3">
          <HowToUseButton />
          <Button asChild size="sm" className="hidden shrink-0 bg-primary text-primary-foreground hover:bg-red-500 sm:inline-flex">
            <Link href="/dashboard/new-listing"><Plus className="h-4 w-4" /> <span className="hidden xl:inline">New</span></Link>
          </Button>
          <Badge variant="outline" className="hidden max-w-48 shrink truncate border-white/10 text-muted-foreground 2xl:inline-flex">
            {userEmail}
          </Badge>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
