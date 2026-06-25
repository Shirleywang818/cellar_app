# Wine Cellar App — Product Requirements Document (PRD)

**Status:** Draft for alignment
**Owner:** Shirley
**Last updated:** 2026-06-15
**Version:** v1 scope (with v2+ noted)

---

## 1. Summary

A browser-first web app (PWA, optimized first for Chrome on desktop/Android, with iOS Safari
support) that lets a wine owner (1) **catalog** the bottles in their cellar by snapping a photo
of the label, and (2) get an **AI recommendation** of which bottle(s) to open for a given
occasion and cuisine, within a target price range, informed by the owner's evolving taste
preferences.

Single user at launch, but built so it can be opened up to multiple users and published
(GitHub / App Store) later without re-architecting.

---

## 2. Goals & Non-Goals

### Goals (v1)
- G1. Add a wine to the cellar in **< 30 seconds** from photo to saved record.
- G2. AI extracts label fields (producer, name, vintage, varietal, region, country) from a
  photo with the user confirming/correcting before save.
- G3. Browse / search / filter the cellar; see quantity on hand.
- G4. Get a ranked recommendation from **my own cellar** given: occasion + cuisine + budget,
  with a short rationale for each pick.
- G5. Capture lightweight feedback (rating + notes after drinking) that improves future recs.
- G6. Works great in the primary browser target and remains installable to a phone home screen.

### Non-Goals (v1)
- N1. No marketplace / buying wine in-app.
- N2. No external price/rating enrichment from the web (deferred to v2).
- N3. No multi-user sharing UI (architecture supports it; UI not built yet).
- N4. No barcode/UPC scanning (label vision only in v1).
- N5. No offline-first sync engine (basic PWA caching only).
- N6. **One bottle per photo in v1** (multi-bottle photo capture is a planned v2 feature).

---

## 3. Users & Personas

| Persona | Description | Primary needs |
|---|---|---|
| **Owner (me)** | Owns a personal cellar of tens–hundreds of bottles. Uses phone in the cellar and at the dinner table. | Fast capture; trustworthy recommendations; remembers what I liked. |
| *(Future) Guest/household* | Someone I share my cellar with read-only, or a second owner. | View cellar, get recs. |

---

## 4. Core User Stories

### Epic A — Capture & Catalog
- A1. *As the owner, when a wine arrives, I take a photo of the label (one bottle in v1) and the
  app pre-fills the wine's details so I just confirm and save.*
- A2. *I can add quantity (e.g. 6 bottles) and optionally cost per bottle and purchase date.*
- A3. *I can add storage location/notes (e.g. "Rack B, row 3").*
- A4. *I can edit or delete a wine, and adjust quantity when I drink or add bottles.*
- A5. *If the AI misreads the label, I can correct any field before saving.*
- A6. *If I repurchase the same wine later, I can keep it as a separate cellar record so purchase
  date, price, and location can differ from the earlier bottles.*

### Epic B — Browse & Search
- B1. *I can see all wines in my cellar as a scrollable list/grid with the label photo.*
- B2. *I can search by name/producer and filter by type (red/white/sparkling/rosé/dessert),
  region, vintage, and price band.*
- B3. *I can open a wine to see full details, photo, quantity, cost, and my past tasting notes.*

### Epic C — Recommend
- C1. *I describe the occasion (free text or quick chips: friends gathering, celebration,
  birthday, romantic, casual weeknight) and the cuisine (e.g. Chinese hotpot, French, steak).*
- C2. *I set a price range (or "any").*
- C3. *The app returns 1–3 recommended bottles from my cellar, each with a one-paragraph
  rationale (why it fits the food, occasion, and my taste) and the price or "unknown price".*
- C4. *If nothing in my cellar fits well, the app says so honestly and suggests the closest
  option and what's missing.*
- C5. *I can accept a recommendation, then decrement quantity only after I either log a tasting
  or explicitly confirm that the bottle was opened.*

