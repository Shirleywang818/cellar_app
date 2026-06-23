# Phase 1 — Capture & Catalog (Plan)

**Companion to:** [DESIGN.md](./DESIGN.md) §4.1, §5, §6.1 · [PRD.md](./PRD.md) Epic A, FR-1–FR-5a
**Depends on:** Phase 0 complete (scaffold, schema, BFF, gateway stubs).

**Goal:** snap a label → AI pre-fills fields → user confirms/edits → wine saved to the cellar with
its photo. Replaces the `extractWineLabel` stub with a real vision call.

**Exit criteria:**
- From the deployed app I can photograph (or upload) a bottle label and get fields pre-filled.
- I can correct any field, add quantity/cost/location, and save.
- The saved wine (with its photo) appears in the cellar list.
- Low-confidence fields are visibly flagged; vintage is left blank when not on the label.

---

## Scope

**In scope (Phase 1):**
- Image capture UI (camera + library) with client-side downscale and preview.
- `POST /api/wines/extract` — store image, run vision, return structured fields + confidence.
- Confirmation form pre-filled from extraction; editable; optional fields.
- `POST /api/wines` — validate + persist via the BFF (stamps `OWNER_USER_ID`), link photo.
- Real **Gemini vision** provider behind the existing gateway interface.
- Price-band auto-derivation from `cost_per_bottle`; manual band when price unknown.

**Out of scope (later phases):**
- Browse / search / filter, detail view, edit/delete, quantity +/- → **Phase 2**.
- Recommendations → Phase 3. Tasting/preferences → Phase 4.
- Multi-bottle photo, back-label second image, web price enrichment → backlog.
- Scheduled orphan-photo cleanup job → Phase 5 (Phase 1 only *marks* temp uploads).

---

## Prerequisites (before coding)

1. **`GEMINI_API_KEY`** in `.env.local` and Vercel env (vision is no longer optional).
2. Confirm a valid vision model id for `AI_LABEL_MODEL` (e.g. `gemini-2.5-flash`).
3. **Supabase Storage bucket** `wine-labels`, **private**. (New infra — see below.)

---

## Infrastructure changes

- **Storage bucket `wine-labels` (private).** Add as a migration or a documented dashboard step.
  - Photos stored at `labels/{OWNER_USER_ID}/{uuid}.{ext}`.
  - Served to the UI via short-lived **signed URLs** generated server-side (never public).
- No schema changes needed — `wines.photo_path`, `extraction_meta`, `price_band`, `price_source`
  already exist from Phase 0.

---

## Backend

### Gateway: real vision (`src/lib/ai/gateway.ts`)
- Implement `extractWineLabel(imageBytes, mimeType)` against Gemini using `AI_LABEL_PROVIDER` /
  `AI_LABEL_MODEL`.
- Prompt rules (DESIGN §6.1): return **only** JSON matching `extractionOutputSchema`; `null` for
  anything not clearly visible; **never guess vintage**; include a `confidence` (0–1) per field.
- Validate the model output with Zod; on failure, one retry, then return a low-confidence empty
  result so the user can fill the form manually (capture must never hard-fail).
- Keep it provider-swappable: a `getLabelProvider()` switch so DeepSeek/Anthropic could slot in.

### `POST /api/wines/extract`
1. Accept multipart image (already downscaled client-side).
2. Upload to `wine-labels` under a temp path; record the object key.
3. Call `extractWineLabel`; assemble `{ fields, confidence, photo_path }`.
4. Return to client. **No DB write yet** (matches §4.1 — record is created only on save).
5. Mark the uploaded object as temp (e.g. metadata or a `pending/` prefix) for later cleanup.

### `POST /api/wines`
1. Validate body against a new `createWineSchema` (below).
2. Derive `price_band` from `cost_per_bottle` when present; else use the user-selected band;
   set `price_source` = `user` (or `unknown` when neither given).
3. Insert via the service-role BFF, stamping `user_id = OWNER_USER_ID`, linking `photo_path`,
   storing `extraction_meta` (model, confidence, raw extracted fields).
4. Move/confirm the photo out of temp state so cleanup won't reap it.
5. Return the created wine id.

---

## Frontend

- **Add-wine entry point** (e.g. `/add`): `<input type="file" accept="image/*" capture>` for
  camera on mobile + library fallback; show a preview.
- **Client-side downscale** (canvas) before upload to control cost/bandwidth (DESIGN §6.1).
- On extract response, render the **confirmation form** pre-filled:
  - Fields: producer, name, vintage (blank = NV), wine_type (select), varietals (chips/text),
    region, country, alcohol_pct.
  - Optional: quantity (default 1), cost_per_bottle + currency, price_band (shown when cost
    empty), purchase_date, location, notes.
  - **Confidence hints:** visually flag fields the model returned with low confidence.
- On save → `POST /api/wines` → redirect to the cellar list; the new wine shows there.

---

## Validation / schemas (`src/lib/schemas.ts`)

- Reuse `extractionOutputSchema` for the extract response.
- Add **`createWineSchema`**: required `producer, name, wine_type`; optional everything else;
  `varietals` defaults `[]`; enforce `price_band` enum; cross-field rule so a wine ends up with
  either a `cost_per_bottle` or a `price_band` or is explicitly `price_source = unknown`.
- Extend `src/types/database.ts` `wines` Insert/Row if any field typing is missing.

---

## Data flow (happy path)

```
Camera → downscale → POST /api/wines/extract
   → Storage (temp) + Gemini vision → {fields, confidence, photo_path}
   → Confirmation form (user edits) → POST /api/wines
   → validate + derive price_band + insert (BFF, OWNER_USER_ID) + finalize photo
   → cellar list shows the new bottle
```

---

## Edge cases & guardrails

- **Vision unavailable / bad output:** never block capture — fall back to an empty, fully manual
  form. Surface a quiet "couldn't read the label, please enter details" notice.
- **No vintage on label:** leave blank (NV), do not invent.
- **Unknown price:** allow save with a price band only, or `price_source = unknown`.
- **Abandoned capture:** photo stays in temp state and is eligible for later cleanup (job in P5).
- **Cost control:** one vision call per scan; downscale before upload; log token/usage if easy.
- **Image size/type limits:** reject non-images and oversized uploads server-side.

---

## Verification

- Unit: `createWineSchema` validation; price-band derivation helper.
- Manual (real device): photograph 3–4 real labels (incl. one NV and one non-English) → confirm
  fields, confidence flags, and that vintage isn't guessed.
- Manual: save → bottle appears in the list with a working signed-URL photo.
- Re-run `pnpm lint && pnpm typecheck && pnpm build`.

---

## Suggested build order

1. Create the `wine-labels` private bucket + signed-URL helper.
2. Implement Gemini `extractWineLabel` + Zod-validate output (test with a sample image).
3. `POST /api/wines/extract` (upload + extract).
4. `createWineSchema` + price-band helper + `POST /api/wines`.
5. Capture UI + downscale + confirmation form + confidence hints.
6. Wire save → redirect → list; manual test on a phone; run checks.
