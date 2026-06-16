"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function CollapsibleSection({
  title,
  description,
  defaultOpen = true,
  children,
  className,
  contentClassName,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <details open={defaultOpen} className={cn("group rounded-2xl border border-white/10 bg-white/[.035]", className)}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 marker:hidden">
        <div className="min-w-0">
          <div className="font-semibold">{title}</div>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
      </summary>
      <div className={cn("border-t border-white/10 p-4", contentClassName)}>
        {children}
      </div>
    </details>
  );
}
