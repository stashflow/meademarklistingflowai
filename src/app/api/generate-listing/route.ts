import { NextResponse } from "next/server";
import { analyzeVehicleInputQuality } from "@/lib/generation/input-quality";
import { auditListingClaims } from "@/lib/generation/claim-risk";
import { extractFeatureHighlights } from "@/lib/generation/feature-highlights";
import { generateVehicleListing } from "@/lib/generation/generate-listing";
import { canGenerateForPlan, currentMonthKey } from "@/lib/generation/plans";
import { getDealershipContext } from "@/lib/permissions";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { trackFeatureEvent, writeAuditLog } from "@/lib/telemetry/audit";
import {
  deterministicVehicleValidation,
  listingGenerationRequestSchema,
} from "@/lib/validators/listing";

function planLimitMessage(status: string, limit: number | "unlimited") {
  if (status === "past_due") {
    return "Listing generation is paused because this dealership’s subscription payment is past due. The dealership owner can update payment details in Billing.";
  }
  if (status === "canceled") {
    return "Listing generation is paused because this dealership’s subscription is canceled. The dealership owner can restart a plan in Billing.";
  }
  return `You’ve reached the ${limit}-generation monthly free trial limit for this dealership. Choose a paid plan to continue generating, or wait until the next monthly reset.`;
}

function conciseReviewWarnings(
  vehicle: Record<string, string | undefined>,
  warnings: string[],
  inputWarnings: string[],
) {
  const specificWarnings = warnings.filter(
    (warning) => !/^(missing|please provide|add more)\b/i.test(warning.trim()),
  );
  const contextualWarnings = [
    !vehicle.trim ? "Trim is unconfirmed, so trim-specific claims were omitted." : null,
    !vehicle.titleStatus && !vehicle.accidentHistory
      ? "Title and accident history were not provided and are omitted from public copy."
      : null,
    ...inputWarnings.filter((warning) => !/^(missing|please provide|add more)\b/i.test(warning.trim())),
  ].filter(Boolean) as string[];
  return [...new Set([...specificWarnings, ...contextualWarnings])].slice(0, 4);
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: true, code: "UNAUTHORIZED", message: "Please log in to generate listings." },
        { status: 401 },
      );
    }

    const parsed = listingGenerationRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: true,
          code: "INVALID_INPUT",
          message: "Some listing details need attention before generation.",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { dealership, member } = await getDealershipContext(
      supabase,
      user.id,
      parsed.data.dealershipId,
    );

    if (!dealership || !member) {
      return NextResponse.json(
        {
          error: true,
          code: "NO_DEALERSHIP",
          message: "You need an active dealership workspace before generating listings.",
        },
        { status: 403 },
      );
    }

    const rateLimit = await checkRateLimit({
      key: user.id,
      route: "/api/generate-listing",
      limit: 10,
      windowSeconds: 10 * 60,
    });
    if (!rateLimit.allowed) return rateLimitedResponse;

    const deterministic = deterministicVehicleValidation(parsed.data.vehicle);
    if (!deterministic.canGenerate) {
      return NextResponse.json({ error: true, code: "INPUT_QUALITY", ...deterministic }, { status: 400 });
    }

    const monthKey = currentMonthKey();
    const usageAdmin = getSupabaseAdminClient();
    const { data: usageRecord, error: usageError } = await usageAdmin
      .from("generation_usage")
      .select("*")
      .eq("dealership_id", dealership.id)
      .eq("month_key", monthKey)
      .maybeSingle();

    if (usageError) throw usageError;

    const usageCount = usageRecord?.generation_count ?? 0;
    const planCheck = canGenerateForPlan(dealership, usageCount);

    if (!planCheck.allowed) {
      return NextResponse.json(
        { error: true, code: "PLAN_LIMIT_REACHED", message: planLimitMessage(dealership.subscription_status, planCheck.limit) },
        { status: 402 },
      );
    }

    let quality = deterministic;
    try {
      quality = await analyzeVehicleInputQuality(parsed.data.vehicle);
    } catch {
      quality = deterministic;
    }

    if (quality.status === "contradictory" || quality.status === "nonsense") {
      return NextResponse.json({ error: true, code: "INPUT_QUALITY", ...quality }, { status: 400 });
    }
    const inputQualityWarnings = quality.status === "incomplete"
      ? quality.issues.length
        ? quality.issues
        : [quality.userMessage].filter(Boolean)
      : [];

    const { data: styleProfile } = await supabase
      .from("dealership_style_profiles")
      .select("*")
      .eq("dealership_id", dealership.id)
      .maybeSingle();

    const featureResult = await extractFeatureHighlights(parsed.data.vehicle);
    const featureEnhancedRequest = {
      ...parsed.data,
      vehicle: {
        ...parsed.data.vehicle,
        validatedFeaturesJson: JSON.stringify(featureResult.featureHighlights),
        featureClarificationQuestions: featureResult.featureQuestions.join("\n"),
      },
    };

    const output = await generateVehicleListing(featureEnhancedRequest, styleProfile);
    output.featureHighlights = featureResult.featureHighlights;
    output.featureQuestions = featureResult.featureQuestions;
    const claimRiskAudit = auditListingClaims(parsed.data.vehicle, output);
    output.claimRiskAudit = claimRiskAudit;
    output.reviewWarnings = [
      ...conciseReviewWarnings(parsed.data.vehicle, output.reviewWarnings || [], inputQualityWarnings),
      ...claimRiskAudit.riskClaims.map((claim) => `${claim.claim}: ${claim.reason}`),
    ].slice(0, 6);

    if (usageRecord) {
      const { error: incrementError } = await usageAdmin
        .from("generation_usage")
        .update({
          generation_count: usageCount + 1,
          user_id: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", usageRecord.id);
      if (incrementError) throw incrementError;
    } else {
      const { error: insertUsageError } = await usageAdmin.from("generation_usage").insert({
        dealership_id: dealership.id,
        user_id: user.id,
        month_key: monthKey,
        generation_count: 1,
      });
      if (insertUsageError) throw insertUsageError;
    }

    await trackFeatureEvent(supabase, {
      dealershipId: dealership.id,
      userId: user.id,
      feature: "listing_generator",
      action: "generate",
      route: "/api/generate-listing",
      metadata: {
        platforms: parsed.data.preferences.platforms,
        riskLevel: claimRiskAudit.riskLevel,
        riskScore: claimRiskAudit.score,
      },
    });

    await writeAuditLog(supabase, {
      dealershipId: dealership.id,
      actorUserId: user.id,
      entityType: "listing_generation",
      action: "generated",
      afterData: {
        vehicle: parsed.data.vehicle,
        preferences: parsed.data.preferences,
        riskLevel: claimRiskAudit.riskLevel,
      },
    });

    return NextResponse.json({
      output,
      riskAudit: claimRiskAudit,
      usage: {
        monthKey,
        count: usageCount + 1,
        limit: planCheck.limit,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: true,
        code: "GENERATION_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "ListingFlow could not generate the listing. Please try again.",
      },
      { status: 500 },
    );
  }
}
