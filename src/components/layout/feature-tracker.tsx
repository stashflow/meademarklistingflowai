"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function FeatureTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname?.startsWith("/dashboard")) return;
    void fetch("/api/events/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ route: pathname }),
    });
  }, [pathname]);

  return null;
}
