# Phase 0 — Scaffold Checklist

**Companion to:** [DESIGN.md](./DESIGN.md) §9 (Phased Delivery Plan) · [PRD.md](./PRD.md)
**Last updated:** 2026-06-15

**Goal of Phase 0:** a deployed skeleton ("hello cellar") with the database, schema, RLS, BFF
wiring, and AI gateway stubs in place — no real cellar features yet.

**Exit criteria:** a live URL listing seeded wines; schema + RLS in place; all secrets server-side
only; browser → Next.js server (BFF) → Supabase path proven end to end.

---

## A. Accounts & keys — *owner* (one-time, ~15 min)

- [x] **Supabase project** — create at supabase.com (region near you; save the DB password).
      From Project Settings → API, collect:
  - [x] Project URL → `SUPABASE_URL`
  - [x] `anon` public key → `SUPABASE_ANON_KEY`
  - [x] `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` *(secret — server only)*
- [x] **GitHub repo** — empty repo for the project (enables push-to-deploy).
- [x] **Vercel account** — sign in with GitHub (connected at the end of Phase 0).
- [x] **Node 20+** installed locally (`node -v`).
- [ ] **AI provider keys** can wait until Phase 1/3. If available now, collect:
  - [ ] Hosted vision key, e.g. `GEMINI_API_KEY`
  - [ ] DeepSeek key → `DEEPSEEK_API_KEY`
  - [ ] Optional fallback key, e.g. `ANTHROPIC_API_KEY`

> Phase 0 can be completed without live AI keys because the AI gateway uses stubs.

---

## B. Scaffold & wiring — *implementation*

- [x] Initialize **Next.js (App Router, TypeScript) + Tailwind + shadcn/ui** in `cellar-app/`.
- [x] Add **PWA basics**: web manifest + placeholder icons. Defer real service-worker caching to
      Phase 5 unless the chosen PWA package makes it trivial.
- [x] Add **Supabase server client** (the BFF) using the service-role key, reading `OWNER_USER_ID`
      (per the v1 auth posture, DESIGN §7.1). Browser never talks to Supabase directly.
- [x] Add a thin **provider-agnostic AI gateway** module (server-side) with stub implementations
      for `extractWineLabel`, `recommendWines`, and `updatePreferenceProfile` so vision/text
      providers can be swapped without touching feature code (DESIGN §2, §6).
- [x] Write the **SQL migration** for the schema in DESIGN §3 (`wines`, `tastings`,
      `preference_profiles`, `recommendations`) + **RLS policies** (defined and enabled, dormant
      under the service role in v1).
- [x] Add a **seed**: fixed `OWNER_USER_ID` + a couple of sample wines.
      - Use a real UUID and stamp it on seeded rows.
      - If `wines.user_id` references Supabase Auth directly, create the matching auth user before
        seeding; otherwise use an app-owned owner/profile table that can later map to Auth.
- [x] Define the shared **Zod schemas** (wine, extraction output) reused by API + forms.
- [x] Build a **"hello cellar" page**: server-fetches wines via the BFF and lists them — proves the
      full path works.
- [x] Add **`.env.example`** + local `.env.local`, and a short **README** with run/deploy steps.

---

## C. Deploy — *together*

- [x] Push to GitHub.
- [x] Import the repo into **Vercel**; add env vars; deploy.
- [x] Run the migration against the Supabase project.
- [x] Confirm the deployed "hello cellar" lists the seeded wines.

---

## D. Verification

- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `pnpm build` passes.
- [x] Migration applies cleanly to Supabase.
- [x] Seeded wines appear locally through the BFF.
- [x] Seeded wines appear on the deployed Vercel URL.
- [x] Service-role key and AI provider keys are not exposed to the browser bundle.

---

## Suggested env vars

```
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only

# v1 auth posture (single-user / open mode)
OWNER_USER_ID=                    # fixed owner uuid stamped on all rows
REQUIRE_AUTH=false                # flip to true at release

# AI gateway (provider-agnostic)
GEMINI_API_KEY=                   # hosted vision provider key, optional in Phase 0
DEEPSEEK_API_KEY=                 # recommendation + preference text, optional in Phase 0
ANTHROPIC_API_KEY=                # optional fallback/deep-pick provider

AI_LABEL_PROVIDER=gemini
AI_LABEL_MODEL=gemini-2.5-flash
AI_REC_PROVIDER=deepseek
AI_REC_MODEL=deepseek-v4-flash
AI_PREF_PROVIDER=deepseek
AI_PREF_MODEL=deepseek-v4-flash
```

---

## Kickoff order

Start with **scaffold** (Next.js project) and **schema + migration**. Supabase keys are needed to
prove the BFF and deployed "hello cellar" page. AI provider keys are not needed in Phase 0 because
the gateway can return stubbed responses until capture/recommendation work begins.
