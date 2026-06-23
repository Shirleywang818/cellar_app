import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { derivePriceBand } from "@/lib/price";
import { createWineSchema } from "@/lib/schemas";
import { finalizeLabelImage } from "@/lib/storage";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const input = createWineSchema.parse(json);
    const supabase = createServiceClient();
    const photoPath = await finalizeLabelImage(input.photo_path);
    const derivedBand = derivePriceBand(input.cost_per_bottle);
    const priceBand = derivedBand ?? input.price_band ?? null;
    const priceSource = input.cost_per_bottle != null || priceBand ? "user" : "unknown";

    const { data, error } = await supabase.rpc("create_wine_with_purchase_event", {
      p_user_id: env.OWNER_USER_ID,
      p_producer: input.producer,
      p_name: input.name,
      p_vintage: input.vintage ?? null,
      p_wine_type: input.wine_type,
      p_varietals: input.varietals,
      p_region: input.region ?? null,
      p_country: input.country ?? null,
      p_alcohol_pct: input.alcohol_pct ?? null,
      p_quantity: input.quantity,
      p_cost_per_bottle: input.cost_per_bottle ?? null,
      p_price_band: priceBand,
      p_price_source: priceSource,
      p_currency: input.currency,
      p_purchase_date: input.purchase_date ?? null,
      p_location: input.location ?? null,
      p_notes: input.notes ?? null,
      p_photo_path: photoPath,
      p_extraction_meta: input.extraction_meta ?? null,
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ id: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save wine.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
