"use client";

import Image from "next/image";
import { CarFront } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMotionPreference } from "@/components/common/motion-preferences";

export function ListingFlowLoader({
  label,
  detail,
  compact = false,
  className,
}: {
  label?: string;
  detail?: string;
  compact?: boolean;
  className?: string;
}) {
  const { preference } = useMotionPreference();
  const still = preference === "none";

  if (compact) {
    return (
      <div className={cn("inline-flex items-center gap-2", className)} aria-label={label || "Loading"}>
        <div className="lf-loader-track compact relative h-6 w-12 overflow-hidden rounded-full border border-white/10 bg-[#10151F]">
          <div className={cn("lf-loader-car compact absolute left-1 top-1 flex h-4 w-6 items-center justify-center", still && "motionless")}>
            <CarFront className="h-4 w-4 text-white" />
          </div>
          <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center overflow-hidden rounded bg-[#0B0D10]">
            <Image src="/brand/lf-favicon.png" alt="" fill sizes="16px" className="object-cover" />
          </div>
        </div>
        {label && <span className="sr-only">{label}</span>}
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-[360px] items-center justify-center p-6", className)}>
      <div className="relative flex h-72 w-72 items-center justify-center overflow-hidden rounded-[2rem] border border-white/12 bg-[#0F1218]/95 shadow-[0_28px_90px_rgba(0,0,0,.52)]">
        <div className="industrial-grid absolute inset-0 opacity-20" />
        <div className="absolute inset-x-8 bottom-16 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        {!still && (
          <>
            <div className="lf-loader-orbit absolute h-44 w-44 rounded-full border border-red-500/20" />
            <div className="lf-loader-orbit-reverse absolute h-56 w-56 rounded-full border border-white/10" />
            <div className="lf-loader-headlight absolute left-[52%] top-[42%] h-16 w-28 rounded-full bg-red-500/20 blur-2xl" />
          </>
        )}
        <div className={cn("lf-loader-car relative flex h-28 w-44 items-center justify-center", still && "motionless")}>
          <div className="absolute bottom-4 left-3 right-3 h-10 rounded-[999px] border border-white/15 bg-[#080A0D] shadow-[inset_0_1px_0_rgba(255,255,255,.12),0_18px_40px_rgba(0,0,0,.45)]" />
          <div className="absolute bottom-10 h-12 w-28 rounded-t-[2rem] border border-white/15 bg-[#10151F]" />
          <div className="absolute bottom-[4.55rem] h-6 w-16 rounded-t-2xl bg-white/10" />
          <div className="absolute bottom-7 left-2 h-3 w-5 rounded-full bg-red-500/90 shadow-[0_0_18px_rgba(220,38,38,.75)]" />
          <div className="absolute bottom-7 right-2 h-3 w-5 rounded-full bg-red-500/90 shadow-[0_0_18px_rgba(220,38,38,.75)]" />
          <div className="absolute bottom-2 left-9 h-6 w-6 rounded-full border-4 border-[#050608] bg-white/12" />
          <div className="absolute bottom-2 right-9 h-6 w-6 rounded-full border-4 border-[#050608] bg-white/12" />
          <div className="relative z-10 mt-3 h-16 w-16 overflow-hidden rounded-xl border border-white/10 bg-[#0B0D10] shadow-[0_0_40px_rgba(220,38,38,.18)]">
            <Image src="/brand/lf-favicon.png" alt="ListingFlow" fill sizes="64px" className="object-cover" priority />
          </div>
        </div>
        {(label || detail) && <span className="sr-only">{[label, detail].filter(Boolean).join(". ")}</span>}
      </div>
    </div>
  );
}
