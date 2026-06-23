# Phase 2 — Cellar Management (Plan)

**Companion to:** [DESIGN.md](./DESIGN.md) §3, §4.2, §5 · [PRD.md](./PRD.md) Epic B
**Depends on:** Phase 1 capture flow deployed and smoke-tested.

**Goal:** make the saved cellar usable day to day: browse, search, inspect, edit, delete, and adjust
stock while preserving an auditable inventory history.

**Exit criteria:**
- I can search/filter the cellar list and open a wine detail page.
- I can edit normal wine fields without changing stock.
- I can consume/add/adjust quantity and see the current quantity update.
- Every stock change writes an `inventory_events` row in the same database transaction.
- Existing Phase 1 wines are backfilled with one `purchase` event.

---

## Scope

**In scope (Phase 2):**
- `inventory_events` migration, RLS policies, backfill, and atomic RPC helpers.
- Wine detail page at `/wines/[id]`.
- Edit/delete wine APIs.
- Quantity event API using `purchase | adjustment | consume | remove`.
- Search/filter list UI.

**Out of scope (later phases):**
- Recommendation flow and acceptance tracking -> Phase 3.
- Tasting notes and preference learning -> Phase 4.
- Full event timeline UI polish, charts, and analytics.
- Codifying the `wine-labels` bucket if not needed for the immediate Phase 2 deploy.

---

## Database

- Add `inventory_events`.
- Backfill existing rows with one `purchase` event per wine where `quantity > 0`.
- Add `apply_inventory_event(...)` RPC:
  - locks the wine row,
  - checks the new quantity is nonnegative,
  - updates `wines.quantity`,
  - inserts the event,
  - returns the created event.
- Add `create_wine_with_purchase_event(...)` RPC so new captures create the wine and initial
  purchase event in one transaction.

Invariant: `wines.quantity` is a read-optimized cache and can be reconciled from event history.
Any stock-changing write must update the cache and event log together.

---

## API

| Method & path | Purpose |
|---|---|
| `GET /api/wines/:id` | Load wine detail. |
| `PATCH /api/wines/:id` | Edit non-stock fields. |
| `DELETE /api/wines/:id` | Delete a wine row. |
| `POST /api/wines/:id/inventory-events` | Add stock event and update quantity atomically. |

---

## Frontend

- Home list gains search/filter controls.
- Each list item links to `/wines/[id]`.
- Detail page shows label, core fields, current quantity, and edit/delete/quantity controls.
- Quantity controls support:
  - consume one bottle,
  - add bottles,
  - manual adjustment.

---

## Verification

- Run the Phase 2 migration in Supabase SQL Editor.
- Confirm existing wines get backfilled purchase events.
- Save a new wine and confirm an initial purchase event is created.
- Consume/add/adjust quantity and confirm the row quantity changes as expected.
- Run `pnpm lint`, `pnpm typecheck`, and `pnpm build`.
