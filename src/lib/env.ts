import { z } from "zod";

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default("wine-labels"),
  OWNER_USER_ID: z.string().uuid(),
  REQUIRE_AUTH: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  GEMINI_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_DAILY_CALL_LIMIT: z.coerce.number().int().min(0).default(50),
  AI_LABEL_PROVIDER: z.string().default("gemini"),
  AI_LABEL_MODEL: z.string().default("gemini-2.5-flash"),
  AI_REC_PROVIDER: z.string().default("gemini"),
  AI_REC_MODEL: z.string().default("gemini-2.5-flash"),
  AI_PREF_PROVIDER: z.string().default("gemini"),
  AI_PREF_MODEL: z.string().default("gemini-2.5-flash"),
});

export const env = envSchema.parse(process.env);
