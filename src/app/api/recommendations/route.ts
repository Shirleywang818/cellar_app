import { NextResponse } from "next/server";
import { recommendWines } from "@/lib/ai/gateway";
import { env } from "@/lib/env";
import {
  assembleRecommendationCandidates,
  getPreferenceSummary,
  hydrateRecommendationPick,
} from "@/lib/recommend";
import { createRecommendationSchema } from "@/lib/schemas";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const input = createRecommendationSchema.parse(json);
    const supabase = createServiceClient();
    const assembly = await assembleRecommendationCandidates(input);
    const preferenceSummary = await getPreferenceSummary();

    const modelResult = await recommendWines({
      occasion: input.occasion,
      cuisine: input.cuisine,
      budget: {
        min: input.budget_min ?? null,
        max: input.budget_max ?? null,
      },
      candidates: assembly.candidates,
      preferenceSummary,
    });

    const candidateById = new Map(
      assembly.candidates.map((candidate) => [candidate.id, candidate]),
    );
    const hydratedPicks = modelResult.picks
      .filter((pick) => candidateById.has(pick.wine_id))
      .sort((left, right) => left.rank - right.rank)
      .slice(0, 3)
      .map((pick, index) => {
        const candidate = candidateById.get(pick.wine_id);

        if (!candidate) {
          throw new Error("Recommendation pick missing candidate after validation.");
        }

        return hydrateRecommendationPick(candidate, {
          ...pick,
          rank: index + 1,
        });
      });

    const result = {
      picks: hydratedPicks,
      summary: modelResult.summary,
      no_strong_match: modelResult.no_strong_match || hydratedPicks.length === 0,
      meta: {
        provider: env.AI_REC_PROVIDER,
        model: env.AI_REC_MODEL,
        fallback: modelResult.fallback,
        error: modelResult.error,
        candidate_count: assembly.candidates.length,
        total_in_stock: assembly.totalInStock,
        truncated: assembly.truncated,
      },
    };

    const { data, error } = await supabase
      .from("recommendations")
      .insert({
        user_id: env.OWNER_USER_ID,
        occasion: input.occasion,
        cuisine: input.cuisine,
        budget_min: input.budget_min ?? null,
        budget_max: input.budget_max ?? null,
        result,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      id: data.id,
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate recommendations.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
