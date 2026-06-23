import "server-only";
import type { ExtractionOutput } from "@/lib/schemas";

export async function extractWineLabel(): Promise<ExtractionOutput> {
  return {
    producer: null,
    name: null,
    vintage: null,
    wine_type: null,
    varietals: [],
    region: null,
    country: null,
    alcohol_pct: null,
    confidence: {},
  };
}

export async function recommendWines() {
  return {
    picks: [],
    summary: "AI recommendation is stubbed until Phase 3.",
  };
}

export async function updatePreferenceProfile() {
  return {
    structured: {},
    summary: "Preference learning is stubbed until Phase 4.",
  };
}
