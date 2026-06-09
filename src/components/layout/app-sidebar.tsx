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
import type { DealershipRole } from "@/types/dealership";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge, roles: ["owner","admin","manager","staff"] },
  { href: "/dashboard/new-listing", label: "New Listing", icon: Car, roles: ["owner","admin","manager","staff"] },
  { href: "/dashboard/bulk-intake", label: "Bulk Intake", icon: FileSpreadsheet, roles: ["owner","admin","manager","staff"] },
  { href: "/dashboard/saved-listings", label: "Saved Listings", icon: Library, roles: ["owner","admin","manager","staff"] },
  { href: "/dashboard/style-library", label: "Style Library", icon: Palette, roles: ["owner","admin","manager","staff"] },
  { href: "/dashboard/team", label: "Team", icon: Users, roles: ["owner","admin","manager"] },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, roles: ["owner","admin","manager","staff"] },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard, roles: ["owner"] },
];

export function AppSidebar({ mobile = false, isAdmin = false, role = null }: { mobile?: boolean; isAdmin?: boolean; role?: DealershipRole | null }) {
  const pathname = usePathname();
  const roleNav = nav.filter((item) => !role || item.roles.includes(role));
  const visibleNav = isAdmin
    ? [...roleNav, { href: "/dashboard/admin", label: "Founder Admin", icon: ShieldCheck, roles: ["owner"] }]
    : roleNav;

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
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-red-100">Listing safeguard</div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Review vehicle facts and sensitive claims before publishing.
        </p>
      </div>
    </aside>
  );
}
