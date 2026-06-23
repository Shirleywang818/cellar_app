import "server-only";
import { env } from "@/lib/env";
import { wineListItemSchema } from "@/lib/schemas";
import { createServiceClient } from "@/lib/supabase/server";

export async function listSeededWines() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("wines")
    .select(
      "id, producer, name, vintage, wine_type, region, country, quantity, price_band",
    )
    .eq("user_id", env.OWNER_USER_ID)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load wines: ${error.message}`);
  }

  return wineListItemSchema.array().parse(data);
}
