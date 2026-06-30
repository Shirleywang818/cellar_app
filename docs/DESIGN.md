# Wine Cellar App — High-Level Design Document

**Status:** Draft for alignment
**Last updated:** 2026-06-23
**Companion to:** [PRD.md](./PRD.md)

---

## 1. Architecture Overview

A single Next.js application (React front end + server-side API routes) backed by Supabase
(Postgres + Auth + Storage), calling server-side AI providers through a small provider-agnostic
AI gateway.
Deployed on Vercel. Browser-first PWA. **Primary target browser is Chrome** (desktop + Android);
built to standard web/PWA APIs so iOS Safari and home-screen install also work. If Chrome-first
implementation creates meaningful PWA limitations later, the product preference is to shift
toward iOS-first behavior rather than keep a browser choice that weakens the core cellar workflow.

```
   Browser / installed PWA
            │  HTTPS
            ▼
   ┌──────────────────────────────┐
   │   Next.js app (Vercel)       │
   │   • React UI (mobile-first)  │
   │   • API routes / server      │
   │     actions (BFF)            │
   └───────┬───────────┬──────────┘
           │           │
           │           │ AI providers
           │           ▼
           │   ┌─────────────────────┐
           │   │  AI gateway         │
           │   │  • hosted vision    │
           │   │    for labels       │
           │   │  • DeepSeek for     │
           │   │    text reasoning   │
           │   └─────────────────────┘
           ▼
   ┌──────────────────────────────┐
   │   Supabase                   │
   │   • Postgres (cellar, etc.)  │
   │   • Auth (off→on for release)│
   │   • Storage (label photos)   │
   │   • Row-Level Security       │
   └──────────────────────────────┘
```

**Why the photo/AI calls go through the Next.js server (a "backend-for-frontend")**, never
directly from the browser: keeps provider API keys secret, lets us validate/transform
data, control cost, and add caching/rate limits.

---

## 2. Recommended Tech Stack

| Layer | Choice | Why |
|---|---|---|
| **Front end** | **Next.js (App Router) + React + TypeScript** | One framework for UI + API; great mobile web; easy PWA; large ecosystem. |
| **Styling/UI** | **Tailwind CSS + shadcn/ui** | Fast, clean, mobile-friendly components. |
| **PWA** | `next-pwa` / web manifest + service worker | Installable on iOS home screen; camera via standard web APIs. |
| **Backend** | **Next.js Route Handlers / Server Actions** | No separate server to run; co-located with UI. |
| **Database** | **Supabase Postgres** | Relational fit for cellar data; free tier; SQL + migrations. |
| **Auth** | **Supabase Auth** | Email/OAuth ready; can run "open" for v1, enforced for release. |
| **File storage** | **Supabase Storage** | Bottle photos; signed URLs; same vendor as DB/auth. |
| **AI** | **Provider-agnostic gateway: hosted vision model + swappable text models** | Cost-efficient path: use proven hosted vision for labels, Gemini for Phase 3 recommendation testing, DeepSeek for recommendation and preference text work once billing is configured, optional stronger fallback model for deep picks. |
| **Hosting** | **Vercel** (app) + **Supabase** (data) | Zero-ops, generous free tiers, instant deploys. |
| **Validation** | **Zod** | One schema shared by AI output, API, and forms. |

> Alternative considered: plain React + Express + SQLite. Rejected for v1 because Supabase gives
> auth + storage + managed Postgres + RLS out of the box, which we'd otherwise hand-roll — and
> RLS is exactly what makes the future multi-user switch cheap.

**Future App Store path:** wrap the same web app with **Capacitor** for a native iOS shell
(reuses 100% of the code, adds native camera/notifications). No rewrite needed.

---

## 3. Data Model (Postgres)

