import "server-only";
import { env } from "@/lib/env";
import { extractionOutputSchema, type ExtractionOutput } from "@/lib/schemas";

type ExtractWineLabelArgs = {
  imageBytes: Buffer;
  mimeType: string;
};

export type ExtractWineLabelResult = {
  fields: ExtractionOutput;
  raw_text: string | null;
  fallback: boolean;
  error: string | null;
};

function truncate(value: string, max = 2000) {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

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
}: ExtractWineLabelArgs): Promise<ExtractWineLabelResult> {
  if (env.AI_LABEL_PROVIDER !== "gemini") {
    return {
      fields: EMPTY_EXTRACTION,
      raw_text: null,
      fallback: true,
      error: `label provider "${env.AI_LABEL_PROVIDER}" not configured`,
    };
  }

  if (!env.GEMINI_API_KEY) {
    return {
      fields: EMPTY_EXTRACTION,
      raw_text: null,
      fallback: true,
      error: "missing GEMINI_API_KEY",
    };
  }

  try {
    const { fields, rawText } = await extractWithGemini(imageBytes, mimeType);
    return { fields, raw_text: truncate(rawText), fallback: false, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("Gemini label extraction fell back to manual entry:", message);
    return {
      fields: EMPTY_EXTRACTION,
      raw_text: null,
      fallback: true,
      error: truncate(message, 300),
    };
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
  return { fields: extractionOutputSchema.parse(parsed), rawText: text };
}

export function getLabelExtractionMeta(result: ExtractWineLabelResult) {
  return {
    provider: env.AI_LABEL_PROVIDER,
    model: env.AI_LABEL_MODEL,
    confidence: result.fields.confidence,
    raw_text: result.raw_text,
    fallback: result.fallback,
    error: result.error,
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
