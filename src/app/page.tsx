import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  ClipboardCheck,
  Dot,
  Gauge,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { BrandMark } from "@/components/common/brand-mark";
import { MotionReveal } from "@/components/common/motion-reveal";
import { EarlyAccessForm } from "@/components/public/early-access-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  "Decode a VIN and confirm vehicle details",
  "Apply dealership style and platform settings",
  "Review generated outputs before publishing",
  "Save approved copy to the shared listing library",
];

const trustFeatures: Array<[LucideIcon, string, string]> = [
  [ClipboardCheck, "VIN-first intake", "Decode a VIN into editable baseline details, then add mileage, condition notes, selling points, and staff-confirmed claims."],
  [ShieldCheck, "Honest generation", "The AI is instructed not to invent title, accident, warranty, ownership, financing, or service claims."],
  [Gauge, "Trial controls", "The 10-generation free limit is enforced server-side. Demo billing exists only for testing plan behavior."],
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0B0D10]">
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#0B0D10]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 lg:px-8">
          <BrandMark />
          <nav className="hidden items-center gap-8 text-sm font-medium text-zinc-400 lg:flex">
            <a href="#how-it-works" className="transition hover:text-white">Workflow</a>
            <a href="#style-learning" className="transition hover:text-white">Controls</a>
            <Link href="/pricing" className="transition hover:text-white">Pricing</Link>
            <a href="#early-access" className="transition hover:text-white">Access</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild className="bg-primary text-primary-foreground shadow-[0_0_0_1px_rgba(220,38,38,.35),0_18px_42px_rgba(220,38,38,.22)] hover:bg-red-500">
              <Link href="/signup">Start Free Trial</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative border-b border-white/8">
        <div className="industrial-grid absolute inset-0 opacity-30" />
        <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(220,38,38,.16),transparent)]" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-16 lg:grid-cols-[.9fr_1.1fr] lg:px-8 lg:py-28">
        <MotionReveal>
        <div className="flex flex-col justify-center">
          <Badge className="mb-7 w-fit border-red-500/35 bg-red-500/10 text-red-100">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Private build underway
          </Badge>
          <h1 className="font-display max-w-3xl text-5xl font-black leading-[.95] text-white md:text-6xl lg:text-7xl">
            Dealer-ready vehicle listings in seconds.
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-8 text-zinc-300 md:text-lg">
            ListingFlow AI by MeadeMark Labs is being built to help dealerships generate cleaner
            listing copy from VINs, confirmed vehicle details, and staff notes, while keeping staff in control.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild className="bg-primary text-primary-foreground shadow-[0_0_0_1px_rgba(220,38,38,.35),0_18px_42px_rgba(220,38,38,.22)] hover:bg-red-500">
              <Link href="/signup">
                Start Free Trial <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-white/12 bg-white/[.035] hover:bg-white/[.07]">
              <a href="#how-it-works">View How It Works</a>
            </Button>
          </div>
          <div className="mt-8 grid max-w-xl gap-3 text-sm text-zinc-400 sm:grid-cols-2">
            <div className="flex items-center gap-2"><Dot className="h-5 w-5 text-red-500" /> 10 free listing generations</div>
            <div className="flex items-center gap-2"><Dot className="h-5 w-5 text-red-500" /> Staff review stays required</div>
          </div>
          <p className="mt-5 max-w-xl text-xs leading-5 text-zinc-500">
            Free access includes 10 listing generations per month. Final listings should be reviewed by
            dealership staff before publishing.
          </p>
        </div>
        </MotionReveal>

        <MotionReveal delay={0.08}>
        <Card className="app-card overflow-hidden rounded-[2rem] border-white/12 bg-[#11141A]/95 shadow-[0_28px_90px_rgba(0,0,0,.52)]">
          <div className="relative aspect-[16/7] border-b border-white/10 bg-[#10151F]">
            <Image
              src="/brand/listingflow-fixed.png"
              alt="ListingFlow AI by MeadeMark Labs"
              fill
              sizes="(min-width: 1024px) 560px, 100vw"
              className="object-cover"
              priority
            />
          </div>
          <CardHeader className="border-b border-white/10 bg-white/[.025]">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Listing workspace</CardTitle>
              <Badge variant="outline" className="border-red-500/30 text-red-200">Trial</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-6">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Usage", "Plan tracked"],
                ["Library", "Shared drafts"],
                ["Team", "Role based"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-white/10 bg-white/[.04] p-4">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="mt-2 text-xl font-semibold">{value}</div>
                </div>
              ))}
            </div>
            <div className="redline overflow-hidden rounded-md border border-white/10 bg-[#0B0D10]/80 p-5 pl-6">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary" /> Style profile applied
              </div>
              <p className="text-sm leading-6 text-slate-300">
                Professional dealer voice, concise feature bullets, clear CTA, no unsupported
                warranty or history claims.
              </p>
            </div>
            <div className="space-y-3">
              {["Facebook Marketplace", "CarGurus", "Dealer website", "SEO highlights"].map((item) => (
                <div key={item} className="flex items-center justify-between rounded-md border border-white/10 bg-white/[.04] px-4 py-3 text-sm">
                  <span>{item}</span>
                  <ClipboardCheck className="h-4 w-4 text-emerald-300" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </MotionReveal>
        </div>
      </section>

      <section className="border-y border-white/8 bg-[#0D1015]">
        <div className="mx-auto grid max-w-7xl gap-4 px-6 py-10 md:grid-cols-3">
          {[
            ["Problem", "Manual listing writing is slow, inconsistent, and easy to overstate when details are incomplete."],
            ["Product", "ListingFlow turns structured details and staff notes into platform-ready copy with review warnings."],
            ["Built for dealerships", "Shared workspaces, roles, trial limits, team invites, saved listings, and style memory are included."],
          ].map(([title, copy]) => (
            <Card key={title} className="app-card redline overflow-hidden border-white/10 bg-white/[.035] pl-1 transition hover:border-red-500/30">
              <CardHeader>
                <CardTitle className="font-display text-xl">{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-muted-foreground">{copy}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <BadgeCheck className="mb-4 h-6 w-6 text-primary" />
            <h2 className="font-display text-4xl font-black leading-tight md:text-5xl">A practical workflow for real inventory.</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step} className="rounded-lg border border-white/10 bg-[#10151F] p-5 shadow-[0_18px_70px_rgba(0,0,0,.28)]">
              <div className="mb-6 flex h-8 w-8 items-center justify-center rounded-md bg-white text-sm font-bold text-[#0B0D10]">
                {index + 1}
              </div>
              <p className="text-sm leading-6 text-slate-300">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="style-learning" className="border-y border-white/8 bg-[#10151F]">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-3">
          {trustFeatures.map(([Icon, title, copy]) => (
            <div key={title} className="rounded-lg border border-white/10 bg-[#0B0D10]/85 p-6 transition hover:border-white/22">
              <Icon className="mb-5 h-6 w-6 text-primary" />
              <h3 className="font-display text-xl">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="early-access" className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[0.85fr_1fr]">
        <div>
          <div className="relative mb-8 aspect-[16/5] max-w-md overflow-hidden rounded-lg border border-white/10 bg-[#171A20] shadow-[0_20px_80px_rgba(0,0,0,.26)]">
            <Image
              src="/brand/meademark-crop.png"
              alt="MeadeMark Labs"
              fill
              sizes="(min-width: 1024px) 448px, 100vw"
              className="object-contain"
              priority
            />
          </div>
          <h2 className="font-display text-4xl font-black">Request early access.</h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            ListingFlow AI is currently in active development. Early dealerships can test the
            workflow, style learning, generation limits, and subscription flow before production launch.
          </p>
        </div>
        <Card className="app-card rounded-[2rem] border-white/12 bg-[#11141A]/95">
          <CardContent className="p-6">
            <EarlyAccessForm compact />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
