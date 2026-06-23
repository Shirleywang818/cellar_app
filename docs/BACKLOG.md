# Backlog / Deferred Items

Small, known gaps and follow-ups that are intentionally **not** blocking the current phase.
Each item notes where it should land. Keep this list short — promote items into a phase plan when
they become active work.

---

## Reliability

- **AI extraction retry (DESIGN §6.1).** `extractWineLabel` currently makes a single Gemini attempt
  and falls back to a manual/empty form on any failure. Design specifies "retry once on 429/5xx with
  bounded backoff." Add a single bounded retry on transient errors.
  - *Where:* `src/lib/ai/gateway.ts` (`extractWithGemini`). Target: Phase 3 (when AI hardening
    happens for recommendations) or sooner if extraction flakiness shows up.

## Capture / images

- **HEIC handling on iOS Safari (Phase 1 item 4).** `downscaleImage` uses `createImageBitmap`,
  which may not decode HEIC/HEIF in all browsers. On failure it uploads the original file, and a raw
  HEIC may be rejected by the vision provider. Low risk on Chrome/Android (JPEG), real risk on iOS
  Safari camera capture.
  - *Where:* `src/components/add-wine-form.tsx`. Action: test on a real iPhone; if needed, convert
    HEIC → JPEG before upload or reject with a clear message. Revisit during Phase 5 (PWA/device
    testing) or before any iOS demo.

## Infrastructure / reproducibility

- **`wine-labels` bucket is not codified (Phase 1 item 5).** The private Storage bucket was created
  via the Supabase dashboard, not a checked-in migration, so a fresh environment isn't reproducible
  from the repo.
  - *Where:* `supabase/`. Action: add a migration (or a documented setup step in README) that
    creates the private `wine-labels` bucket. Do alongside the Phase 2 `inventory_events` migration.

## Security (release-time)

- **Storage RLS policies.** The bucket is private and only reached via the service-role BFF, so v1
  needs no Storage RLS. Before multi-user release, add Storage policies so objects are scoped per
  `app_users` owner (mirrors the table RLS already defined).
  - *Where:* Phase 6 (Release).

---

## Notes for upcoming phases (tracked elsewhere, listed here for visibility)

- **Phase 2:** `inventory_events` table + migration, the `wines.quantity` ↔ events invariant
  (single transaction), and a backfill of one `purchase` event per existing wine. See DESIGN §3.
