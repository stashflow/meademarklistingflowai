import { CheckCircle2, Search, ShieldAlert, Sparkles, Target, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const scoreSections = [
  {
    title: "Completeness",
    weight: "25%",
    icon: CheckCircle2,
    details: ["Verified VIN/source confidence", "Year, make, model, trim", "Mileage, price, powertrain plausibility", "Features and condition notes"],
  },
  {
    title: "SEO",
    weight: "20%",
    icon: Search,
    details: ["Search-ready title coverage", "Core vehicle keywords", "Feature keyword depth", "Meta description, specificity, and duplicate-copy checks"],
  },
  {
    title: "Conversion",
    weight: "20%",
    icon: Target,
    details: ["Clear headline", "Buyer benefits", "Readable formatting", "Trust signals, CTA, and condition context"],
  },
  {
    title: "Platform Fit",
    weight: "15%",
    icon: Sparkles,
    details: ["Facebook marketplace readiness", "Craigslist classified readiness", "Website detail depth", "Syndication copy plus SEO assets"],
  },
  {
    title: "Compliance",
    weight: "20%",
    icon: ShieldAlert,
    details: ["Unsupported high-risk claims reduce score fastest", "Absolute claim language is reviewed", "Missing evidence lowers confidence", "Risk flags prevent careless publishing"],
  },
];

export default function ScoringPage() {
  return (
    <main className="space-y-6 p-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-[#0F1218]/95 p-6 shadow-[0_28px_90px_rgba(0,0,0,.32)]">
        <div className="industrial-grid absolute inset-0 opacity-20" />
        <div className="relative max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-red-100">
            <TrendingUp className="h-3.5 w-3.5" />
            ListingFlow scoring model
          </div>
          <h1 className="font-display text-4xl font-black leading-tight md:text-5xl">Know which listings will work before shoppers see them.</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            The platform score turns vehicle data, listing copy, channel readiness, and compliance checks into one operational signal for the dealership.
          </p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {scoreSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} className="app-card rounded-2xl border-white/10 bg-white/[.035]">
              <CardContent className="p-5">
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#0B0D10]">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold">{section.title}</h2>
                  <span className="text-sm text-muted-foreground">{section.weight}</span>
                </div>
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {section.details.map((detail) => <p key={detail}>{detail}</p>)}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="app-card rounded-2xl border-white/10">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Action Scores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
            <p>Lead Potential blends conversion quality, completeness, platform fit, compliance confidence, photo readiness, and listing age.</p>
            <p>Search Visibility blends SEO coverage, vehicle completeness, channel assets, feature depth, and generic-copy penalties.</p>
            <p>Scores are operational guidance, not guarantees of sales results, rankings, or legal compliance.</p>
          </CardContent>
        </Card>

        <Card className="app-card rounded-2xl border-white/10">
          <CardHeader>
            <CardTitle className="font-display text-2xl">How to Use It</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
            <p>Start in Inventory Audit, filter for scores below 70, high-risk claims, missing photos, weak SEO, stale listings, or missing trim.</p>
            <p>Open a vehicle to see the optimization plan, missing facts, risk flags, photo checklist, and editable platform copy.</p>
            <p>Save the listing after edits to refresh the scores and timestamp the optimization pass.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