```
app_users
  id (uuid, pk)
  auth_user_id (uuid, unique, fk -> auth.users.id, null in v1)
  email
  created_at

wines
  id (uuid, pk)
  user_id (uuid, fk → app_users.id)      -- enables multi-user via RLS
  producer          text
  name              text                 -- cuvée / label name
  vintage           int   null           -- null = NV (non-vintage)
  wine_type         text                 -- red|white|rose|sparkling|dessert|fortified
  varietals         text[]               -- e.g. {Cabernet Sauvignon, Merlot}
  region            text  null            -- e.g. "Napa Valley" (stored alongside country)
  country           text  null            -- e.g. "USA" (both granularities kept per decision)
  alcohol_pct       numeric null
  quantity          int   not null default 1
  cost_per_bottle   numeric null
  price_band        text  null           -- under_100|101_200|201_300|301_500|500_plus
  price_source      text  null           -- user|web_estimate|unknown
  currency          text  default 'USD'
  purchase_date     date  null
  location          text  null           -- "Rack B, row 3"
  notes             text  null           -- owner-visible cellar notes
  photo_path        text  null           -- Supabase Storage key
  extraction_meta   jsonb null           -- provider/model, confidence, raw_text, fallback/error metadata
  created_at        timestamptz default now()
  updated_at        timestamptz

tastings
  id (uuid, pk)
  user_id (uuid, fk -> app_users.id)
  wine_id (uuid, fk → wines.id)
  rating            int   null            -- 1..5
  notes             text  null
  paired_with       text  null            -- "hotpot"
  tasted_on         date  default today
  created_at        timestamptz default now()

inventory_events
  id (uuid, pk)
  user_id (uuid, fk -> app_users.id)
  wine_id (uuid, fk -> wines.id)
  event_type        text                 -- purchase|adjustment|consume
  quantity_delta    int                  -- +N for additions, -N for consumed bottles
  note              text null
  source            text null            -- capture|manual_edit|tasting|recommendation_accept
  created_at        timestamptz default now()

preference_profiles                       -- one row per user
  user_id (uuid, pk, fk -> app_users.id)
  structured        jsonb                  -- {likes:[], dislikes:[], budget_norm:..., favorite_regions:[]}
  summary           text                   -- natural-language profile used in prompts
  updated_at        timestamptz

recommendations (log, optional but useful for learning/metrics)
  id (uuid, pk)
  user_id (uuid, fk -> app_users.id)
  occasion          text
  cuisine           text
  budget_min        numeric null
  budget_max        numeric null
  result            jsonb                  -- picks + rationale returned to user
  accepted_wine_id  uuid null
  created_at        timestamptz default now()
```

**Duplicate / repurchase policy:** do not auto-merge duplicate-looking wines in v1. A repurchase
can be saved as a separate record so purchase date, price, quantity, and location remain accurate.
When the UI or recommender needs one price for the "same wine" across records, use the latest
user-entered exact price; otherwise preserve the record-level price.

**Inventory history policy:** `wines.quantity` is a read-optimized **cache**; the durable history
lives in `inventory_events`. The two must stay consistent:

- **Invariant:** any stock change updates `wines.quantity` **and** inserts an `inventory_events`
  row **in the same transaction**, so the cache can always be reconciled from the event log
  (`quantity == sum(quantity_delta)` for a wine, barring intentional `adjustment` corrections).
- **A wine row is a line item, not a single bottle.** `quantity` is how many identical bottles are
  held. Holding 6 bottles of one wine is one row with `quantity = 6`.
- **Opening/consuming one of many** is a single `consume` event with `quantity_delta = -1`; the row
  stays and `quantity` goes 6 → 5. The `source` field (`tasting` / `manual_edit` /
  `recommendation_accept`) records *why*, so a separate `open` vs `tasting_open` type is unnecessary.
- **`adjustment`** is for manual corrections (miscount, breakage) where delta isn't a normal
  purchase/consume.
- **Deleting a wine is a hard delete** (the row plus its `inventory_events` cascade), not an event.
  There is intentionally no `remove` event type in v1. *Note:* the Phase 2 migration's CHECK
  constraint still permits `remove` (migrations are immutable once applied); it is simply never
  produced. App-layer types restrict to the three active types. Tighten the DB constraint later
  only if desired (see BACKLOG).

