"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Car,
  CreditCard,
  FileSpreadsheet,
  Gauge,
  Library,
  Palette,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { BrandMark } from "@/components/common/brand-mark";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/dashboard/new-listing", label: "New Listing", icon: Car },
  { href: "/dashboard/bulk-intake", label: "Bulk Intake", icon: FileSpreadsheet },
  { href: "/dashboard/saved-listings", label: "Saved Listings", icon: Library },
  { href: "/dashboard/style-library", label: "Style Library", icon: Palette },
  { href: "/dashboard/team", label: "Team", icon: Users },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
];

export function AppSidebar({ mobile = false, isAdmin = false }: { mobile?: boolean; isAdmin?: boolean }) {
  const pathname = usePathname();
  const visibleNav = isAdmin
    ? [...nav, { href: "/dashboard/admin", label: "Founder Admin", icon: ShieldCheck }]
    : nav;

  return (
    <aside className={`${mobile ? "block" : "hidden lg:block"} min-h-screen w-72 border-r border-white/10 bg-[#080A0D]/95 p-5`}>
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
        <BrandMark />
      </div>
      <nav className="mt-6 space-y-1.5">
        {visibleNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition",
              pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                ? "border-red-500/35 bg-red-500/10 text-white shadow-[inset_3px_0_0_rgba(220,38,38,.95)]"
                : "border-transparent text-muted-foreground hover:border-white/10 hover:bg-white/[.045] hover:text-white",
            )}
          >
            <item.icon className="h-4 w-4 text-zinc-500 transition group-hover:text-red-200" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-8 rounded-2xl border border-white/10 bg-[#10151F] p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-red-100">Operator note</div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Demo billing mode is test-only. No real payments are processed.
        </p>
      </div>
    </aside>
  );
}
