"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BadgeCheck, Check, FileSpreadsheet, Gauge, Library, ShieldCheck, Sparkles, Users } from "lucide-react";
import { BrandMark } from "@/components/common/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const plans = [
  {
    name: "Starter",
    audience: "Small teams writing listings every week",
    monthly: "$79",
    yearly: "$790",
    monthlyEquivalent: "$66/mo",
    limit: "150 generations/month",
    cta: "Start Starter Trial",
    highlighted: false,
    features: [
      "7-day free trial",
      "5 team users",
      "VIN-first listing builder",
      "NHTSA VIN intelligence",
      "Dealer website, Facebook, CarGurus, Craigslist, and SEO outputs",
      "Dealership style profile",
      "Shared saved listing library",
      "Copy-ready output tabs",
      "Claim risk warnings",
    ],
  },
  {
    name: "Pro",
    audience: "Dealerships that want faster staff workflow",
    monthly: "$149",
    yearly: "$1,490",
    monthlyEquivalent: "$124/mo",
    limit: "500 generations/month",
    cta: "Start Pro Trial",
    highlighted: true,
    features: [
      "Everything in Starter",
      "15 team users",
      "Bulk inventory intake",
      "Structured feature highlights",
      "Claim Risk Auditor",
      "Listing Quality Score",
      "Approval statuses",
      "Audit history",
      "Owner/admin analytics",
      "Style library re-analysis",
      "Team invites and join requests",
    ],
  },
  {
    name: "Dealer Group",
    audience: "High-volume stores and multi-location teams",
    monthly: "$299",
    yearly: "$2,990",
    monthlyEquivalent: "$249/mo",
    limit: "Fair-use unlimited",
    cta: "Start Group Trial",
    highlighted: false,
    features: [
      "Everything in Pro",
      "More stores and users",
      "High-volume generation limits",
      "Advanced audit visibility",
      "Priority onboarding help",
      "Workflow review support",
      "Founder/admin support channel",
      "Best for teams standardizing listing quality",
    ],
  },
];

const platformFeatures = [
  ["VIN workflow", "NHTSA decode, safety/recall intelligence, staff confirmation, no invented claims"],
  ["AI outputs", "Facebook, CarGurus, website, Craigslist, SEO, highlights, notes, and disclaimers"],
  ["Style learning", "Old listing examples, banned phrases, preferred CTAs, dealership voice memory"],
  ["Risk controls", "Claim Risk Auditor, review warnings, unsupported-claim detection, quality score"],
  ["Team workflow", "Workspaces, roles, invites, join requests, shared library, approval statuses"],
  ["Operations", "Bulk intake, saved listings, duplicate listings, image URL tracking, audit history"],
];

const faqs = [
  ["Is there a free trial?", "Yes. Every paid plan starts with a 7-day trial. The trial lets your dealership test the full workflow before Stripe bills automatically."],
  ["Can staff publish without review?", "ListingFlow creates dealer-ready drafts, but final listings should still be reviewed by dealership staff before publishing."],
  ["Does VIN decoding include title status?", "No. NHTSA VIN decoding does not verify clean title, accidents, ownership, or warranty. Those claims must be entered by staff or a trusted history source."],
  ["What happens if we hit our monthly limit?", "The app blocks additional generations cleanly and prompts the owner to upgrade or wait until the monthly reset."],
  ["Can we cancel?", "Yes. Once Stripe is live, owners manage cards, invoices, cancellation, and plan changes through the Stripe billing portal."],
];