Phase 1 creates wines without events. Phase 2 introduces `inventory_events` and **backfills one
`purchase` event per existing wine** (`quantity_delta = current quantity`) so history is consistent
from day one, before quantity editing becomes a primary workflow.

**Unknown-price policy:** exact cost is optional. If blank, v2 web enrichment can fill an estimated
market price. If no reliable source is found, prompt the user for an exact price or a price band.
Recommendation budget filters still include unknown-price wines, but mark them as unknown so the
user can decide.

**Price bands (USD, v1):**

| Stored value | Display label | Range |
|---|---|---|
| `under_100` | `$100 or less` | `<= 100` |
| `101_200` | `$101-$200` | `101-200` |
| `201_300` | `$201-$300` | `201-300` |
| `301_500` | `$301-$500` | `301-500` |
| `500_plus` | `$500+` | `> 500` |

If `cost_per_bottle` exists, derive `price_band` automatically. If exact price is unknown, the
user can select `price_band` directly.

**Row-Level Security (RLS):** every table keyed by `user_id`; policy = "row visible/editable
only where the row's `app_users.auth_user_id = auth.uid()`." In v1 single-user mode we still write
`user_id` using a fixed `OWNER_USER_ID`; turning on enforced auth later maps that app user to a
Supabase Auth user rather than changing cellar rows.

---

## 4. Key Flows

### 4.1 Add a wine (capture)
1. User taps **Add → Take photo** (camera) or picks from library.
2. Client uploads image to `POST /api/wines/extract` (multipart).
3. Server stores the image in Supabase Storage, calls the configured hosted vision model with the
   image and a strict JSON schema (Zod-validated), returns extracted fields + per-field confidence.
4. Client shows a **confirmation form** pre-filled; user edits, adds qty/cost/location.
5. `POST /api/wines` persists the record (links `photo_path`).
6. If the user abandons the confirmation form, the uploaded photo is eligible for cleanup by age
   because it is not referenced by a saved wine.
7. When inventory events are enabled, the initial save also writes a `purchase` or `adjustment`
   event with `quantity_delta = quantity`.

### 4.2 Recommend a wine
1. User opens **Recommend**, picks occasion + cuisine chips (or free text) + price range.
2. Client calls `POST /api/recommendations`.
3. Server: query in-stock wines (`quantity > 0`) within budget, plus unknown-price wines clearly
   marked as unknown when a budget filter is active → build a compact candidate list; load the
   user's `preference_profiles.summary`; call the configured recommendation model with
   `{occasion, cuisine, budget, candidates[], preference_summary}` and a structured output schema.
