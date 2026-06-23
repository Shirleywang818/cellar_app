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

    const { data, error } = await supabase
      .from("wines")
      .insert({
        user_id: env.OWNER_USER_ID,
        producer: input.producer,
        name: input.name,
        vintage: input.vintage ?? null,
        wine_type: input.wine_type,
        varietals: input.varietals,
        region: input.region ?? null,
        country: input.country ?? null,
        alcohol_pct: input.alcohol_pct ?? null,
        quantity: input.quantity,
        cost_per_bottle: input.cost_per_bottle ?? null,
        price_band: priceBand,
        price_source: priceSource,
        currency: input.currency,
        purchase_date: input.purchase_date ?? null,
        location: input.location ?? null,
        notes: input.notes ?? null,
        photo_path: photoPath,
        extraction_meta: input.extraction_meta ?? null,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ id: data.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save wine.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
