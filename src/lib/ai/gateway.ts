import "server-only";
import { env } from "@/lib/env";
import type { RecommendationCandidate } from "@/lib/recommend";
import {
  extractionOutputSchema,
  parseRecommendationResult,
  type ExtractionOutput,
  type RecommendationResult,
} from "@/lib/schemas";

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

export type RecommendWinesArgs = {
  occasion: string;
  cuisine: string;
  budget: {
    min: number | null;
    max: number | null;
  };
  candidates: RecommendationCandidate[];
  preferenceSummary: string;
};

export type RecommendWinesResult = RecommendationResult & {
  fallback: boolean;
  error: string | null;
};

function truncate(value: string, max = 2000) {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

// Guard the shared AI_REC_MODEL against a provider mismatch: if the configured model
// id clearly doesn't belong to the active provider (e.g. a Gemini id while talking to
// DeepSeek), fall back to that provider's known-good default instead of sending it.
const REC_MODEL_DEFAULTS: Record<string, string> = {
  gemini: "gemini-2.5-flash",
  deepseek: "deepseek-chat",
};

function resolveRecModel(provider: string) {
  const configured = env.AI_REC_MODEL;
  if (configured.startsWith(provider)) {
    return configured;
  }
  const fallback = REC_MODEL_DEFAULTS[provider];
  if (fallback) {
    console.warn(
      `AI_REC_MODEL="${configured}" does not match provider "${provider}"; using "${fallback}".`,
    );
    return fallback;
  }
  return configured;
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

const GEMINI_RECOMMENDATION_SCHEMA = {
  type: "OBJECT",
  properties: {
    picks: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          wine_id: { type: "STRING" },
          rank: { type: "INTEGER" },
          fit_score: { type: "NUMBER" },
          rationale: { type: "STRING" },
        },
        required: ["wine_id", "rank", "fit_score", "rationale"],
      },
    },
    summary: { type: "STRING" },
    no_strong_match: { type: "BOOLEAN" },
  },
  required: ["picks", "summary", "no_strong_match"],
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

export async function recommendWines(args: RecommendWinesArgs): Promise<RecommendWinesResult> {
  if (args.candidates.length === 0) {
    return {
      picks: [],
      summary: "No in-stock cellar candidates matched this request.",
      no_strong_match: true,
      fallback: false,
      error: null,
    };
  }

  if (env.AI_REC_PROVIDER === "deepseek" && !env.DEEPSEEK_API_KEY) {
    return {
      picks: [],
      summary: "DeepSeek is not configured yet. Add DEEPSEEK_API_KEY to enable recommendations.",
      no_strong_match: true,
      fallback: true,
      error: "missing DEEPSEEK_API_KEY",
    };
  }

  if (env.AI_REC_PROVIDER === "gemini" && !env.GEMINI_API_KEY) {
    return {
      picks: [],
      summary: "Gemini is not configured yet. Add GEMINI_API_KEY to enable recommendations.",
      no_strong_match: true,
      fallback: true,
      error: "missing GEMINI_API_KEY",
    };
  }

  try {
    return await recommendWithRetry(args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`${env.AI_REC_PROVIDER} recommendation fell back:`, message);
    return {
      picks: [],
      summary: "Could not generate recommendations right now. Please try again.",
      no_strong_match: true,
      fallback: true,
      error: truncate(message, 300),
    };
  }
}

export async function updatePreferenceProfile() {
  return {
    structured: {},
    summary: "Preference learning is stubbed until Phase 4.",
  };
}

async function recommendWithRetry(args: RecommendWinesArgs) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await recommendWithProvider(args);
      return {
        ...result,
        fallback: false,
        error: null,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function recommendWithProvider(args: RecommendWinesArgs) {
  if (env.AI_REC_PROVIDER === "deepseek") {
    return recommendWithDeepSeek(args);
  }

  if (env.AI_REC_PROVIDER === "gemini") {
    return recommendWithGemini(args);
  }

  throw new Error(`Recommendation provider "${env.AI_REC_PROVIDER}" is not configured.`);
}

function buildRecommendationPayload(args: RecommendWinesArgs) {
  return {
    contract: {
      picks: [
        {
          wine_id: "candidate uuid",
          rank: 1,
          fit_score: 0.86,
          rationale: "one paragraph",
        },
      ],
      summary: "short overall summary",
      no_strong_match: false,
    },
    rules: [
      "Return at most 3 picks, ranked best-first.",
      "Use only candidate ids from candidates[].id.",
      "fit_score must be between 0 and 1.",
      "Explain the fit to cuisine, occasion, and preference_summary when available.",
      "Respect the requested budget. Unknown-price wines may be suggested, but call out the unknown price in the rationale.",
      "If nothing is a strong fit, set no_strong_match true and return the closest option with an honest caveat.",
    ],
    request: {
      occasion: args.occasion,
      cuisine: args.cuisine,
      budget: args.budget,
      preference_summary: args.preferenceSummary,
      candidates: args.candidates,
    },
  };
}

async function recommendWithDeepSeek(args: RecommendWinesArgs): Promise<RecommendationResult> {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: resolveRecModel("deepseek"),
      messages: [
        {
          role: "system",
          content: [
            "You are a sommelier recommending from a fixed list of bottles the user owns.",
            "Only choose from the provided candidate ids. Never invent wines.",
            "Return strict JSON only.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify(buildRecommendationPayload(args)),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek recommendation failed with ${response.status}: ${errorText}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = payload.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("DeepSeek recommendation returned no content.");
  }

  const parsed = JSON.parse(text);
  return parseRecommendationResult(parsed);
}

async function recommendWithGemini(args: RecommendWinesArgs): Promise<RecommendationResult> {
  const model = encodeURIComponent(resolveRecModel("gemini"));
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
            {
              text: [
                "You are a sommelier recommending from a fixed list of bottles the user owns.",
                "Only choose from the provided candidate ids. Never invent wines.",
                "Return strict JSON matching the response schema.",
                JSON.stringify(buildRecommendationPayload(args)),
              ].join("\n\n"),
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: "application/json",
        response_schema: GEMINI_RECOMMENDATION_SCHEMA,
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini recommendation failed with ${response.status}: ${errorText}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini recommendation returned no text.");
  }

  const parsed = JSON.parse(text);
  return parseRecommendationResult(parsed);
}