4. The model returns ranked picks (top 3, #1 highlighted) each with `wine_id`, rationale, fit_score.
5. Server validates picks reference real candidate IDs, logs to `recommendations`, returns to client.
6. User can **Accept** → prompt to log a tasting or confirm the bottle was opened; only then apply
   `quantity--` and write an `inventory_events` row.

### 4.3 Learn preferences
1. User logs a **tasting** (rating + notes) from the wine detail page. **This does not change
   `quantity`** — stock is moved only by `inventory_events` (consume), so a tasting and an opened
   bottle are recorded independently and never double-count.
2. A lightweight best-effort job (on save) asks the configured preference model to update the user's
   `summary` + `structured` profile from recent tastings; if it fails, the tasting is still saved.
3. The updated `summary` is injected into future recommendation prompts (§4.2 step 3).
   *(v1 logs tastings manually on the detail page; voice-driven tasting capture is a future feature.)*

---

## 5. API Surface (v1)

| Method & path | Purpose |
|---|---|
| `POST /api/wines/extract` | Image → structured label fields (no DB write yet). |
| `POST /api/wines` | Create a wine record. |
| `GET /api/wines` | List/search/filter cellar. |
| `GET /api/wines/:id` | Wine detail. |
| `PATCH /api/wines/:id` | Edit fields / adjust quantity. |
| `DELETE /api/wines/:id` | Remove wine. |
| `POST /api/wines/:id/inventory-events` | Add an inventory event and update current quantity. |
| `POST /api/recommendations` | Occasion+cuisine+budget → ranked picks. |
| `POST /api/tastings` | Log a tasting (triggers preference update). |
| `GET /api/preferences` / `PATCH /api/preferences` | View/edit preference profile. |

All endpoints are scoped to a single user id: the fixed `OWNER_USER_ID` (`app_users.id`) in v1
open mode, switching to the session-mapped `app_users.id` once auth is enforced.

---

## 6. AI Design

### 6.1 Label extraction (vision)
- **Default provider/model:** hosted vision model, initially Gemini Flash/Flash-Lite or equivalent
  low-cost vision model selected by env var.
- **Fallback:** Claude Sonnet or another stronger hosted vision model if benchmark labels show
  accuracy issues.
- **Input:** the label image + instruction to return **only** JSON matching the wine schema, with
  `null` for anything not visible and a `confidence` per field. No guessing of vintage if absent.
- **Output:** Zod-validated; low-confidence fields flagged in the UI for the user to confirm.
  `extraction_meta` should retain provider/model, per-field confidence, `raw_text` when available,
  whether a fallback was used, and a compact error/debug reason when extraction fails.
- **Cost control:** downscale image client-side before upload; one call per scan.
- **Reliability:** retry once on provider 429/5xx with bounded backoff; return an empty editable
  form rather than blocking manual capture if all AI attempts fail.
- **Back label:** support for an optional second image stays out of the Phase 1 critical path, but
  the extraction interface should be shaped so `front_image` and optional `back_image` can be added
  later without rewriting the capture flow.

### 6.2 Recommendation (reasoning)
- **Default provider/model:** Gemini (`gemini-2.5-flash`) for Phase 3 testing; DeepSeek
  (`deepseek-v4-flash`) remains the cost-testing target once billing is configured.
- **Fallback/deep pick:** optional stronger model such as DeepSeek Pro or Claude Sonnet when the
  user explicitly asks for a higher-quality "deep pick."
- **Prompt inputs:** occasion, cuisine, budget, the candidate list (in-stock + in-budget, with
  unknown-price wines included and clearly labeled when budget filtering is active, trimmed to
  essential fields to save tokens), and the user's preference `summary`.
- **Structured output:** array of `{wine_id, rank, fit_score (0-1), rationale}`; server rejects
  any `wine_id` not in the candidate set (prevents hallucinated bottles).
- **Honesty:** prompt instructs the model to say when nothing is a strong fit rather than
  forcing a pick (PRD FR-12 / C4).

### 6.3 Preference learning
- **Default provider/model:** Gemini (`gemini-2.5-flash`) for Phase 4 testing; DeepSeek
  (`deepseek-v4-flash`) remains available through the same gateway once billing is configured.
  Given recent tastings + current profile → updated structured profile + a concise natural-language
  `summary` (a few sentences). Cheap, runs on tasting save.

### 6.4 AI gateway configuration
- All AI calls run server-side through a small gateway interface, so product code depends on
  `extractWineLabel`, `recommendWines`, and `updatePreferenceProfile`, not provider SDKs.
- Suggested env vars:
  `AI_LABEL_PROVIDER`, `AI_LABEL_MODEL`, `AI_REC_PROVIDER`, `AI_REC_MODEL`,
  `AI_PREF_PROVIDER`, `AI_PREF_MODEL`, `AI_DEEP_REC_PROVIDER`, `AI_DEEP_REC_MODEL`.
- Suggested v1 defaults:
  `AI_LABEL_PROVIDER=gemini`, `AI_LABEL_MODEL=gemini-2.5-flash`,
  `AI_REC_PROVIDER=gemini`, `AI_REC_MODEL=gemini-2.5-flash`,
  `AI_PREF_PROVIDER=gemini`, `AI_PREF_MODEL=gemini-2.5-flash`.
- Provider keys stay in server env vars only. Start with the cheapest provider likely to meet
  quality needs, then benchmark against real cellar labels and recommendation prompts.
- Log provider, model, latency, fallback usage, and compact error reason for AI calls. Avoid storing
  full provider responses unless needed for debugging, because label photos and OCR text may be
  private.

---

## 7. Security & Privacy
- AI provider keys and Supabase service role key live only in server env vars (Vercel project
  settings).
- RLS is **defined on every table** from day one (policy: a row is visible/editable only where its
  owning `app_users` row has `auth_user_id = auth.uid()`). It is not relied on for isolation in v1
  because v1 has a single owner.
- Photos in a private Storage bucket; served via short-lived signed URLs.

### 7.1 v1 auth posture (single-user, "open" mode)
**Chosen approach: BFF + service role + fixed owner id.**

- All database and storage access goes through the Next.js server (the BFF). The browser never
  talks to Supabase directly in v1.
- The server uses the **service-role key** and stamps every row with a fixed `OWNER_USER_ID`
  (env var). There is no login screen in v1.
- RLS policies are written and enabled now, but the service role bypasses them — so they sit
  dormant until release rather than needing to be added later.

**Release upgrade path (no re-architecture):**
1. Turn on Supabase Auth (email/OAuth) and add a login screen.
2. Map the owner `app_users` row to the Supabase Auth user via `auth_user_id`.
3. In the BFF, derive `user_id` from the authenticated session's mapped `app_users.id` instead of
   `OWNER_USER_ID`.
4. Set `REQUIRE_AUTH=true`. RLS — already present — now actively enforces per-user isolation.

Because every table already carries `user_id` and all access already flows through the BFF, this
is a configuration/auth swap, not a data-model or access-pattern change.

---

## 8. Environments & Deployment
- **Local:** Next.js dev + a Supabase project (or local Supabase CLI). `.env.local` for keys.
- **Prod:** Vercel (app) + hosted Supabase. Push-to-deploy from GitHub `main`.
- **Secrets:** `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, optional `ANTHROPIC_API_KEY`,
  `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Migrations:** SQL migration files checked into the repo (Supabase migrations).

---

## 9. Phased Delivery Plan

| Phase | Scope | Outcome |
|---|---|---|
| **0. Scaffold** | Next.js + Tailwind + Supabase project, schema + RLS, auth in open mode, deploy a "hello cellar". | Skeleton deployed. |
| **1. Capture** | Photo upload, hosted vision extraction, confirm form, save wine, photo storage. | Can catalog wines. |
| **2. Cellar** | List/grid, search/filter, detail, edit, quantity +/-, inventory event history. | Usable inventory. |
| **3. Recommend** | Recommendation form + endpoint + DeepSeek reasoning + results UI. | Core value delivered. |
| **4. Preferences** | Tasting log + preference profile + injection into recs. | Recs get personal. |
| **5. Polish/PWA** | Manifest, icons, install prompt, empty/error states, cost guardrails. | Complete — shippable personal app baseline. |
| **6. (Later) Release** | Enforce auth, multi-user check, README, optional Capacitor wrap. | GitHub / App Store ready. |
| **7. (Later) Optional extra label image** | Let a capture include a back label / second image when the front label is insufficient. | Better extraction for difficult labels. |
| **8. (Later) Multi-bottle capture** | Vision returns an array of detected bottles from one photo; batch confirm flow. | Faster bulk cataloging. |
| **9. (Later) Tasting Experience tab** | Lineup photo + per-bottle live tasting notes; feeds preference memory. | Richer palate profiling. |
| **10. (Later) Web price enrichment** | When `cost_per_bottle` is blank, web-search an estimated market price; also scores/drink-window. | Backs OQ-2 fallback. |

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Label OCR misreads (faded/foreign labels) | User confirmation step; confidence flags; manual edit always available. |
| AI recommends a wine not in cellar (hallucination) | Server validates `wine_id` against candidate set; reject + retry. |
| AI cost creep | Trim prompt payloads; downscale images; DeepSeek for text defaults; log token usage; reserve stronger models for explicit fallback/deep-pick paths. |
| AI provider outage / rate limits | Bounded retry on transient failures; provider-agnostic fallback; manual editable capture remains available. |
| Provider quality varies by task | Keep the AI gateway provider-agnostic; benchmark label extraction and recommendations on real examples before locking defaults. |
| iOS PWA camera quirks | Use standard `<input capture>`; test on real device early; Capacitor as fallback path. |
| Unknown prices weaken budgeted recs | Include unknown-price wines with explicit labeling; prompt for exact price or price band when web enrichment is unreliable. |
| Abandoned capture leaves orphaned photos | Store uploaded photos with a temporary marker and periodically delete unreferenced objects older than a short retention window. |
| Vendor lock-in (Supabase) | Standard Postgres + S3-style storage; portable if needed. |

---

## 11. Decisions Locked (from alignment)
- Single-user v1, **architecture multi-user-ready** (RLS + `user_id` everywhere).
- v1 auth posture: **BFF + service-role key + fixed `OWNER_USER_ID`**, no login screen. RLS defined
  and enabled now (dormant under service role); release flips to session-derived `user_id` +
  `REQUIRE_AUTH=true` with no data-model change (see §7.1).
- Recommendation input is **occasion + cuisine + price range only** (number of guests and
  "open now vs. save" dropped from v1).
- Capture = hosted vision label extraction through the AI gateway with user confirmation; **one
  bottle per photo in v1**, multi-bottle capture deferred to a later phase.
- Recommender = **DeepSeek text reasoning over the cellar + a learned preference memory**, **top 3**
  picks, with optional stronger-model fallback/deep-pick mode.
- Region stored at **both country and region** granularity.
- Cost **optional at capture**; blank cost later filled via **web-search price estimate** (depends
  on web-enrichment phase). If no reliable estimate exists, prompt for exact price or price band;
  budget-filtered recommendations still include unknown-price wines, clearly labeled.
- Price bands are fixed USD buckets: `$100 or less`, `$101-$200`, `$201-$300`, `$301-$500`,
  `$500+`.
- Primary browser **Chrome**, built as a standard PWA (iOS Safari also supported).
- Duplicate wines / repurchases remain separate records; latest user-entered price can be used
  when a single price is needed across records.
- Quantity decrements only after a tasting is logged or the user confirms the bottle was opened.
- Quantity changes should eventually write `inventory_events`; `wines.quantity` remains the current
  read-optimized total.
- Wine deletion = **hard delete** (row + cascade events). No `remove` event type in v1; active
  inventory event types are `purchase | adjustment | consume`.
- Tasting logging lives on the **wine detail page** in v1 and **does not change quantity** (keeps
  `inventory_events` the single source of truth for stock; avoids double-counting). Voice-driven
  tasting capture is deferred to a future feature.
- Planned future tabs/features: **Tasting Experience** (lineup photo + live notes) and
  **multi-bottle capture**, both feeding the preference-memory layer. Optional back-label /
  second-image capture is also deferred.
- Stack = **Next.js + Supabase + provider-agnostic AI gateway + Vercel**, PWA-first, Capacitor as
  the App Store path. v1 AI defaults: hosted vision model for labels, DeepSeek for text recs and
  preference updates.

## 12. Competitive Reference Notes

Two external cellar repos are useful references, but neither changes the core stack decision:

- **Cellarion:** useful as a maturity reference for AI service boundaries, label-scan prompts,
  retry/debug behavior, wine normalization, and future drink-window/search ideas. Do not copy its
  heavier stack for v1: MongoDB, Meilisearch, Qdrant/vector search, background services, admin,
  subscriptions, and full AI chat are outside this app's current scope.
- **WineBox:** useful as the closer Phase 1/2 reference. Borrow the simple scan -> review/edit ->
  check-in flow, optional back-label shape, raw OCR/vision text capture, and transaction-style
  inventory history. Direct code reuse is not planned because the stack is Python/FastAPI/MongoDB,
  while this app is Next.js/Supabase.
