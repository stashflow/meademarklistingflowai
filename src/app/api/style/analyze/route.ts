import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeDealershipStyle, fallbackStyleProfile } from "@/lib/style-analysis";
import { getDealershipContext } from "@/lib/permissions";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  dealershipId: z.string().uuid().optional(),
  save: z.boolean().default(false),
  answers: z.object({
    tone: z.string().optional(),
    platforms: z.array(z.string()).optional(),
    length: z.string().optional(),
    wordsToAvoid: z.string().optional(),
    sellingPoints: z.string().optional(),
    oldListings: z.string().optional(),
    styleInstructions: z.string().optional(),
  }),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: true, code: "UNAUTHORIZED", message: "Please log in to analyze style." },
        { status: 401 },
      );
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: true, code: "INVALID_INPUT", message: "Style answers are incomplete." },
        { status: 400 },
      );
    }

    const rateLimit = await checkRateLimit({
      key: user.id,
      route: "/api/style/analyze",
      limit: 5,
      windowSeconds: 30 * 60,
    });
    if (!rateLimit.allowed) return rateLimitedResponse;

    const { dealership, member } = await getDealershipContext(
      supabase,
      user.id,
      parsed.data.dealershipId,
    );

    if (parsed.data.save && (!dealership || !member || !["owner", "admin"].includes(member.role))) {
      return NextResponse.json(
        { error: true, code: "FORBIDDEN", message: "Only owners and admins can save style profiles." },
        { status: 403 },
      );
    }

    let profile = fallbackStyleProfile;
    try {
      profile = await analyzeDealershipStyle({
        dealershipId: parsed.data.dealershipId,
        ...parsed.data.answers,
      });
    } catch {
      profile = fallbackStyleProfile;
    }

    if (parsed.data.save && dealership) {
      await supabase.from("dealership_style_profiles").upsert(
        {
          dealership_id: dealership.id,
          voice_summary: profile.voiceSummary,
          formatting_rules: profile.formattingRules,
          preferred_phrases: profile.preferredPhrases,
          banned_phrases: profile.bannedPhrases,
          default_cta: profile.defaultCTA,
          default_disclaimer: profile.defaultDisclaimer,
          platform_preferences: profile.platformPreferences,
          example_listings: parsed.data.answers.oldListings
            ? parsed.data.answers.oldListings.split(/\n{2,}/).slice(0, 5)
            : [],
          ai_style_summary: profile.aiStyleSummary,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "dealership_id" },
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      {
        error: true,
        code: "STYLE_ANALYSIS_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "ListingFlow could not analyze this dealership style.",
      },
      { status: 500 },
    );
  }
}
