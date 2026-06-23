# Cellar App

Personal wine-cellar PWA scaffolded from the Phase 0 checklist.

## Local Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create `.env.local` from `.env.example` and fill in Supabase values.

3. Run the app:

   ```bash
   pnpm dev
   ```

4. Open `http://localhost:3000`.

## Database

In the Supabase dashboard, open **SQL Editor** and run:

1. `supabase/migrations/20260622000000_phase0_schema.sql`
2. `supabase/seed.sql`
3. `supabase/migrations/20260623000000_phase2_inventory_events.sql`

The v1 auth posture uses a fixed `OWNER_USER_ID` and service-role BFF access. The browser should
never receive `SUPABASE_SERVICE_ROLE_KEY`.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm build
```
