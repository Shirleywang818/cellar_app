import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getPreferenceProfile } from "@/lib/preferences";
import { updatePreferenceSchema } from "@/lib/schemas";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const profile = await getPreferenceProfile(env.OWNER_USER_ID);
    return NextResponse.json(profile);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load preference profile.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const json = await request.json();
    const input = updatePreferenceSchema.parse(json);
    const supabase = createServiceClient();

    const current = await getPreferenceProfile(env.OWNER_USER_ID);
    const structured = input.structured ?? current.structured;

    const { data, error } = await supabase
      .from("preference_profiles")
      .upsert({
        user_id: env.OWNER_USER_ID,
        summary: input.summary,
        structured,
        updated_at: new Date().toISOString(),
      })
      .select("structured, summary, updated_at")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update preference profile.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
