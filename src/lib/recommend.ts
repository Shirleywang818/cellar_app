import "server-only";
import { env } from "@/lib/env";
import { formatPriceBand, formatWineTitle } from "@/lib/format";
import {
  priceBandSchema,
  type CreateRecommendationInput,
  type PriceBand,
} from "@/lib/schemas";
import { createServiceClient } from "@/lib/supabase/server";

type RawCandidate = {
  id: string;
  producer: string;
  name: string;
  vintage: number | null;
  wine_type: string;
  varietals: string[];
  region: string | null;
  country: string | null;
  quantity: number;
  cost_per_bottle: number | null;
  price_band: PriceBand | null;
  currency: string;
  created_at: string;
};

export type RecommendationCandidate = {
  id: string;
  title: string;
  producer: string;
  name: string;
  vintage: number | null;
  wine_type: string;
  varietals: string[];
  region: string | null;
  country: string | null;
  quantity: number;
  price_label: string;
  price_known: boolean;
  price_kind: "exact" | "band" | "unknown";
};

export type CandidateAssembly = {
  candidates: RecommendationCandidate[];
  totalInStock: number;
  truncated: boolean;
};

type Budget = Pick<CreateRecommendationInput, "budget_min" | "budget_max">;

const MAX_CANDIDATES = 40;

const PRICE_BAND_RANGES: Record<PriceBand, { min: number; max: number | null }> = {
  under_100: { min: 0, max: 100 },
  "101_200": { min: 101, max: 200 },
  "201_300": { min: 201, max: 300 },
  "301_500": { min: 301, max: 500 },
  "500_plus": { min: 501, max: null },
};

export async function assembleRecommendationCandidates(
  budget: Budget,
): Promise<CandidateAssembly> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("wines")
    .select(
      [
        "id",
        "producer",
        "name",
        "vintage",
        "wine_type",
        "varietals",
        "region",
        "country",
        "quantity",
        "cost_per_bottle",
        "price_band",
        "currency",
        "created_at",
      ].join(", "),
    )
    .eq("user_id", env.OWNER_USER_ID)
    .gt("quantity", 0)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to assemble recommendation candidates: ${error.message}`);
  }

  const rows = (data ?? []).map(parseRawCandidate);
  const filtered = rows.filter((candidate) => isWithinBudget(candidate, budget));
  const candidates = filtered.slice(0, MAX_CANDIDATES).map(toCandidate);

  return {
    candidates,
    totalInStock: rows.length,
    truncated: filtered.length > MAX_CANDIDATES,
  };
}

export async function getPreferenceSummary() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("preference_profiles")
    .select("summary")
    .eq("user_id", env.OWNER_USER_ID)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load preference summary: ${error.message}`);
  }

  return data?.summary ?? "";
}

export function hydrateRecommendationPick(
  candidate: RecommendationCandidate,
  pick: { rank: number; fit_score: number; rationale: string },
) {
  return {
    ...pick,
    wine_id: candidate.id,
    wine: candidate,
  };
}

function parseRawCandidate(value: unknown): RawCandidate {
  const candidate = value as RawCandidate;
  const parsedBand = priceBandSchema.nullable().parse(candidate.price_band);

  return {
    ...candidate,
    price_band: parsedBand,
    varietals: candidate.varietals ?? [],
  };
}

function toCandidate(wine: RawCandidate): RecommendationCandidate {
  const exactPrice = wine.cost_per_bottle;
  const hasExactPrice = exactPrice != null;
  const priceKind = hasExactPrice ? "exact" : wine.price_band ? "band" : "unknown";

  return {
    id: wine.id,
    title: formatWineTitle(wine),
    producer: wine.producer,
    name: wine.name,
    vintage: wine.vintage,
    wine_type: wine.wine_type,
    varietals: wine.varietals,
    region: wine.region,
    country: wine.country,
    quantity: wine.quantity,
    price_label: hasExactPrice
      ? `${wine.currency} ${exactPrice.toFixed(2)}`
      : formatPriceBand(wine.price_band),
    price_known: hasExactPrice || wine.price_band != null,
    price_kind: priceKind,
  };
}

function isWithinBudget(wine: RawCandidate, budget: Budget) {
  const min = budget.budget_min ?? null;
  const max = budget.budget_max ?? null;

  if (min == null && max == null) {
    return true;
  }

  if (wine.cost_per_bottle != null) {
    return isValueWithinRange(wine.cost_per_bottle, min, max);
  }

  if (wine.price_band) {
    return doesBandOverlapBudget(wine.price_band, min, max);
  }

  return true;
}

function isValueWithinRange(value: number, min: number | null, max: number | null) {
  return (min == null || value >= min) && (max == null || value <= max);
}

function doesBandOverlapBudget(priceBand: PriceBand, min: number | null, max: number | null) {
  const band = PRICE_BAND_RANGES[priceBand];
  const bandMax = band.max ?? Number.POSITIVE_INFINITY;
  const budgetMin = min ?? 0;
  const budgetMax = max ?? Number.POSITIVE_INFINITY;

  return band.min <= budgetMax && bandMax >= budgetMin;
}
