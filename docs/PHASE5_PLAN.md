# Phase 5 — Polish & PWA (Plan)

**Companion to:** [DESIGN.md](./DESIGN.md) §9, §1 (PWA), §6.4 · [PRD.md](./PRD.md) G6, FR-16
**Depends on:** Phases 1–4 complete (capture, cellar, recommend, preferences).

**Goal:** turn the working feature set into a **shippable personal app** — installable to a phone
home screen, clean empty/error/loading states everywhere, and basic cost/usage guardrails on AI
calls. This is the last phase before Phase 6 (Release).

**Exit criteria:**
- Installable PWA on a real phone home screen (Chrome/Android **and** iOS Safari), with proper
  icons and a working install affordance.
- Every primary flow has sensible **empty, loading, and error** states (no raw crashes/blank pages).
- AI calls are **logged** (provider, model, latency, fallback) and **bounded** against runaway cost.
- Verified on a real iPhone for the core loop (capture → cellar → recommend → tasting).

---

## Decisions (confirmed)

1. **Service worker / offline scope — minimal SW.** Precache the app shell + static assets,
   network-first for data (cellar/recs are inherently online). Full offline-first sync stays out of
   scope (PRD N5). Use a lightweight manual service worker for v1 to avoid adding a dependency;
   register in production only.
2. **Mobile navigation — persistent bottom tab bar** (Cellar · Add · Recommend · Preferences) for a
   native-feel installed app.
3. **Cost guardrail — logging + a hard daily cap.** Structured AI logging plus an env-configurable
   daily call cap that returns a friendly "try again later" (no provider call) when exceeded.

---

## Scope

**In scope (Phase 5):**
- PWA: real icon set, polished manifest, iOS install support, install prompt, minimal service worker.
- Empty / loading / error states across all routes; global error boundary + not-found page.
- Cost guardrails: AI call logging + optional daily cap; reuse existing downscale/candidate caps.
- Mobile polish: responsive review, bottom nav (if confirmed), tap targets, accessibility pass.
- Pull in fitting backlog items (HEIC handling, AI extraction retry) — see below.
- Real-device test pass.

**Out of scope (Phase 6 / later):**
- Auth enforcement, multi-user, README-for-release, Capacitor wrap → **Phase 6**.
- Offline-first data sync, push notifications.
- Multi-bottle capture, tasting tab, web enrichment, voice → backlog.

---

## Work items

### A. PWA install
- **Icons:** replace the single placeholder `public/icon.svg` with a real set — 192/512 PNG
  (`any` + `maskable`) and an `apple-touch-icon` (180px). Generate from one source mark.
- **Manifest:** verify `name`/`short_name`/`theme_color`/`background_color`/`display: standalone`/
  `start_url`; add the icon entries with `purpose`.
- **iOS support:** `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`,
  `apple-touch-icon` links (iOS ignores the manifest icons for the home-screen icon).
- **Service worker:** lightweight manual SW precaches the app shell + static assets; network-first
  for API/data; offline fallback page. Register only in production.
- **Install prompt:** capture `beforeinstallprompt` (Chrome) for an "Add to home screen" button;
  show iOS users the manual "Share → Add to Home Screen" hint (no programmatic prompt on iOS).

### B. Empty / loading / error states
- **Empty:** cellar with no wines (CTA to Add), recommend before first run / no candidates,
  preferences with no profile yet, a wine with no tastings/inventory (already partially handled).
- **Loading:** route-level `loading.tsx` for cellar / detail / recommend / preferences; in-flight
  spinners on Recommend ("Thinking…") and tasting save (already partial).
- **Errors:** app-level `error.tsx` (and per-route where useful) + `not-found.tsx`; friendly copy,
  retry where sensible. Ensure API error messages surface in the UI (mostly done) without leaking
  internals.

### C. Cost & reliability guardrails
- **Logging (DESIGN §6.4):** wrap AI gateway calls to log provider, model, latency, fallback used,
  and a compact error reason — without storing full provider responses (label/notes may be private).
- **Daily cap (if confirmed):** a lightweight per-day counter (DB table or KV) on extraction +
  recommendation + preference calls; over the cap → graceful message, no provider call.
- **Reuse existing controls:** client downscale, candidate cap (~40), trimmed prompts, low temp.

### D. Mobile polish & a11y
- Bottom tab nav (if confirmed) + consistent header.
- Tap-target sizing, focus states, `aria` labels on icon-only buttons, color-contrast check.
- Verify forms and results are comfortable on a ~390px viewport.

### E. Backlog items to fold in here
- **HEIC handling on iOS** (BACKLOG): convert HEIC→JPEG client-side before upload or reject with a
  clear message — directly testable in this phase's device pass.
- **AI extraction retry** (BACKLOG): add the single bounded retry on 429/5xx to `extractWithGemini`
  to match the recommendation/preference paths' resilience.
- *(Optional)* **Orphaned-photo cleanup** (BACKLOG): delete the Storage object on wine delete and/or
  sweep abandoned `pending/` uploads — fits the "guardrails" theme if time allows.

---

## Validation

- **Lighthouse PWA / installability** check passes (installable, has icons, manifest valid).
- Install on a real **iPhone (Safari)** and **Android/desktop Chrome**; launch from home screen;
  confirm standalone display and icon.
- Walk every route with empty data and with a forced error (e.g. bad network) — no blank/crash.
- Trigger the AI logging path and confirm a log line per call; if cap enabled, confirm the friendly
  over-cap message.
- Re-run `pnpm lint && pnpm typecheck && pnpm build`.

---

## Suggested build order

1. Confirm the three decisions above.
2. Icons + manifest + iOS meta + install button (highest user-visible payoff).
3. `loading.tsx` / `error.tsx` / `not-found.tsx` + empty states.
4. AI logging wrapper (+ daily cap if confirmed).
5. HEIC handling + extraction retry (backlog fold-ins).
6. Bottom nav + a11y/mobile polish.
7. Real-device test pass; run checks. → ready for Phase 6 (Release).
