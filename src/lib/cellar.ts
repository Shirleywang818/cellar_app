import "server-only";
import { env } from "@/lib/env";
import {
  wineDetailSchema,
  wineListItemSchema,
  type WineType,
} from "@/lib/schemas";
import { createServiceClient } from "@/lib/supabase/server";
import { createSignedLabelUrl } from "@/lib/storage";

export type WineListFilters = {
  query?: string;
  wineType?: WineType | "all";
  stock?: "all" | "in_stock" | "empty";
};

export async function listWines(filters: WineListFilters = {}) {
  const supabase = createServiceClient();

  let query = supabase
    .from("wines")
    .select(
      "id, producer, name, vintage, wine_type, region, country, quantity, price_band, photo_path",
    )
    .eq("user_id", env.OWNER_USER_ID);

  if (filters.query) {
    const term = filters.query.trim().replaceAll(",", " ");
    if (term) {
      query = query.or(
        [
          `producer.ilike.%${term}%`,
          `name.ilike.%${term}%`,
          `region.ilike.%${term}%`,
          `country.ilike.%${term}%`,
        ].join(","),
      );
    }
  }

  if (filters.wineType && filters.wineType !== "all") {
    query = query.eq("wine_type", filters.wineType);
  }

  if (filters.stock === "in_stock") {
    query = query.gt("quantity", 0);
  } else if (filters.stock === "empty") {
    query = query.eq("quantity", 0);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

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

export async function getWine(id: string) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("wines")
    .select("*, inventory_events(*), tastings(*)")
    .eq("user_id", env.OWNER_USER_ID)
    .eq("id", id)
    .order("created_at", {
      ascending: false,
      foreignTable: "inventory_events",
    })
    .order("tasted_on", {
      ascending: false,
      foreignTable: "tastings",
    })
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }

    throw new Error(`Failed to load wine: ${error.message}`);
  }

  const wine = wineDetailSchema.parse(data);

  return {
    ...wine,
    photo_url: await createSignedLabelUrl(wine.photo_path),
  };
}

export const listSeededWines = listWines;
