"use client";

import { Check, ExternalLink, Sparkles, Wine } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type RecommendationWine = {
  id: string;
  title: string;
  wine_type: string;
  region: string | null;
  country: string | null;
  quantity: number;
  price_label: string;
  price_known: boolean;
  price_kind: "exact" | "band" | "unknown";
};

type RecommendationPick = {
  wine_id: string;
  rank: number;
  fit_score: number;
  rationale: string;
  wine: RecommendationWine;
};

type RecommendationResponse = {
  id: string;
  picks: RecommendationPick[];
  summary: string;
  no_strong_match: boolean;
  meta?: {
    fallback?: boolean;
    candidate_count?: number;
    total_in_stock?: number;
    truncated?: boolean;
  };
};

const OCCASION_CHIPS = [
  "casual weeknight",
  "friends gathering",
  "celebration",
  "birthday",
  "romantic dinner",
];

const CUISINE_CHIPS = [
  "Chinese hotpot",
  "steak",
  "French",
  "sushi",
  "spicy food",
  "cheese board",
];

const BUDGET_CHIPS = [
  { label: "Any", min: "", max: "" },
  { label: "$100 or less", min: "", max: "100" },
  { label: "$101-$200", min: "101", max: "200" },
  { label: "$201-$300", min: "201", max: "300" },
  { label: "$301-$500", min: "301", max: "500" },
  { label: "$500+", min: "501", max: "" },
];

