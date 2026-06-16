"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Car,
  CreditCard,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  FileSpreadsheet,
  Gauge,
  Layers3,
  Library,
  Palette,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { BrandMark } from "@/components/common/brand-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DealershipRole } from "@/types/dealership";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge, roles: ["owner","admin","manager","staff"] },
  { href: "/dashboard/new-listing", label: "New Listing", icon: Car, roles: ["owner","admin","manager","staff"] },
  { href: "/dashboard/bulk-intake", label: "Bulk Intake", icon: FileSpreadsheet, roles: ["owner","admin","manager","staff"] },
  { href: "/dashboard/saved-listings", label: "Inventory Audit", icon: Library, roles: ["owner","admin","manager","staff"] },
  { href: "/dashboard/scoring", label: "Scoring", icon: TrendingUp, roles: ["owner","admin","manager","staff"] },
  { href: "/dashboard/features", label: "Feature Map", icon: Layers3, roles: ["owner","admin","manager","staff"] },
  { href: "/dashboard/style-library", label: "Style Library", icon: Palette, roles: ["owner","admin","manager","staff"] },
  { href: "/dashboard/team", label: "Team", icon: Users, roles: ["owner","admin","manager"] },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, roles: ["owner","admin","manager","staff"] },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard, roles: ["owner"] },
];

export function AppSidebar({
  mobile = false,
  isAdmin = false,
  role = null,
  collapsed = false,
  onToggleCollapsed,
  onClose,
}: {
  mobile?: boolean;
  isAdmin?: boolean;
  role?: DealershipRole | null;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const roleNav = nav.filter((item) => !role || item.roles.includes(role));
  const visibleNav = isAdmin
    ? [...roleNav, { href: "/dashboard/admin", label: "Founder Admin", icon: ShieldCheck, roles: ["owner"] }]
    : roleNav;

  return (
    <aside className={cn(
      mobile ? "block" : "hidden lg:block",
      "min-h-screen border-r border-white/10 bg-[#080A0D]/95 p-4 transition-[width] duration-200",
      collapsed && !mobile ? "w-[5.5rem]" : "w-72",
    )}>
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-3">
        <div className="flex items-center justify-between gap-2">
          <div className={cn("min-w-0", collapsed && !mobile ? "hidden" : "block")}>
            <BrandMark />
          </div>
          {collapsed && !mobile && <div className="mx-auto h-9 w-9 rounded-xl bg-primary/15" />}
          <div className={cn("flex items-center gap-1", collapsed && !mobile ? "hidden" : "flex")}>
            {onToggleCollapsed && (
              <Button type="button" variant="ghost" size="icon" onClick={onToggleCollapsed} title="Collapse sidebar">
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            )}
            {onClose && (
              <Button type="button" variant="ghost" size="icon" onClick={onClose} title="Close sidebar">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {collapsed && !mobile && onToggleCollapsed && (
            <Button type="button" variant="ghost" size="icon" onClick={onToggleCollapsed} title="Expand sidebar" className="mx-auto">
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <nav className="mt-6 space-y-1.5">
        {visibleNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition",
              collapsed && !mobile && "justify-center px-2",
              pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                ? "border-red-500/35 bg-red-500/10 text-white shadow-[inset_3px_0_0_rgba(220,38,38,.95)]"
                : "border-transparent text-muted-foreground hover:border-white/10 hover:bg-white/[.045] hover:text-white",
            )}
          >
            <item.icon className="h-4 w-4 text-zinc-500 transition group-hover:text-red-200" />
            <span className={cn(collapsed && !mobile ? "sr-only" : "inline")}>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className={cn("mt-8 rounded-2xl border border-white/10 bg-[#10151F] p-4", collapsed && !mobile && "hidden")}>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-red-100">Listing safeguard</div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Review vehicle facts and sensitive claims before publishing.
        </p>
      </div>
    </aside>
  );
}
