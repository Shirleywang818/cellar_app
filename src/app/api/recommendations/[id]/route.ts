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

    const { data: recommendation, error: recError } = await supabase
      .from("recommendations")
      .select("result")
      .eq("user_id", env.OWNER_USER_ID)
      .eq("id", id)
      .single();

    if (recError || !recommendation) {
      return NextResponse.json({ error: "Recommendation not found." }, { status: 404 });
    }

    const pickedWineIds = extractPickWineIds(recommendation.result);
    if (!pickedWineIds.has(input.accepted_wine_id)) {
      return NextResponse.json(
        { error: "That wine was not one of this recommendation's picks." },
        { status: 400 },
      );
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

function extractPickWineIds(result: unknown): Set<string> {
  const ids = new Set<string>();
  if (!result || typeof result !== "object") {
    return ids;
  }
  const picks = (result as { picks?: unknown }).picks;
  if (!Array.isArray(picks)) {
    return ids;
  }
  for (const pick of picks) {
    const wineId = (pick as { wine_id?: unknown })?.wine_id;
    if (typeof wineId === "string") {
      ids.add(wineId);
    }
  }
  return ids;
}
