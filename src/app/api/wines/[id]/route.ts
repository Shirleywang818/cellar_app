import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { derivePriceBand } from "@/lib/price";
import { updateWineSchema } from "@/lib/schemas";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("wines")
      .select("*, inventory_events(*)")
      .eq("user_id", env.OWNER_USER_ID)
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: "Wine not found." }, { status: 404 });
    }

    return NextResponse.json({ wine: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load wine.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const json = await request.json();
    const input = updateWineSchema.parse(json);
    const supabase = createServiceClient();
    const derivedBand = derivePriceBand(input.cost_per_bottle);
    const priceBand = derivedBand ?? input.price_band ?? null;
    const priceSource = input.cost_per_bottle != null || priceBand ? "user" : "unknown";

    const { error } = await supabase
      .from("wines")
      .update({
        producer: input.producer,
        name: input.name,
        vintage: input.vintage ?? null,
        wine_type: input.wine_type,
        varietals: input.varietals,
        region: input.region ?? null,
        country: input.country ?? null,
        alcohol_pct: input.alcohol_pct ?? null,
        cost_per_bottle: input.cost_per_bottle ?? null,
        price_band: priceBand,
        price_source: priceSource,
        currency: input.currency,
        purchase_date: input.purchase_date ?? null,
        location: input.location ?? null,
        notes: input.notes ?? null,
      })
      .eq("user_id", env.OWNER_USER_ID)
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update wine.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("wines")
      .delete()
      .eq("user_id", env.OWNER_USER_ID)
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete wine.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
