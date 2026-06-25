import "server-only";
import { updatePreferenceProfile } from "@/lib/ai/gateway";
import { preferenceProfileSchema } from "@/lib/schemas";
import { createServiceClient } from "@/lib/supabase/server";

type RecentTasting = {
  id: string;
  rating: number | null;
  notes: string | null;
  paired_with: string | null;
  tasted_on: string;
  wines: {
    producer: string;
    name: string;
    vintage: number | null;
    wine_type: string;
    varietals: string[];
    region: string | null;
    country: string | null;
    price_band: string | null;
  } | null;
};

export async function getPreferenceProfile(userId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("preference_profiles")
    .select("structured, summary, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load preference profile: ${error.message}`);
  }

  return preferenceProfileSchema.parse(
    data ?? { structured: {}, summary: "", updated_at: null },
  );
}

export async function refreshPreferenceProfile(userId: string) {
  const supabase = createServiceClient();
  const currentProfile = await getPreferenceProfile(userId);

  const { data, error } = await supabase
    .from("tastings")
    .select(
      [
        "id",
        "rating",
        "notes",
        "paired_with",
        "tasted_on",
        "wines(producer, name, vintage, wine_type, varietals, region, country, price_band)",
      ].join(", "),
    )
    .eq("user_id", userId)
    .order("tasted_on", { ascending: false })
    .limit(30);

  if (error) {
    throw new Error(`Failed to load recent tastings: ${error.message}`);
  }

  const result = await updatePreferenceProfile({
    currentProfile,
    tastings: (data ?? []).map(normalizeRecentTasting),
  });

  const { error: upsertError } = await supabase
    .from("preference_profiles")
    .upsert({
      user_id: userId,
      structured: result.structured,
      summary: result.summary,
      updated_at: new Date().toISOString(),
    });

  if (upsertError) {
    throw new Error(`Failed to update preference profile: ${upsertError.message}`);
  }

  return result;
}

function normalizeRecentTasting(value: unknown) {
  const tasting = value as RecentTasting;
  const wine = Array.isArray(tasting.wines) ? tasting.wines[0] : tasting.wines;

  return {
    rating: tasting.rating,
    notes: tasting.notes,
    paired_with: tasting.paired_with,
    tasted_on: tasting.tasted_on,
    wine: wine
      ? {
          producer: wine.producer,
          name: wine.name,
          vintage: wine.vintage,
          wine_type: wine.wine_type,
          varietals: wine.varietals ?? [],
          region: wine.region,
          country: wine.country,
          price_band: wine.price_band,
        }
      : null,
  };
}
