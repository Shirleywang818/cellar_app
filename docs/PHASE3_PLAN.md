# Phase 3 — Recommend (Plan)

**Companion to:** [DESIGN.md](./DESIGN.md) §4.2, §5, §6.2 · [PRD.md](./PRD.md) Epic C, FR-9–FR-12
**Depends on:** Phase 2 complete (cellar, inventory events).

**Goal:** the owner describes an occasion + cuisine + price range, and the app returns the **top 3**
bottles **from their in-stock cellar** (within budget), each with a one-paragraph rationale and the
price/band (or "unknown price"). #1 is highlighted. If nothing fits well, the app says so honestly.
Replaces the `recommendWines` stub with a real provider call. During Phase 3 testing, Gemini is
the default recommendation provider because Gemini credits are already available; DeepSeek remains
supported behind the same gateway once billing is configured.

**Exit criteria:**
- From the deployed app I can pick occasion + cuisine + budget and get up to 3 ranked picks with
  rationale, each linking to the wine.
- Recommendations only ever reference wines actually in my cellar (no hallucinated bottles).
- "No strong match" is handled honestly rather than forcing a pick.
- Each request is logged to `recommendations`; accepting one records the choice.

---

## Scope

**In scope (Phase 3):**
- Recommendation input UI: occasion (chips + free text), cuisine (chips + free text), price range.
- `POST /api/recommendations` — assemble candidates, call DeepSeek, validate, log, return picks.
- Real Gemini recommendation provider behind the existing `recommendWines` gateway function, with
  DeepSeek still available via env config.
