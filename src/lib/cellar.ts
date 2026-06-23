import "server-only";
import { env } from "@/lib/env";
import { wineListItemSchema } from "@/lib/schemas";
import { createServiceClient } from "@/lib/supabase/server";
import { createSignedLabelUrl } from "@/lib/storage";

export async function listWines() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("wines")
    .select(
      "id, producer, name, vintage, wine_type, region, country, quantity, price_band, photo_path",
    )
    .eq("user_id", env.OWNER_USER_ID)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load wines: ${error.message}`);
  }

  const wines = wineListItemSchema.array().parse(data);

  return Promise.all(
    wines.map(async (wine) => ({
      ...wine,
      photo_url: await createSignedLabelUrl(wine.photo_path),
    })),
  );
}

export const listSeededWines = listWines;
