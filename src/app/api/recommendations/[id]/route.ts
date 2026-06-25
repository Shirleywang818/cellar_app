import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { acceptRecommendationSchema } from "@/lib/schemas";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const json = await request.json();
    const input = acceptRecommendationSchema.parse(json);
    const supabase = createServiceClient();

    const { data: wine, error: wineError } = await supabase
      .from("wines")
      .select("id")
      .eq("user_id", env.OWNER_USER_ID)
      .eq("id", input.accepted_wine_id)
      .single();

    if (wineError || !wine) {
      return NextResponse.json({ error: "Accepted wine not found." }, { status: 404 });
    }

    const { error } = await supabase
      .from("recommendations")
      .update({ accepted_wine_id: input.accepted_wine_id })
      .eq("user_id", env.OWNER_USER_ID)
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to accept recommendation.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
