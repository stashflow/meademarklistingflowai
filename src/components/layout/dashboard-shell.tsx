"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { CommandPalette } from "@/components/layout/command-palette";
import { FeatureTracker } from "@/components/layout/feature-tracker";
import { Topbar } from "@/components/layout/topbar";
import type { DealershipRole } from "@/types/dealership";

export function DashboardShell({
  children,
  dealershipName,
  userEmail,
  isAdmin,
  role,
}: {
  children: React.ReactNode;
  dealershipName: string | null;
  userEmail: string | null;
  isAdmin: boolean;
  role: DealershipRole | null;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(() => pathname !== "/dashboard/new-listing");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen">
      {sidebarOpen && (
        <AppSidebar
          isAdmin={isAdmin}
          role={role}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
          onClose={() => setSidebarOpen(false)}
        />
      )}
      <div className="min-w-0 flex-1">
        <Topbar
          dealershipName={dealershipName}
          userEmail={userEmail}
          isAdmin={isAdmin}
          role={role}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => {
            setSidebarOpen((current) => !current);
            if (!sidebarOpen) setSidebarCollapsed(false);
          }}
        />
        <CommandPalette isAdmin={isAdmin} />
        <FeatureTracker />
        {children}
      </div>
    </div>
  );
}
