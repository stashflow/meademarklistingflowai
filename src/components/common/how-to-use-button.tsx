"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const helpByPath = [
  {
    match: "/dashboard/new-listing",
    title: "How to use the listing builder",
    intro: "Start with the VIN when you have it, then confirm the decoded data before asking ListingFlow to write anything.",
    steps: [
      "Paste a 17-character VIN and choose Decode VIN.",
      "Confirm year, make, model, trim, and any decoded specs. Edit anything that looks off.",
      "Add mileage, condition, title or accident facts, price, selling points, and warranty or financing only when true.",
      "Choose platforms and tone, generate the listing, review warnings, then save approved copy to the shared library.",
    ],
  },
  {
    match: "/dashboard/saved-listings",
    title: "How to use saved listings",
    intro: "Use this library as the dealership’s shared source for drafts, reviewed copy, and published listing text.",
    steps: [
      "Search by VIN, stock number, year, make, or model.",
      "Open a listing to review generated outputs, risk notes, status, tags, and internal notes.",
      "Duplicate similar vehicles when inventory repeats.",
      "Delete only when your role allows it and the listing no longer belongs in the shared library.",
    ],
  },
  {
    match: "/dashboard/bulk-intake",
    title: "How to use bulk intake",
    intro: "Bulk intake is for staff speed when several vehicles need drafts started from spreadsheet-style rows.",
    steps: [
      "Paste or import rows with VIN, stock, year, make, model, mileage, condition, price, and notes.",
      "Review validation issues before staging a vehicle.",
      "Send a ready row into the listing builder, then confirm details and generate copy.",
      "Use it for intake speed, not for publishing without review.",
    ],
  },
  {
    match: "/dashboard/style-library",
    title: "How to use the style library",
    intro: "Teach ListingFlow how the dealership likes listings to sound without copying old listings word for word.",
    steps: [
      "Add old listing examples or notes about preferred voice, structure, CTAs, and banned phrases.",
      "Re-analyze the style profile after adding strong examples.",
      "Review the AI summary and edit anything that does not match the dealership.",
      "Use the saved style profile during generation for consistent team output.",
    ],
  },
  {
    match: "/dashboard/team",
    title: "How to use team management",
    intro: "Invite staff and keep permissions matched to the work they should be allowed to do.",
    steps: [
      "Create invite links for new users as manager or staff. Admin access is not granted through invite links.",
      "Approve or reject join requests from people who ask to join the dealership.",
      "Use owner/admin for settings and team control, manager for review work, and staff for generating and saving listings.",
      "Remove users when they should no longer access the dealership workspace.",
    ],
  },
  {
    match: "/dashboard/settings",
    title: "How to use settings",
    intro: "Settings controls account details, dealership defaults, style settings, animation level, feature flags, and the NHTSA VIN intelligence stack.",
    steps: [
      "Keep dealership defaults current so generated CTAs and disclaimers stay consistent.",
      "Use the Features tab to choose animation level and enable product features.",
      "Review the active NHTSA data stack. Title status stays staff-entered until a trusted history provider is connected later.",
      "Save changes after editing each section.",
    ],
  },
  {
    match: "/dashboard/billing",
    title: "How to use billing",
    intro: "Billing includes Stripe subscriptions plus clearly separated demo controls for internal plan testing.",
    steps: [
      "Review current trial usage and monthly generation limits.",
      "Owners can start a real monthly or yearly Stripe subscription when Stripe is configured.",
      "Demo plan buttons never process payment and are only for testing limits.",
      "Return to Free Trial when you want to test the normal 10-generation limit.",
    ],
  },
  {
    match: "/dashboard/analytics",
    title: "How to use analytics",
    intro: "Analytics shows how the dealership is using ListingFlow and where operational friction is happening.",
    steps: [
      "Review generation, save, style, and team activity.",
      "Use audit history to understand who changed or saved important records.",
      "Watch risk and quality trends before pushing listings live.",
      "This page is only visible to configured MeadeMark Labs admins.",
    ],
  },
  {
    match: "/dashboard/admin",
    title: "How to use founder admin",
    intro: "Founder admin is for MeadeMark Labs oversight, product support, and high-level usage review.",
    steps: [
      "Confirm your admin email is configured server-side.",
      "Review dealership activity without changing customer data unnecessarily.",
      "Use analytics and audit history to debug support questions.",
      "Keep real billing and sensitive customer operations outside demo controls until those systems are connected.",
    ],
  },
];

const fallbackHelp = {
  title: "How to use ListingFlow",
  intro: "ListingFlow is built around fast, accurate dealership listing work with staff review at every important step.",
  steps: [
    "Start a listing from a VIN or open saved listings from search.",
    "Confirm facts before generation so ListingFlow never invents claims.",
    "Use style profile, risk checks, and saved library to keep team output consistent.",
    "Use settings to tune features, animation, and VIN provider preferences.",
  ],
};

export function HowToUseButton() {
  const pathname = usePathname();
  const help = useMemo(
    () => helpByPath.find((item) => pathname.startsWith(item.match)) || fallbackHelp,
    [pathname],
  );

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" className="border-white/10 bg-white/[.035]" />}>
        <CircleHelp className="h-4 w-4" />
        <span className="hidden sm:inline">How to use</span>
      </DialogTrigger>
      <DialogContent className="max-w-xl border-white/10 bg-[#0B0D10]">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{help.title}</DialogTitle>
          <DialogDescription>{help.intro}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {help.steps.map((step, index) => (
            <div key={step} className="flex gap-3 rounded-lg border border-white/10 bg-white/[.035] p-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                {index + 1}
              </div>
              <p className="text-sm leading-6 text-zinc-300">{step}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
