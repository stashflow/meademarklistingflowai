import { CheckCircle2, FileSpreadsheet, Gauge, Layers3, Search, ShieldAlert, Sparkles } from "lucide-react";
import { CollapsibleSection } from "@/components/common/collapsible-section";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const mainFeatures = [
  {
    name: "Inventory Performance Command Center",
    icon: Gauge,
    pitch: "Shows which vehicles need attention first with active inventory, weak listings, risk, lead potential, and search visibility.",
  },
  {
    name: "ListingFlow Score",
    icon: Sparkles,
    pitch: "A deterministic 0-100 listing quality score across completeness, SEO, conversion, platform readiness, and advertising-risk safety.",
  },
  {
    name: "Advertising Risk Auditor",
    icon: ShieldAlert,
    pitch: "Flags unsupported claims like clean title, no accidents, one-owner, warranty, financing, and absolute condition language.",
  },
  {
    name: "Inventory Audit Workflow",
    icon: Search,
    pitch: "Lets staff filter vehicles by weak score, missing photos, high-risk claims, weak SEO, stale listings, no CTA, and missing trim.",
  },
  {
    name: "Bulk Intake and Standardization",
    icon: FileSpreadsheet,
    pitch: "Turns messy inventory rows into generated, reviewable listing records with shared dealership visibility.",
  },
];

const supplementalFeatures = [
  "Archive and restore listings without losing history",
  "Permanent delete with confirmation and audit logging",
  "Listing duplication for faster similar-vehicle workflows",
  "Photo checklist for merchandising completeness",
  "Lead Potential and Search Visibility action scores",
  "Collapsible diagnostics and filters for calmer pages",
  "Sidebar close and compact icon-only mode",
  "Team roles and permission-aware destructive actions",
  "Style Library for dealership voice consistency",
  "Scoring explainer page for transparent customer demos",
  "Stripe billing flow using real price object IDs",
  "Join-request waiting flow for dealership access control",
];

const roadmapIdeas = [
  ["One-click Optimize", "Rewrite weak listings from the top suggested fixes while preserving verified facts."],
  ["Photo Quality Vision", "Score actual vehicle photos for angle, blur, lighting, duplicates, missing odometer, and background clutter."],
  ["Marketplace Export Packs", "Export ready-to-post copy bundles for Facebook, Craigslist, website CMS, AutoTrader-style fields, and email."],
  ["Aging Inventory Playbooks", "Automatically suggest copy, price-note, and merchandising actions when a vehicle sits too long."],
  ["Competitive Listing Compare", "Compare a vehicle’s copy and feature depth against nearby similar listings."],
  ["Manager Review Queue", "Route high-risk or low-score listings to a manager before publish."],
  ["VIN Confidence Timeline", "Show every source that contributed to vehicle facts and which staff member confirmed them."],
  ["Dealer ROI Snapshot", "Estimate staff hours saved, rewrite backlog removed, and merchandising coverage improvement over time."],
  ["Syndication Health Monitor", "Track which listings are missing platform assets or stale copy across channels."],
  ["Smart Follow-up Prompts", "Generate salesperson talking points and customer replies from the verified listing facts."],
];

export default function FeaturesPage() {
  return (
    <main className="space-y-6 p-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-[#0F1218]/95 p-6 shadow-[0_28px_90px_rgba(0,0,0,.32)]">
        <div className="industrial-grid absolute inset-0 opacity-20" />
        <div className="relative max-w-3xl">
          <Badge className="mb-4 border-red-500/30 bg-red-500/10 text-red-100">
            Product packaging
          </Badge>
          <h1 className="font-display text-4xl font-black leading-tight md:text-5xl">Feature Map</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Use this page to explain ListingFlow as an inventory performance platform, not just an AI listing writer.
          </p>
        </div>
      </section>

      <CollapsibleSection title="Main Features" description="The core sellable pillars that should lead demos and pricing conversations.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {mainFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.name} className="app-card rounded-2xl border-white/10 bg-white/[.035]">
                <CardContent className="p-5">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#0B0D10]">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="font-semibold">{feature.name}</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{feature.pitch}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CollapsibleSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <CollapsibleSection title="Supplemental Features Implemented" description="Smaller details that make the product feel operational and polished.">
          <div className="grid gap-3 sm:grid-cols-2">
            {supplementalFeatures.map((feature) => (
              <div key={feature} className="flex gap-3 rounded-xl border border-white/10 bg-black/15 p-3 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Supplemental Feature Brainstorm" description="Strong add-ons that support the main platform pillars.">
          <div className="space-y-3">
            {roadmapIdeas.map(([name, pitch]) => (
              <div key={name} className="rounded-xl border border-white/10 bg-black/15 p-4">
                <div className="flex items-center gap-2 font-semibold">
                  <Layers3 className="h-4 w-4 text-primary" />
                  {name}
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{pitch}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </div>

      <CollapsibleSection title="Easy Sales Story" description="A simple talk track for demos.">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Before", "Listings are inconsistent, incomplete, and sometimes risky because staff are moving fast."],
            ["ListingFlow", "The platform scores every vehicle, flags what is weak, and gives staff a clear next action."],
            ["After", "Dealers get more consistent merchandising, safer copy review, faster workflow, and a cleaner inventory operation."],
          ].map(([label, copy]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/[.035] p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-red-100">{label}</div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </main>
  );
}
