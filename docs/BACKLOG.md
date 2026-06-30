# Backlog / Deferred Items

Small, known gaps and follow-ups that are intentionally **not** blocking the current phase.
Each item notes where it should land. Keep this list short — promote items into a phase plan when
they become active work.

---

## Infrastructure / reproducibility

- **`wine-labels` bucket is not codified (Phase 1 item 5).** The private Storage bucket was created
  via the Supabase dashboard, not a checked-in migration, so a fresh environment isn't reproducible
  from the repo.
  - *Where:* `supabase/`. Action: add a migration (or a documented setup step in README) that
    creates the private `wine-labels` bucket. Do alongside the Phase 2 `inventory_events` migration.

## Cellar (Phase 2 follow-ups)

- **Abandoned pending label cleanup.** Wine delete now removes referenced label objects, but a user
  can still abandon capture after extraction and leave an unreferenced `pending/` Storage object.
  Add a small admin/scripted sweep for `pending/` objects older than a short retention window.
  - *Where:* `supabase/storage` or a one-off maintenance script. Target: Phase 6 or later.

- **Search term injected into PostgREST `.or()`.** `listWines` interpolates the user query into the
  `.or()` filter string; commas are stripped but `()`/`\`/`%`/`_` are not. Low severity in v1
  (single-user, service-role, own rows only) but sanitize/escape before multi-user release, and to
  avoid query errors on odd input.
  - *Where:* `src/lib/cellar.ts` `listWines`.

- **Edit form Price Band not disabled when cost present.** A band picked in the edit form is
  silently overridden by the cost-derived band on PATCH. Disable it when a cost exists (the Add
  form already does). *Where:* `src/components/wine-edit-form.tsx`.

- **List signs a URL per wine per load.** Fine for tens–hundreds of bottles; if the cellar grows,
  batch/caches signed URLs or add pagination. *Where:* `src/lib/cellar.ts`.

## Schema tidy (optional)

- **Tighten `inventory_events` CHECK constraint to drop `remove`.** v1 uses hard delete and never
  emits a `remove` event; app-layer types already exclude it, but the Phase 2 migration's CHECK
  still permits `purchase|adjustment|consume|remove`. Optional new migration to `alter` the
  constraint to the three active types. Purely cosmetic — no behavior depends on it.

## Security (release-time)

- **Storage RLS policies.** The bucket is private and only reached via the service-role BFF, so v1
  needs no Storage RLS. Before multi-user release, add Storage policies so objects are scoped per
  `app_users` owner (mirrors the table RLS already defined).
  - *Where:* Phase 6 (Release).

## Future features (product)

- **Voice-driven tasting capture.** Instead of typing on the wine detail page, the user speaks the
  wine name + rating + tasting notes; the app transcribes, **fuzzy-matches the spoken wine to the
  right cellar bottle**, and logs the tasting. Nicer during an actual tasting. Deferred from v1
  because it needs speech capture (Web Speech API / a transcription provider) plus a wine-matching
  step. v1 logs tastings manually on the detail page (Phase 4).
  - *Where:* new capture flow feeding `POST /api/tastings`; also see the "Tasting Experience tab"
    idea in PRD §6. Builds on Phase 4.

---

## Notes for upcoming phases (tracked elsewhere, listed here for visibility)

- **Phase 2:** `inventory_events` table + migration, the `wines.quantity` ↔ events invariant
  (single transaction), and a backfill of one `purchase` event per existing wine. See DESIGN §3.

---

## Recently resolved

- **Phase 5:** AI extraction retry on transient Gemini errors.
- **Phase 5:** HEIC/HEIF capture failure now stops before upload with clear user-facing guidance.
- **Phase 5:** Wine delete now removes the referenced label image as best-effort cleanup.
