# Phase 4 — Preferences & Memory (Plan)

**Companion to:** [DESIGN.md](./DESIGN.md) §4.3, §5, §6.3 · [PRD.md](./PRD.md) Epic D, FR-13–FR-14
**Depends on:** Phase 3 complete (recommendations already read `preference_profiles.summary`).

**Goal:** the owner logs a tasting (rating + notes) from the wine detail page; tastings roll up into
a preference profile whose `summary` is fed into the recommendation prompt — so recommendations
start reflecting the owner's actual palate. Replaces the `updatePreferenceProfile` stub.

**Exit criteria:**
- From a wine's detail page I can log a tasting (rating 1–5, notes, optional paired-with).
- Logging a tasting updates my preference profile (structured + natural-language summary).
- The updated `summary` shows up in subsequent recommendations (already wired in Phase 3).
- I can view and edit my preference profile in plain language.
- **Logging a tasting does not change quantity** (stock is only ever moved by inventory events).

---

## Decisions locked (from alignment)

- **Tasting lives on the wine detail page** in v1 (no separate landing-page input).
- **Tasting does not decrement quantity** — avoids double-counting; `consume` inventory events
  remain the single source of truth for stock. Drinking a bottle and recording a tasting are two
  independent actions.
- Voice-driven tasting capture (speak wine + rating + notes, fuzzy-match to a bottle) is a **future
  feature**, not v1 (logged in PRD backlog).

---

## Scope

**In scope (Phase 4):**
- Tasting log UI on the wine detail page + a list of that wine's past tastings.
- `POST /api/tastings` — insert a tasting, then (best-effort) update the preference profile.
- Real `updatePreferenceProfile` in the gateway (replaces the stub).
- Preferences page to **view and edit** the profile summary in plain language.
- Confirm the preference AI env values.

**Out of scope (later):**
- Voice tasting capture, "Tasting Experience" lineup tab → backlog.
- Structured analytics on tastings (trends, favorites dashboards).
- Per-tasting editing/deletion history beyond basic create (decide if needed).

---

## Prerequisites

1. **Confirm preference model env values.** Use `AI_PREF_PROVIDER=gemini` and
   `AI_PREF_MODEL=gemini-2.5-flash` for Phase 4 testing so preference updates reuse the same Gemini
   credits as recommendations. DeepSeek remains available later with `AI_PREF_PROVIDER=deepseek`
   and `AI_PREF_MODEL=deepseek-v4-flash` once billing is configured.

---

## Data

No new tables — both already exist from Phase 0:

```
tastings(id, user_id, wine_id, rating 1..5, notes, paired_with, tasted_on, created_at)
preference_profiles(user_id pk, structured jsonb, summary text, updated_at)
```

- Add `tastings` (Row/Insert/Update) to `src/types/database.ts` (not yet typed).
- `preference_profiles` is already typed. Profile is upserted (one row per user).

---

## Backend

### `POST /api/tastings`
1. Validate body (`createTastingSchema`: `wine_id` (uuid), `rating?` (1–5), `notes?`,
   `paired_with?`, `tasted_on?` default today). Require at least one of rating/notes so empty
   tastings aren't stored.
2. Verify the wine belongs to the owner.
3. Insert the tasting (stamps `OWNER_USER_ID`). **No quantity change.**
4. **Best-effort profile refresh:** call `refreshPreferenceProfile(owner)` (below). If it fails,
   the tasting still succeeds — return `{ id, profile_updated: false }` rather than erroring.

### Preference profile refresh (`src/lib/preferences.ts`, new)
- Load recent tastings (e.g. last ~30) joined with their wines' key attributes
  (type, varietals, region, country, price band) + the current `preference_profiles` row.
- Call `updatePreferenceProfile({ tastings, currentProfile })` (gateway).
- Upsert `preference_profiles` with the returned `structured` + `summary` + `updated_at`.

