import { getOpenAIClient, parseStrictJson } from "@/lib/openai/client";
import type { ListingGenerationRequest, ListingOutput } from "@/types/listing";
import type { DealershipStyleProfile } from "@/types/style-profile";

export async function generateVehicleListing(
  request: ListingGenerationRequest,
  styleProfile: DealershipStyleProfile | null,
) {
  const client = getOpenAIClient();
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const completion = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: attempt === 0 ? 0.45 : 0.25,
        response_format: { type: "json_object" },
        messages: [
      {
        role: "system",
        content:
          "You are a professional automotive listing copywriter for independent dealerships. Write accurate, clean, platform-ready vehicle listings using only the provided information. Follow the dealership’s saved style profile when available. Do not invent vehicle features, history, warranty, title status, accident status, ownership history, financing terms, or condition claims. Write strong but honest sales copy. Make the listing sound human and dealership-ready, not like generic AI output.",
      },
      {
        role: "user",
        content: `Return strict JSON exactly matching:
{
  "title": "",
  "shortTitle": "",
  "facebookListing": "",
  "carGurusListing": "",
  "websiteDescription": "",
  "craigslistListing": "",
  "autoTraderStyleDescription": "",
  "highlights": [],
  "features": [],
  "conditionNote": "",
  "seoTitle": "",
  "seoMetaDescription": "",
  "salesAngle": "",
  "disclaimer": "",
  "reviewWarnings": [],
  "featureHighlights": [],
  "featureQuestions": [],
  "copyBlocks": {
    "facebook": {"title":"","price":"","description":"","features":[],"condition":"","cta":"","disclaimer":""},
    "cargurus": {"title":"","price":"","description":"","features":[],"condition":"","cta":"","disclaimer":""},
    "website": {"title":"","price":"","description":"","features":[],"condition":"","cta":"","disclaimer":""}
  }
}

Generation rules:
- Never invent specs.
- VIN decoded fields may be used only as provided in the request. Do not add specs beyond decoded or staff-entered fields.
- Vehicle intelligence, safety, recall, and value notes may be used only when supplied in the request. NHTSA recall lookup does not prove whether recalls are open or completed.
- If validatedFeaturesJson is supplied, use those features as the feature source of truth. Do not upgrade unsure features to confirmed.
- Only confirmed features may appear in public-facing listing copy. Keep likely, unsure, and ask_user features in featureHighlights, featureQuestions, and reviewWarnings until staff confirms them.
- Feature highlights must be machine-readable objects with label, status, source, reason, and optional question.
- If a feature status is unsure or ask_user, keep uncertainty clear in reviewWarnings and featureQuestions.
- Never invent warranty, accident history, service history, ownership history, financing terms, or title status.
- Never say "clean title" unless provided.
- Never say "one-owner" unless provided.
- Never say "no accidents" unless provided.
- Never say "fully loaded" unless enough features justify it.
- Never say "perfect condition" unless explicitly provided.
- Avoid overhyped or scammy phrases.
- Include review warnings for missing or sensitive details.
- Encourage human review before publishing.

Platform behavior:
Facebook: natural, scannable, strong opening, bullets allowed, clear CTA.
CarGurus: concise, factual, inventory-focused, easy to scan, no unsupported claims or excessive formatting.
Website: polished, professional, SEO-friendly, no excessive hype.
Craigslist: direct, practical, simple, clear details.
SEO: short, searchable, clean.

Request:
${JSON.stringify(request, null, 2)}

Saved dealership style profile:
${request.preferences.useStyleProfile ? JSON.stringify(styleProfile, null, 2) : "Not used for this generation."}`,
      },
        ],
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error("Listing generation returned no content.");
      return parseStrictJson<ListingOutput>(content);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Listing generation could not complete.");
}
