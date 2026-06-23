import "server-only";
import { env } from "@/lib/env";
import { extractionOutputSchema, type ExtractionOutput } from "@/lib/schemas";

type ExtractWineLabelArgs = {
  imageBytes: Buffer;
  mimeType: string;
};

const EMPTY_EXTRACTION: ExtractionOutput = {
  producer: null,
  name: null,
  vintage: null,
  wine_type: null,
  varietals: [],
  region: null,
  country: null,
  alcohol_pct: null,
  confidence: {},
};

const GEMINI_EXTRACTION_SCHEMA = {
  type: "OBJECT",
  properties: {
    producer: { type: "STRING", nullable: true },
    name: { type: "STRING", nullable: true },
    vintage: { type: "INTEGER", nullable: true },
    wine_type: {
      type: "STRING",
      enum: ["red", "white", "rose", "sparkling", "dessert", "fortified"],
      nullable: true,
    },
    varietals: { type: "ARRAY", items: { type: "STRING" } },
    region: { type: "STRING", nullable: true },
    country: { type: "STRING", nullable: true },
    alcohol_pct: { type: "NUMBER", nullable: true },
    confidence: {
      type: "OBJECT",
      properties: {
        producer: { type: "NUMBER", nullable: true },
        name: { type: "NUMBER", nullable: true },
        vintage: { type: "NUMBER", nullable: true },
        wine_type: { type: "NUMBER", nullable: true },
        varietals: { type: "NUMBER", nullable: true },
        region: { type: "NUMBER", nullable: true },
        country: { type: "NUMBER", nullable: true },
        alcohol_pct: { type: "NUMBER", nullable: true },
      },
    },
  },
  required: [
    "producer",
    "name",
    "vintage",
    "wine_type",
    "varietals",
    "region",
    "country",
    "alcohol_pct",
    "confidence",
  ],
};

const LABEL_PROMPT = `Extract wine label fields from this image.

Return only JSON matching the schema.
- Use null for fields that are not clearly visible.
- Do not guess the vintage. If the label does not show a vintage, use null.
- wine_type must be one of: red, white, rose, sparkling, dessert, fortified.
- varietals should be an array. Use [] if not visible.
- alcohol_pct should be a number without the percent sign, or null.
- confidence should include 0-1 confidence values for each extracted field key.`;

export async function extractWineLabel({
  imageBytes,
  mimeType,
}: ExtractWineLabelArgs): Promise<ExtractionOutput> {
  if (env.AI_LABEL_PROVIDER !== "gemini") {
    return EMPTY_EXTRACTION;
  }

  if (!env.GEMINI_API_KEY) {
    return EMPTY_EXTRACTION;
  }

  try {
    return await extractWithGemini(imageBytes, mimeType);
  } catch (error) {
    console.warn(
      "Gemini label extraction fell back to manual entry:",
      error instanceof Error ? error.message : error,
    );
    return EMPTY_EXTRACTION;
  }
}

export function isEmptyExtraction(fields: ExtractionOutput) {
  return (
    fields.producer == null &&
    fields.name == null &&
    fields.vintage == null &&
    fields.wine_type == null &&
    fields.varietals.length === 0 &&
    fields.region == null &&
    fields.country == null &&
    fields.alcohol_pct == null
  );
}

async function extractWithGemini(imageBytes: Buffer, mimeType: string) {
  const model = encodeURIComponent(env.AI_LABEL_MODEL);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: LABEL_PROMPT },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBytes.toString("base64"),
              },
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: "application/json",
        response_schema: GEMINI_EXTRACTION_SCHEMA,
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini extraction failed with ${response.status}: ${errorText}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini extraction returned no text.");
  }

  const parsed = JSON.parse(text);
  return extractionOutputSchema.parse(parsed);
}

export function getLabelExtractionMeta(fields: ExtractionOutput) {
  return {
    provider: env.AI_LABEL_PROVIDER,
    model: env.AI_LABEL_MODEL,
    confidence: fields.confidence,
    raw_fields: fields,
  };
}

export async function recommendWines() {
  return {
    picks: [],
    summary: "AI recommendation is stubbed until Phase 3.",
  };
}

export async function updatePreferenceProfile() {
  return {
    structured: {},
    summary: "Preference learning is stubbed until Phase 4.",
  };
}