- Results UI: ranked cards (#1 highlighted), rationale, price/band, link to detail, no-match state.
- **Accept** a recommendation → record `accepted_wine_id`; optional "mark opened" → `consume -1`
  via the existing inventory endpoint (`source = recommendation_accept`).

**Out of scope (later phases):**
- Tasting log + preference learning → **Phase 4**. (Phase 3 reads `preference_profiles.summary`
  if present, but it will usually be empty until Phase 4 populates it.)
- Deep-pick / stronger-model fallback → optional, deferred unless trivial.
- Web price enrichment, "snap the menu," voice input → backlog.

---

## Prerequisites (before coding)

1. **`GEMINI_API_KEY`** in `.env.local` and Vercel.
2. **Confirm recommendation env values for Phase 3 testing:**
   `AI_REC_PROVIDER=gemini`, `AI_REC_MODEL=gemini-2.5-flash`.
3. DeepSeek remains supported for later cost testing. Use `AI_REC_PROVIDER=deepseek`,
   `AI_REC_MODEL=deepseek-v4-flash` once DeepSeek API billing is configured. Reserve
   `deepseek-v4-pro` for a future deep-pick mode.

---

## Data

No new tables — the Phase 0 `recommendations` table already fits:

```
recommendations(id, user_id, occasion, cuisine, budget_min, budget_max,
                result jsonb, accepted_wine_id, created_at)
```

- `result` stores the returned payload: `{ picks: [...], summary, no_strong_match }`.
- `accepted_wine_id` is null on create; set when the user accepts a pick.
- Add `recommendations` (Row/Insert/Update) to `src/types/database.ts` (not yet typed).

---

## Backend

### Candidate assembly (`src/lib/recommend.ts`, new)
Build a compact candidate list the model can reason over cheaply:
- Base filter: `user_id = OWNER_USER_ID` and `quantity > 0` (in stock).
- **Budget filter** against the requested range `[min, max]` (either bound optional; "any" = no
  budget filter):
  - exact `cost_per_bottle` in range → include (known price);
  - `price_band`-only → include if the band overlaps the range (coarse), marked approximate;
  - unknown price → include but flag `price_known: false` (per FR-10 / DESIGN §4.2).
- Trim each candidate to essential fields to save tokens: `id, producer, name, vintage, wine_type,
  varietals, region, country, price (cost or band or "unknown"), quantity`.
- Cap the candidate count (e.g. first ~40 by recency) to bound prompt size; note if truncated.

### Gateway: real recommendation (`src/lib/ai/gateway.ts`)
Replace the stub `recommendWines` with:
```
recommendWines({ occasion, cuisine, budget, candidates, preferenceSummary })
  -> { picks: [{ wine_id, rank, fit_score, rationale }], summary, no_strong_match }
```
- Gemini via `generateContent` JSON mode for Phase 3 testing. DeepSeek remains available via
  OpenAI-compatible Chat Completions, `response_format: { type: "json_object" }`, low temperature.
- Prompt rules (DESIGN §6.2): pick **only** from the provided candidate ids; return **at most 3**;
  rank best-first with `fit_score` 0–1; explain fit to food + occasion + (if given) the owner's
  taste; **if nothing is a strong fit, set `no_strong_match: true`** and return the closest option
  with an honest caveat rather than forcing three.
- Zod-validate output; one retry on parse failure; on total failure return a safe "couldn't
  generate" result (never 500 the UX).
- Provider-swappable via `AI_REC_PROVIDER` / `AI_REC_MODEL` (keep the gateway boundary).

### `POST /api/recommendations`
1. Validate body (`createRecommendationSchema`: occasion, cuisine, optional budget_min/max).
2. Assemble candidates (above). If **zero** candidates (empty cellar / nothing in budget), short-
   circuit with an honest "no candidates" response — don't call the model.
3. Load `preference_profiles.summary` for the owner (empty string if no row yet).
4. Call `recommendWines`.
5. **Validate picks server-side:** drop any `wine_id` not in the candidate set; if all are invalid,
   treat as `no_strong_match`. (Hard guard against hallucinated bottles — DESIGN §6.2.)
6. Insert into `recommendations` (occasion, cuisine, budget, `result`); return `{ id, ...result }`.

### Accept (respects "decrement only after opened" — DESIGN §4.2 step 6)
- `PATCH /api/recommendations/:id` → set `accepted_wine_id`. Acceptance alone does **not** change
  stock.
- "Mark opened" reuses `POST /api/wines/:id/inventory-events` with
  `{ event_type: "consume", quantity_delta: -1, source: "recommendation_accept" }`.

---

## Frontend

- **`/recommend` page** with a form: occasion (quick chips: friends gathering, celebration,
  birthday, romantic, casual weeknight + free text), cuisine (chips: Chinese hotpot, French, steak,
  … + free text), price range (Any + min/max or band quick-picks).
- **Results:** up to 3 cards, **#1 visually highlighted**, each showing rank, wine title, price/band
  (or "Unknown price"), `fit_score` (subtle), rationale, and a link to `/wines/:id`.
- **No-match state:** show the model's honest message + the closest suggestion when present.
- **Accept / Mark opened** actions on a card; reflect the inventory change on return.
- Add a nav entry to `/recommend` from the cellar header.

---

## Validation / schemas (`src/lib/schemas.ts`)

- `createRecommendationSchema` — occasion (non-empty), cuisine (non-empty), `budget_min?`,
  `budget_max?` (non-negative; if both present, min ≤ max).
- `recommendationPickSchema` — `{ wine_id (uuid), rank (int ≥ 1), fit_score (0–1), rationale }`.
- `recommendationResultSchema` — `{ picks: pick[].max(3), summary, no_strong_match: bool }` (the
  model-output contract, Zod-validated in the gateway).

---

## Prompt design

- **System:** "You are a sommelier recommending from a fixed list of bottles the user owns. Only
  choose from the provided candidates by `id`. Never invent wines."
- **User payload (JSON):** `{ occasion, cuisine, budget, preference_summary, candidates[] }`.
- **Instructions:** rank up to 3 by fit to cuisine + occasion + taste; respect budget; if a wine's
  price is unknown, you may still suggest it but note the price is unknown; if nothing fits well,
  set `no_strong_match` and explain. Output strictly the JSON contract.
- Keep candidate fields minimal; never send photos or `extraction_meta`.

---

## Edge cases & guardrails

- **Empty cellar / no in-budget candidates:** honest "nothing to recommend yet" without an AI call.
- **Hallucinated ids:** server-side filter against candidates is the hard guard (not just the prompt).
- **Unknown-price wines:** included but clearly labeled; never silently treated as in-budget.
- **Model/parse failure or DeepSeek outage:** one retry, then a graceful "couldn't generate
  recommendations, try again" — capture stays unaffected.
- **Cost control:** trim candidate fields, cap candidate count, low temperature, log latency/usage.
- **Preference summary empty (pre-Phase 4):** prompt works fine with an empty taste profile.

---

## Verification

- Unit: candidate budget filter (exact / band-only / unknown); server-side pick validation drops
  unknown ids; `createRecommendationSchema` (min ≤ max).
- Manual: run several occasion/cuisine/budget combos against a real cellar; confirm picks are all
  real in-stock wines, #1 highlighted, rationale sensible, and a deliberately impossible budget
  triggers the honest no-match path.
- Manual: accept a pick (records `accepted_wine_id`); "mark opened" decrements quantity and writes a
  `consume` event with `source = recommendation_accept`.
- Re-run `pnpm lint && pnpm typecheck && pnpm build`.

---

## Suggested build order

1. Confirm `GEMINI_API_KEY`, `AI_REC_PROVIDER=gemini`, and
   `AI_REC_MODEL=gemini-2.5-flash` locally and in Vercel.
2. Candidate assembly + budget filter (`src/lib/recommend.ts`) with unit tests.
3. Real `recommendWines` in the gateway (DeepSeek JSON + Zod + retry).
4. `POST /api/recommendations` (assemble → model → validate picks → log).
5. `/recommend` UI (form + results + no-match state).
6. Accept + "mark opened" wiring; nav entry.
7. Manual passes on a real cellar; run checks.
