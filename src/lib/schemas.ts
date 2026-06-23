import { z } from "zod";

export const priceBandSchema = z.enum([
  "under_100",
  "101_200",
  "201_300",
  "301_500",
  "500_plus",
]);

export type PriceBand = z.infer<typeof priceBandSchema>;

export const wineTypeSchema = z.enum([
  "red",
  "white",
  "rose",
  "sparkling",
  "dessert",
  "fortified",
]);

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
});

export type WineListItem = z.infer<typeof wineListItemSchema>;

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
