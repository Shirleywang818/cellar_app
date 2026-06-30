import "server-only";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";

export type AiFeature = "label_extraction" | "recommendation" | "preference_update";
export type AiCallStatus = "success" | "fallback" | "error" | "blocked";

export class AiDailyLimitError extends Error {
  constructor(limit: number) {
    super(`Daily AI call limit reached (${limit}).`);
    this.name = "AiDailyLimitError";
  }
}

type LogAiCallArgs = {
  feature: AiFeature;
  provider: string;
  model: string;
  status: AiCallStatus;
  latencyMs?: number | null;
  fallback?: boolean;
  errorReason?: string | null;
};

export async function assertAiDailyLimit(feature: AiFeature) {
  const limit = env.AI_DAILY_CALL_LIMIT;
  if (limit === 0) {
    return;
  }

  const supabase = createServiceClient();
  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("ai_call_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", env.OWNER_USER_ID)
    .gte("created_at", since.toISOString())
    .neq("status", "blocked");

  if (error) {
    console.warn("AI daily limit check failed:", error.message);
    return;
  }

  if ((count ?? 0) >= limit) {
    await logAiCall({
      feature,
      provider: "system",
      model: "daily-cap",
      status: "blocked",
      fallback: true,
      errorReason: `Daily AI call limit ${limit} reached.`,
    });
    throw new AiDailyLimitError(limit);
  }
}

export async function logAiCall({
  feature,
  provider,
  model,
  status,
  latencyMs,
  fallback = false,
  errorReason = null,
}: LogAiCallArgs) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("ai_call_logs")
    .insert({
      user_id: env.OWNER_USER_ID,
      feature,
      provider,
      model,
      status,
      latency_ms: latencyMs ?? null,
      fallback,
      error_reason: errorReason,
    });

  if (error) {
    console.warn("AI call log insert failed:", error.message);
  }
}

export function compactErrorReason(error: unknown, max = 300) {
  const message = error instanceof Error ? error.message : String(error);
  return message.length > max ? `${message.slice(0, max)}...` : message;
}
