import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { refreshPreferenceProfile } from "@/lib/preferences";
import { createTastingSchema } from "@/lib/schemas";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const input = createTastingSchema.parse(json);
    const supabase = createServiceClient();

    const { data: wine, error: wineError } = await supabase
      .from("wines")
      .select("id")
      .eq("user_id", env.OWNER_USER_ID)
      .eq("id", input.wine_id)
      .single();

    if (wineError || !wine) {
      return NextResponse.json({ error: "Wine not found." }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("tastings")
      .insert({
        user_id: env.OWNER_USER_ID,
        wine_id: input.wine_id,
        rating: input.rating ?? null,
        notes: input.notes ?? null,
        paired_with: input.paired_with ?? null,
        tasted_on: input.tasted_on ?? new Date().toISOString().slice(0, 10),
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    let profileUpdated = false;
    try {
      await refreshPreferenceProfile(env.OWNER_USER_ID);
      profileUpdated = true;
    } catch (profileError) {
      console.warn(
        "Preference profile refresh failed after tasting save:",
        profileError instanceof Error ? profileError.message : profileError,
      );
    }

    return NextResponse.json({
      id: data.id,
      profile_updated: profileUpdated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save tasting.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
