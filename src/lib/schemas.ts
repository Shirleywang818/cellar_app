import { z } from "zod";

export const priceBandSchema = z.enum([
  "under_100",
  "101_200",
  "201_300",
  "301_500",
  "500_plus",
]);

export type PriceBand = z.infer<typeof priceBandSchema>;

export const priceSourceSchema = z.enum(["user", "web_estimate", "unknown"]);

export const inventoryEventTypeSchema = z.enum([
  "purchase",
  "adjustment",
  "consume",
]);

export type InventoryEventType = z.infer<typeof inventoryEventTypeSchema>;

export const wineTypeSchema = z.enum([
  "red",
  "white",
  "rose",
  "sparkling",
  "dessert",
  "fortified",
]);

export type WineType = z.infer<typeof wineTypeSchema>;

export const wineListItemSchema = z.object({
  id: z.string().uuid(),
  producer: z.string(),
  name: z.string(),
  vintage: z.number().int().nullable(),
  wine_type: wineTypeSchema,
  region: z.string().nullable(),
  country: z.string().nullable(),
  quantity: z.number().int().nonnegative(),
  price_band: priceBandSchema.nullable(),
  photo_path: z.string().nullable(),
  photo_url: z.string().url().nullable().optional(),
});

export type WineListItem = z.infer<typeof wineListItemSchema>;

export const inventoryEventSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  wine_id: z.string().uuid(),
  event_type: inventoryEventTypeSchema,
  quantity_delta: z.number().int(),
  note: z.string().nullable(),
  source: z.string().nullable(),
  created_at: z.string(),
});

export type InventoryEvent = z.infer<typeof inventoryEventSchema>;

export const wineDetailSchema = wineListItemSchema.extend({
  user_id: z.string().uuid(),
  varietals: z.array(z.string()),
  alcohol_pct: z.number().nullable(),
  cost_per_bottle: z.number().nullable(),
  price_source: priceSourceSchema.nullable(),
  currency: z.string(),
  purchase_date: z.string().nullable(),
  location: z.string().nullable(),
  notes: z.string().nullable(),
  extraction_meta: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  inventory_events: z.array(inventoryEventSchema).default([]),
});

export type WineDetail = z.infer<typeof wineDetailSchema>;

export const extractionOutputSchema = z.object({
  producer: z.string().nullable(),
  name: z.string().nullable(),
  vintage: z.number().int().nullable(),
  wine_type: wineTypeSchema.nullable(),
  varietals: z.array(z.string()).default([]),
  region: z.string().nullable(),
  country: z.string().nullable(),
  alcohol_pct: z.number().nullable(),
  confidence: z.record(z.string(), z.number().min(0).max(1)).default({}),
});

export type ExtractionOutput = z.infer<typeof extractionOutputSchema>;

const optionalTextSchema = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .optional();

export const createWineSchema = z
  .object({
    producer: z.string().trim().min(1, "Producer is required."),
    name: z.string().trim().min(1, "Name is required."),
    vintage: z.number().int().min(1000).max(9999).nullable().optional(),
    wine_type: wineTypeSchema,
    varietals: z.array(z.string().trim().min(1)).default([]),
    region: optionalTextSchema,
    country: optionalTextSchema,
    alcohol_pct: z.number().min(0).max(100).nullable().optional(),
    quantity: z.number().int().min(0).default(1),
    cost_per_bottle: z.number().min(0).nullable().optional(),
    price_band: priceBandSchema.nullable().optional(),
    currency: z.string().trim().min(1).default("USD"),
    purchase_date: optionalTextSchema,
    location: optionalTextSchema,
    notes: optionalTextSchema,
    photo_path: optionalTextSchema,
    extraction_meta: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .transform((value) => ({
    ...value,
    price_source: value.cost_per_bottle != null
      ? "user"
      : value.price_band
        ? "user"
        : "unknown",
  }));

export type CreateWineInput = z.infer<typeof createWineSchema>;

export const updateWineSchema = z.object({
  producer: z.string().trim().min(1, "Producer is required."),
  name: z.string().trim().min(1, "Name is required."),
  vintage: z.number().int().min(1000).max(9999).nullable().optional(),
  wine_type: wineTypeSchema,
  varietals: z.array(z.string().trim().min(1)).default([]),
  region: optionalTextSchema,
  country: optionalTextSchema,
  alcohol_pct: z.number().min(0).max(100).nullable().optional(),
  cost_per_bottle: z.number().min(0).nullable().optional(),
  price_band: priceBandSchema.nullable().optional(),
  currency: z.string().trim().min(1).default("USD"),
  purchase_date: optionalTextSchema,
  location: optionalTextSchema,
  notes: optionalTextSchema,
});

export type UpdateWineInput = z.infer<typeof updateWineSchema>;

export const createInventoryEventSchema = z.object({
  event_type: inventoryEventTypeSchema,
  quantity_delta: z.number().int().refine((value) => value !== 0, {
    message: "Quantity change cannot be 0.",
  }),
  note: optionalTextSchema,
  source: optionalTextSchema,
});

export type CreateInventoryEventInput = z.infer<typeof createInventoryEventSchema>;

const optionalNumberSchema = z
  .number()
  .min(0)
  .nullable()
  .optional();

export const createRecommendationSchema = z
  .object({
    occasion: z.string().trim().min(1, "Occasion is required."),
    cuisine: z.string().trim().min(1, "Cuisine is required."),
    budget_min: optionalNumberSchema,
    budget_max: optionalNumberSchema,
  })
  .refine(
    (value) =>
      value.budget_min == null ||
      value.budget_max == null ||
      value.budget_min <= value.budget_max,
    {
      message: "Minimum budget must be less than or equal to maximum budget.",
      path: ["budget_min"],
    },
  );

export type CreateRecommendationInput = z.infer<typeof createRecommendationSchema>;

export const recommendationPickSchema = z.object({
  wine_id: z.string().uuid(),
  rank: z.number().int().min(1),
  fit_score: z.number().min(0).max(1),
  rationale: z.string().trim().min(1),
});

export type RecommendationPick = z.infer<typeof recommendationPickSchema>;

export const recommendationResultSchema = z.object({
  picks: z.array(recommendationPickSchema).max(3),
  summary: z.string().trim().min(1),
  no_strong_match: z.boolean(),
});

export type RecommendationResult = z.infer<typeof recommendationResultSchema>;

export const acceptRecommendationSchema = z.object({
  accepted_wine_id: z.string().uuid(),
});

export type AcceptRecommendationInput = z.infer<typeof acceptRecommendationSchema>;

export const extractWineResponseSchema = z.object({
  fields: extractionOutputSchema,
  photo_path: z.string(),
  extraction_meta: z.record(z.string(), z.unknown()),
  fallback: z.boolean(),
});

export type ExtractWineResponse = z.infer<typeof extractWineResponseSchema>;