### Gateway: real `updatePreferenceProfile` (`src/lib/ai/gateway.ts`)
```
updatePreferenceProfile({ tastings, currentProfile })
  -> { structured: {likes[], dislikes[], favorite_regions[], budget_norm?}, summary }
```
- Uses `AI_PREF_PROVIDER` / `AI_PREF_MODEL`; same provider abstraction as recommendation.
- Prompt: given the current profile + recent tastings (wine attributes + rating + notes), produce
  an updated concise natural-language `summary` (a few sentences) and a `structured` object. Respect
  and evolve the **current summary** (including any manual user edits) rather than discarding it.
- Lenient JSON parse + one retry; on failure return the current profile unchanged (never blocks a
  tasting). Keep it cheap (few tastings, trimmed fields).

### `GET` / `PATCH /api/preferences`
- `GET` → current `{ structured, summary, updated_at }` (empty defaults if no row yet).
- `PATCH` → update `summary` (and optionally `structured`) from the user's manual edit. Because the
  refresh prompt takes the current summary as input, manual edits persist and inform future updates.

---

## Frontend

- **Wine detail page (`/wines/[id]`):**
  - **Log Tasting** form/section: rating (1–5 stars or select), notes (textarea), paired-with
    (optional), date (default today). Submit → `POST /api/tastings` → refresh.
  - **Tastings history** list for that wine (rating + notes + date), alongside the existing
    inventory history.
  - Copy clarifies tasting ≠ stock change (e.g. "Logging a tasting won't change quantity — use
    Inventory to mark a bottle opened.").
- **Preferences page (`/preferences`):**
  - Show the natural-language `summary` (editable) + a read view of `structured` (likes/dislikes/
    regions). Save → `PATCH /api/preferences`.
  - Nav entry from the cellar header.

---

## Validation / schemas (`src/lib/schemas.ts`)

- `createTastingSchema` — `wine_id` (uuid), `rating?` int 1–5, `notes?`, `paired_with?`,
  `tasted_on?`; refine: at least one of `rating`/`notes` present.
- `preferenceProfileSchema` — `{ structured: {...}, summary }` (model-output contract, lenient parse).
- `tastingSchema` — row shape for reading a wine's tasting history.

---

## Edge cases & guardrails

- **Profile update failure / AI outage:** tasting is saved regardless; profile refresh is
  best-effort and returns the unchanged profile on error.
- **No tastings yet:** recommendations already handle an empty `summary` (Phase 3) — no change.
- **Manual edits vs. auto-refresh:** the refresh prompt is seeded with the current summary, so user
  edits are respected and evolved, not overwritten wholesale.
- **Cost control:** cap tastings sent to the model (~30), trim wine fields, low temperature; one
  profile call per tasting save.
- **Privacy:** send only structured tasting/wine attributes + notes — no photos.

---

## Verification

- Unit: `createTastingSchema` (rating bounds; require rating-or-notes); preference upsert.
- Manual: log a few tastings on different wines (e.g. love a bold red, dislike an oaky white) →
  open `/preferences` and confirm the summary reflects them → run a recommendation and confirm the
  rationale references the learned taste.
- Manual: confirm logging a tasting **does not** change the wine's quantity.
- Manual: edit the summary on `/preferences`, log another tasting, confirm the edit isn't blown away.
- Re-run `pnpm lint && pnpm typecheck && pnpm build`.

---

## Suggested build order

1. Confirm `AI_PREF_PROVIDER=gemini`, `AI_PREF_MODEL=gemini-2.5-flash` locally and in Vercel;
   type `tastings` in `database.ts`.
2. `createTastingSchema` + `POST /api/tastings` (insert only, no profile yet).
3. Tasting form + history on the wine detail page; verify no quantity change.
4. Real `updatePreferenceProfile` + `refreshPreferenceProfile`; wire into tasting save.
5. `/preferences` page + `GET`/`PATCH` + nav entry.
6. Manual passes (incl. recommendation reflecting taste); run checks.
