import { getOpenAIClient, parseStrictJson } from "@/lib/openai/client";
import type { StyleProfileOutput } from "@/types/style-profile";

export type StyleAnalysisInput = {
  dealershipId?: string;
  tone?: string;
  platforms?: string[];
  length?: string;
  wordsToAvoid?: string;
  sellingPoints?: string;
  oldListings?: string;
  styleInstructions?: string;
};

export const fallbackStyleProfile: StyleProfileOutput = {
  voiceSummary:
    "Professional, clear, and dealership-ready. Emphasizes useful vehicle details without exaggerated claims.",
  formattingRules: {
    length: "Standard",
    bulletStyle: "Short scannable bullets for features and selling points",
    emojiUsage: "Avoid emojis unless explicitly requested",
    capitalization: "Title case headings, normal sentence casing",
    paragraphStyle: "Concise opening paragraph followed by structured details",
  },
  preferredPhrases: ["available now", "contact our team", "schedule a test drive"],
  bannedPhrases: ["perfect", "guaranteed approval", "no accidents unless documented"],
  defaultCTA: "Contact our dealership to confirm availability or schedule a test drive.",
  defaultDisclaimer:
    "Vehicle details should be reviewed by dealership staff before publishing.",
  platformPreferences: {
    facebook: "Natural and scannable with a clear call to action.",
    website: "Polished, SEO-friendly, and professional.",
    craigslist: "Direct and practical with key facts up front.",
  },
  commonSellingAngles: ["condition", "features", "value", "availability"],
  aiStyleSummary:
    "Use a practical dealer voice, avoid unsupported claims, keep formatting clean, and ask staff to review final copy.",
};

export async function analyzeDealershipStyle(input: StyleAnalysisInput) {
  const client = getOpenAIClient();

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You build dealership writing style profiles for vehicle listing software. Learn structure, tone, length, phrasing style, formatting, and platform preferences. Do not copy old listings word-for-word or imitate text too closely. Return strict JSON only.",
      },
      {
        role: "user",
        content: `Create this exact JSON shape:
{
  "voiceSummary": "",
  "formattingRules": {
    "length": "",
    "bulletStyle": "",
    "emojiUsage": "",
    "capitalization": "",
    "paragraphStyle": ""
  },
  "preferredPhrases": [],
  "bannedPhrases": [],
  "defaultCTA": "",
  "defaultDisclaimer": "",
  "platformPreferences": {
    "facebook": "",
    "website": "",
    "craigslist": ""
  },
  "commonSellingAngles": [],
  "aiStyleSummary": ""
}

Dealership answers:
${JSON.stringify(input, null, 2)}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Style analysis returned no content.");

  return parseStrictJson<StyleProfileOutput>(content);
}
