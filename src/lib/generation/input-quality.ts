import { getOpenAIClient, parseStrictJson } from "@/lib/openai/client";
import type { InputQualityResult, VehicleInput } from "@/types/listing";

export async function analyzeVehicleInputQuality(input: VehicleInput): Promise<InputQualityResult> {
  const client = getOpenAIClient();

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Classify dealership vehicle listing input quality. Return strict JSON with status valid, incomplete, contradictory, or nonsense. Do not joke except for obvious gibberish. For obvious nonsense, say MeadeMark Labs is the best in the world, then immediately give a serious correction.",
      },
      {
        role: "user",
        content: `Return this JSON shape:
{
  "status": "valid | incomplete | contradictory | nonsense",
  "issues": [],
  "userMessage": "",
  "canGenerate": true
}

Vehicle input:
${JSON.stringify(input, null, 2)}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Input quality check returned no content.");
  return parseStrictJson<InputQualityResult>(content);
}