export function RecommendationForm() {
  const [occasion, setOccasion] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [result, setResult] = useState<RecommendationResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [acceptedWineId, setAcceptedWineId] = useState<string | null>(null);
  const [openedWineId, setOpenedWineId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    setIsSubmitting(true);
    setMessage(null);
    setAcceptedWineId(null);
    setOpenedWineId(null);

    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occasion,
          cuisine,
          budget_min: budgetMin ? Number(budgetMin) : null,
          budget_max: budgetMax ? Number(budgetMax) : null,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Recommendation failed.");
      }

      setResult(payload);
      setMessage(payload.meta?.fallback ? "Recommendation service fell back gracefully." : null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Recommendation failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function acceptPick(wineId: string) {
    if (!result) {
      return;
    }

    setMessage(null);

    try {
      await recordAcceptedPick(result.id, wineId);
      setAcceptedWineId(wineId);
      setMessage("Recommendation accepted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Accept failed.");
    }
  }

  async function markOpened(wineId: string) {
    if (!result) {
      return;
    }

    setMessage(null);

    try {
      if (acceptedWineId !== wineId) {
        await recordAcceptedPick(result.id, wineId);
        setAcceptedWineId(wineId);
      }

      const response = await fetch(`/api/wines/${wineId}/inventory-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "consume",
          quantity_delta: -1,
          note: "Opened from recommendation",
          source: "recommendation_accept",
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not mark opened.");
      }

      setOpenedWineId(wineId);
      setResult(decrementResultQuantity(result, wineId));
      setMessage("Marked opened and decremented quantity.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not mark opened.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr] lg:items-start">
      <section className="rounded-md border border-border bg-card p-4 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Request</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick the situation, food, and budget for tonight.
          </p>
        </div>

        <Field label="Occasion">
          <ChipRow
            chips={OCCASION_CHIPS}
            onPick={setOccasion}
            selected={occasion}
          />
          <input
            className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring transition focus:ring-2"
            onChange={(event) => setOccasion(event.target.value)}
            placeholder="e.g. relaxed dinner with friends"
            value={occasion}
          />
        </Field>

        <Field label="Cuisine">
          <ChipRow chips={CUISINE_CHIPS} onPick={setCuisine} selected={cuisine} />
          <input
            className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring transition focus:ring-2"
            onChange={(event) => setCuisine(event.target.value)}
            placeholder="e.g. lamb skewers and vegetables"
            value={cuisine}
          />
        </Field>

        <Field label="Budget">
          <div className="flex flex-wrap gap-2">
            {BUDGET_CHIPS.map((chip) => (
              <button
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium transition hover:border-primary/40"
                key={chip.label}
                onClick={() => {
                  setBudgetMin(chip.min);
                  setBudgetMax(chip.max);
                }}
                type="button"
              >
                {chip.label}
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring transition focus:ring-2"
              min="0"
              onChange={(event) => setBudgetMin(event.target.value)}
              placeholder="Min"
              type="number"
              value={budgetMin}
            />
            <input
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring transition focus:ring-2"
              min="0"
              onChange={(event) => setBudgetMax(event.target.value)}
              placeholder="Max"
              type="number"
              value={budgetMax}
            />
          </div>
        </Field>

        <button
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSubmitting || !occasion.trim() || !cuisine.trim()}
          onClick={submit}
          type="button"
        >
          <Sparkles aria-hidden="true" className="size-4" />
          {isSubmitting ? "Thinking..." : "Recommend"}
        </button>

        {message ? (
          <p className="mt-3 text-sm text-muted-foreground" role="status">
            {message}
          </p>
        ) : null}
      </section>

      <section className="grid gap-3">
        {!result ? (
          <div className="rounded-md border border-border bg-card p-5 text-sm text-muted-foreground">
            Recommendations will appear here.
          </div>
        ) : (
          <>
            <div className="rounded-md border border-border bg-card p-4 shadow-sm">
              <h2 className="font-semibold">
                {result.no_strong_match ? "Closest matches" : "Top picks"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{result.summary}</p>
              {result.meta?.truncated ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Candidate list was trimmed for cost control.
                </p>
              ) : null}
            </div>

            {result.picks.length === 0 ? (
              <div className="rounded-md border border-border bg-card p-5 text-sm text-muted-foreground">
                No in-stock bottles matched this request.
              </div>
            ) : (
              result.picks.map((pick) => (
                <article
                  className={
                    pick.rank === 1
                      ? "rounded-md border border-primary/50 bg-card p-4 shadow-sm"
                      : "rounded-md border border-border bg-card p-4 shadow-sm"
                  }
                  key={pick.wine_id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-primary">
                        #{pick.rank} · Fit {Math.round(pick.fit_score * 100)}%
                      </p>
                      <h3 className="mt-1 text-xl font-semibold">{pick.wine.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {[pick.wine.wine_type, pick.wine.region, pick.wine.country]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <Wine aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
                  </div>

                  <p className="mt-3 text-sm leading-6">{pick.rationale}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Price</dt>
                      <dd className="font-medium">
                        {pick.wine.price_label}
                        {!pick.wine.price_known ? " price" : ""}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Qty</dt>
                      <dd className="font-medium">{pick.wine.quantity}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={acceptedWineId === pick.wine_id}
                      onClick={() => acceptPick(pick.wine_id)}
                      type="button"
                    >
                      <Check aria-hidden="true" className="size-4" />
                      {acceptedWineId === pick.wine_id ? "Accepted" : "Accept"}
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={openedWineId === pick.wine_id || pick.wine.quantity <= 0}
                      onClick={() => markOpened(pick.wine_id)}
                      type="button"
                    >
                      Mark opened
                    </button>
                    <Link
                      className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium"
                      href={`/wines/${pick.wine_id}`}
                    >
                      Details
                      <ExternalLink aria-hidden="true" className="size-4" />
                    </Link>
                  </div>
                </article>
              ))
            )}
          </>
        )}
      </section>
    </div>
  );
}

async function recordAcceptedPick(recommendationId: string, wineId: string) {
  const response = await fetch(`/api/recommendations/${recommendationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accepted_wine_id: wineId }),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "Accept failed.");
  }
}

function decrementResultQuantity(
  result: RecommendationResponse,
  wineId: string,
): RecommendationResponse {
  return {
    ...result,
    picks: result.picks.map((pick) =>
      pick.wine_id === wineId
        ? {
            ...pick,
            wine: {
              ...pick.wine,
              quantity: Math.max(0, pick.wine.quantity - 1),
            },
          }
        : pick,
    ),
  };
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="mt-4 block text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

function ChipRow({
  chips,
  onPick,
  selected,
}: {
  chips: string[];
  onPick: (value: string) => void;
  selected: string;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          className={
            chip === selected
              ? "rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
              : "rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium transition hover:border-primary/40"
          }
          key={chip}
          onClick={() => onPick(chip)}
          type="button"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
