import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createInventoryEventSchema } from "@/lib/schemas";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const json = await request.json();
    const input = createInventoryEventSchema.parse(json);
    const supabase = createServiceClient();

    const { data, error } = await supabase.rpc("apply_inventory_event", {
      p_user_id: env.OWNER_USER_ID,
      p_wine_id: id,
      p_event_type: input.event_type,
      p_quantity_delta: input.quantity_delta,
      p_note: input.note ?? null,
      p_source: input.source ?? "manual_edit",
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ event: data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update inventory.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