### Epic D — Preferences & Memory
- D1. *After drinking, I can rate the wine (1–5) and add tasting notes.*
- D2. *The app builds a preference profile from my ratings/notes (e.g. "prefers bold reds,
  dislikes oaky Chardonnay") and uses it in future recommendations.*
- D3. *I can view and edit my preference profile in plain language.*

---

## 5. Functional Requirements

### 5.1 Wine capture
- FR-1. Accept a photo from camera or library; show capture preview.
- FR-2. Send image to vision model; return structured fields:
  `producer, cuvée/name, vintage, wine_type, grape varietals[], region, country, alcohol_pct?`.
- FR-3. Render an editable confirmation form pre-filled with extracted values + confidence hint.
- FR-4. Persist wine record + photo; default quantity = 1.
- FR-5. Optional fields at capture: quantity, cost per bottle, currency, purchase date, location.
- FR-5a. Repurchases of the same wine are allowed as separate records; if a wine-level price is
  needed across duplicate records, use the latest user-entered price.

### 5.2 Cellar management
- FR-6. List view with photo thumbnail, name, vintage, type, qty, price band.
- FR-7. Search (text) + filters (type, region, vintage range, price band, in-stock only).
- FR-8. Detail view with edit/delete and quantity +/-.

**Price bands (USD, v1):** `$100 or less`, `$101-$200`, `$201-$300`, `$301-$500`, `$500+`.
If exact price exists, derive the band automatically. If exact price is unknown, the user may
select a band directly.

### 5.3 Recommendation
- FR-9. Input form: occasion (chips + free text), cuisine (chips + free text), price range.
- FR-10. Backend assembles candidate wines (in-stock, within budget, plus unknown-price wines
  marked as unknown when budget filtering is active) + user preference profile, calls LLM,
  returns ranked picks with rationale + confidence.
- FR-11. Each result links to the wine's detail page.
- FR-12. Graceful "no strong match" handling (FR honesty over forced answer).

### 5.4 Feedback & preferences
- FR-13. Log tasting: rating (1–5), free-text notes, date, paired-with (optional).
- FR-14. Maintain a derived preference profile (structured + natural-language summary) updated from tastings; editable by user.

### 5.5 Cross-cutting
- FR-15. Auth layer present but in "single-user / open" mode for v1; flip to required login for release.
- FR-16. PWA installable; camera access; responsive browser-first, mobile-ready layout.

---

## 6. Future / Backlog (v2+)

- **Multi-bottle capture:** photograph several bottles in one shot; AI detects each bottle,
  returns a list of extracted wines, and the user confirms/adjusts quantities in one batch flow.
  (v1 is one bottle per photo.)
- **Optional back-label / second-image capture:** allow the user to add a back label or second
  photo when the front label is insufficient, then send both images to extraction.
- **Tasting Experience tab:** a dedicated section for live tasting sessions — photograph the
  lineup, then add personal tasting notes and preferences bottle-by-bottle as you go. These notes
  feed the same preference-memory layer to further tailor palate profiling and recommendations.
- **Web enrichment:** look up typical market price, critic scores, drink-window, tasting notes for a wine after capture. Also backs the "estimate price when cost left blank" behavior (see OQ-2).
- **Drink-window alerts:** "These 3 bottles are entering their peak / past prime."
- **Barcode / receipt / order-email import** for bulk add.
- **Multi-user & sharing:** household cellars, share a wishlist, "what should we open tonight" for a group.
- **Inventory value & analytics:** total cellar value, by region/type, cost basis.
- **Native app wrapper** (Capacitor) for App Store distribution + better camera/widgets.
- **Voice input** for occasion/cuisine; **"snap the menu"** to recommend against a restaurant dish.
- **Voice-driven tasting capture:** speak the wine name + rating + tasting notes; the app
  transcribes and **fuzzy-matches the spoken wine to the right cellar bottle** before logging.
  Nicer than typing during a tasting; deferred from v1 (needs speech capture + a matching step).
  In v1, tasting is logged manually from the wine detail page (see Phase 4).

---

## 7. Success Metrics

| Metric | Target (personal v1) |
|---|---|
| Time to add a wine (photo → saved) | < 30s median |
| Label extraction field accuracy (key fields) | > 90% need no edit |
| Recommendation acceptance rate | > 60% of recs accepted/found helpful |
| Tastings logged per month | trending up (engagement) |

---

## 8. Constraints & Assumptions

- Solo developer; prefer low-ops managed services and a single language/stack.
- Per-action AI cost should stay small (cents per scan / rec). Use cost-appropriate models.
- Chrome is the primary browser target because it simplifies browser-first implementation and
  hosting validation; keep the app standards-based so iOS Safari remains supported.
- Internet connection assumed available at capture and recommendation time.

---

## 9. Resolved Decisions (formerly open questions)

- OQ-1. **Currency = USD.**
- OQ-2. **Cost is optional at capture.** If left blank, the app first tries a web-search
  estimated market price when web enrichment exists. If no reliable source is found, prompt the
  user for either an exact price or a price band. During recommendation, budget-filtered requests
  still include unknown-price wines, clearly marked as unknown.
- OQ-2a. **Price bands = USD cellar buckets:** `$100 or less`, `$101-$200`, `$201-$300`,
  `$301-$500`, `$500+`.
- OQ-3. **Top 3 recommendations** per request, with #1 highlighted.
- Region granularity: store **both country and region** for every wine (already in the data model).
- Target browser: **Chrome** (desktop + Android). Still built as a standard PWA so iOS Safari and
  the home-screen-installed experience also work.
- Duplicate wines / repurchases: allow separate records; if a single price is needed, use the
  latest user-entered price.
- Recommendation acceptance: quantity decrements only after tasting is logged or the user confirms
  the bottle was opened.
- AI provider strategy: use a hosted vision model for label extraction; use DeepSeek for
  cost-efficient text recommendation and preference-profile updates; keep the AI integration
  provider-agnostic so models can be swapped after benchmarking.