export function PricingPage() {
  const [billing, setBilling] = useState<"yearly" | "monthly">("yearly");

  return (
    <main className="min-h-screen overflow-hidden bg-[#0B0D10]">
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#0B0D10]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 lg:px-8">
          <BrandMark />
          <nav className="hidden items-center gap-8 text-sm font-medium text-zinc-400 lg:flex">
            <Link href="/" className="transition hover:text-white">Product</Link>
            <a href="#compare" className="transition hover:text-white">Features</a>
            <a href="#faq" className="transition hover:text-white">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild><Link href="/login">Login</Link></Button>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-red-500">
              <Link href="/signup">Start Free Trial</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative border-b border-white/8">
        <div className="industrial-grid absolute inset-0 opacity-25" />
        <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(180deg,rgba(220,38,38,.18),transparent)]" />
        <div className="relative mx-auto max-w-7xl px-5 py-16 text-center lg:px-8 lg:py-24">
          <Badge className="mb-6 border-red-500/35 bg-red-500/10 text-red-100">7-day trial · cancel anytime</Badge>
          <h1 className="font-display mx-auto max-w-4xl text-5xl font-black leading-[.95] text-white md:text-6xl">
            Pricing built for real dealership listing volume.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-zinc-300 md:text-lg">
            Turn VINs, staff notes, style preferences, and review controls into platform-ready listing copy without adding another heavy dealership system.
          </p>
          <div className="mt-8 inline-flex rounded-xl border border-white/10 bg-white/[.035] p-1">
            {[
              ["yearly", "Yearly", "Save 2 months"],
              ["monthly", "Monthly", ""],
            ].map(([value, label, note]) => (
              <button
                key={value}
                type="button"
                onClick={() => setBilling(value as "yearly" | "monthly")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  billing === value ? "bg-primary text-white shadow-[0_10px_30px_rgba(220,38,38,.25)]" : "text-zinc-400 hover:text-white"
                }`}
              >
                {label}
                {note && <span className="ml-2 rounded border border-white/15 px-1.5 py-0.5 text-[10px]">{note}</span>}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-12 lg:grid-cols-3 lg:px-8">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`app-card relative overflow-hidden rounded-2xl ${
              plan.highlighted ? "border-red-500/45 bg-[#121720] shadow-[0_24px_90px_rgba(220,38,38,.16)]" : "border-white/10"
            }`}
          >
            {plan.highlighted && (
              <div className="absolute right-4 top-4 rounded-full border border-red-500/35 bg-red-500/15 px-3 py-1 text-xs text-red-100">
                Recommended
              </div>
            )}
            <CardHeader className="space-y-4">
              <CardTitle className="font-display text-3xl">{plan.name}</CardTitle>
              <p className="min-h-12 text-sm leading-6 text-muted-foreground">{plan.audience}</p>
              <div>
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-semibold text-white">{billing === "yearly" ? plan.yearly : plan.monthly}</span>
                  <span className="pb-2 text-sm text-muted-foreground">{billing === "yearly" ? "/year" : "/month"}</span>
                </div>
                {billing === "yearly" && <p className="mt-2 text-sm text-red-100">{plan.monthlyEquivalent} billed annually</p>}
              </div>
              <Badge variant="outline" className="w-fit border-white/10">{plan.limit}</Badge>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button asChild className={`w-full ${plan.highlighted ? "bg-primary hover:bg-red-500" : "bg-white text-[#0B0D10] hover:bg-zinc-200"}`}>
                <Link href="/signup">{plan.cta} <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <div className="space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex gap-2 text-sm leading-6 text-zinc-300">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-primary" />
                    {feature}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section id="compare" className="border-y border-white/8 bg-[#10151F]">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <BadgeCheck className="mb-4 h-6 w-6 text-primary" />
              <h2 className="font-display text-4xl font-black">Everything needed to keep listings moving.</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              The core value is not just generation. It is faster intake, safer claims, shared review, and consistent dealership voice.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              [Gauge, platformFeatures[0][0], platformFeatures[0][1]],
              [Sparkles, platformFeatures[1][0], platformFeatures[1][1]],
              [Library, platformFeatures[2][0], platformFeatures[2][1]],
              [ShieldCheck, platformFeatures[3][0], platformFeatures[3][1]],
              [Users, platformFeatures[4][0], platformFeatures[4][1]],
              [FileSpreadsheet, platformFeatures[5][0], platformFeatures[5][1]],
            ].map(([Icon, title, copy]) => (
              <div key={String(title)} className="rounded-xl border border-white/10 bg-[#0B0D10]/80 p-5">
                <Icon className="mb-4 h-5 w-5 text-primary" />
                <h3 className="font-display text-xl">{String(title)}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{String(copy)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-5xl px-5 py-16 lg:px-8">
        <h2 className="font-display text-4xl font-black">Pricing questions dealers ask first.</h2>
        <div className="mt-8 space-y-3">
          {faqs.map(([question, answer]) => (
            <div key={question} className="rounded-xl border border-white/10 bg-white/[.035] p-5">
              <h3 className="font-semibold text-white">{question}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{answer}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-2xl border border-red-500/25 bg-red-500/10 p-6 text-center">
          <h3 className="font-display text-3xl">Start with one VIN. Keep the workflow if it saves time.</h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-red-100">
            Try ListingFlow for 7 days. No fake publishing, no invented claims, no bloated CRM. Just better listing workflow.
          </p>
          <Button asChild className="mt-6 bg-primary text-primary-foreground hover:bg-red-500">
            <Link href="/signup">Start Free Trial <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
