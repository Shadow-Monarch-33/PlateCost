# October 1 Supabase/Auth Foundation — Verification Record

Verification date: 2026-10-01
Commit verified: `39501d6` / `85a8e86` (reconciled canonical architecture foundation)
Branch: `main`

---

## Environment at verification time

| Item | Status |
|------|--------|
| Worktree | Clean |
| Package manager | pnpm 12.4.2 |
| `.env.local` | **Present** — configured locally with real credentials |
| `NEXT_PUBLIC_SUPABASE_URL` | Configured and verified via live HTTPS connection |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Configured and verified via live Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Configured and verified for server-only operations |
| `AI_PROVIDER_API_KEY` | Configured in environment (no SDK in source) |
| `DATABASE_URL` / `SUPABASE_DB_URL` | **Absent** from local environment |
| Supabase CLI | Not installed in PATH; no `supabase/config.toml` |
| Supabase project linkage | Remote project active; migrations not yet applied |

---

## 1. Supabase connection

**PASS**
- `.env.local` environment parsed and validated at runtime via `src/infrastructure/supabase/config.ts` Zod schema (`getPublicSupabaseEnvironment()`).
- Live HTTPS connectivity to the Supabase endpoint verified using `@supabase/supabase-js`.
- Anonymous client initialization succeeded against the live endpoint.

---

## 2. Authentication

**PASS** (Auth session handling, user identity resolution, and unauthenticated boundary verified against real project)

- **Unauthenticated requests**: Verified against the real Supabase Auth endpoint. `getSession()` returned `{ session: null }` and `getUser()` returned `null` with `AuthSessionMissingError`. Unauthenticated requests are not treated as authenticated.
- **Server/client boundaries**:
  - `src/infrastructure/supabase/server.ts` uses `@supabase/ssr` `createServerClient` reading from cookie store — verified SSR client instantiation.
  - `src/infrastructure/supabase/browser.ts` has `"use client"` directive and uses `createBrowserClient` — verified client boundary.
  - `getPublicSupabaseEnvironment()` is safely accessible by browser client; `getSupabaseServiceRoleKey()` is strictly server-only.
- **Authenticated session & identity resolution**:
  - Created an ephemeral test user via admin auth API (`admin.createUser`).
  - Successfully signed in via `signInWithPassword()` through the anon client to receive a real JWT user session.
  - Resolved user identity (`id`, `email`, `aud`) server-side via `auth.getUser(token)` using the real JWT.
  - Successfully cleaned up and deleted the ephemeral test user via `admin.deleteUser()`.

---

## 3. Database

### Local checks

| Check | Result |
|-------|--------|
| `pnpm install` | **PASS** |
| `pnpm lint` | **PASS** |
| `pnpm typecheck` | **PASS** |
| `pnpm test` (2/2) | **PASS** |
| `pnpm build` | **PASS** (Next.js 16.3.8 Turbopack with `.env.local`) |

### Canonical table verification against real Supabase project

All 13 canonical entities were probed against the real Supabase project via PostgREST:

| Entity | Status in Live Project | Code / Detail |
|--------|------------------------|---------------|
| businesses | **NOT FOUND** | PGRST205 (not in schema cache) |
| business_members | **NOT FOUND** | PGRST205 (not in schema cache) |
| ingredients | **NOT FOUND** | PGRST205 (not in schema cache) |
| ingredient_price_history | **NOT FOUND** | PGRST205 (not in schema cache) |
| recipes | **NOT FOUND** | PGRST205 (not in schema cache) |
| recipe_ingredients | **NOT FOUND** | PGRST205 (not in schema cache) |
| menu_items | **NOT FOUND** | PGRST205 (not in schema cache) |
| business_costs | **NOT FOUND** | PGRST205 (not in schema cache) |
| invoices | **NOT FOUND** | PGRST205 (not in schema cache) |
| invoice_items | **NOT FOUND** | PGRST205 (not in schema cache) |
| price_changes | **NOT FOUND** | PGRST205 (not in schema cache) |
| scenarios | **NOT FOUND** | PGRST205 (not in schema cache) |
| business_snapshots | **NOT FOUND** | PGRST205 (not in schema cache) |

**Reason**: The migration files (`20261001120000_create_core_schema.sql` and `20261001184700_reconcile_canonical_architecture.sql`) exist in `supabase/migrations/` but have not yet been executed on this remote Supabase project. No direct database connection string (`DATABASE_URL`/`SUPABASE_DB_URL`) or Supabase CLI access token is configured locally to apply them programmatically.

### Live migration / schema verification

**NOT VERIFIED** — Migrations exist locally but have not been applied to the live database.

---

## 4. RLS / tenant isolation

**NOT VERIFIED — structural inspection only**

Cross-tenant RLS was evaluated:
- **Real authenticated sessions against tables**: Could not be executed because the database tables (`businesses`, `business_members`, etc.) do not yet exist on the remote database.
- **Service-role access**: Intentionally NOT used to claim an RLS pass, in strict accordance with project rules.

Structural inspection of `supabase/migrations/`:
- `alter table ... enable row level security` is present for all 13 canonical tables.
- `public.is_business_member(target_business_id uuid)` is defined as `SECURITY DEFINER` with explicit `search_path = public`, resolving `auth.uid()`.
- Table policies enforce `is_business_member(business_id)`.
- `recipe_ingredients` policies join through `recipes` to resolve `business_id`.
- `apply_ingredient_price_change()` is `SECURITY INVOKER`, ensuring caller RLS applies.

> [!IMPORTANT]
> Live cross-tenant isolation remains NOT VERIFIED until database migrations are applied to the real project, allowing two real user sessions with distinct business memberships to be queried against live tables.

---

## 5. Storage

**NOT VERIFIED (live bucket)** / **PASS (schema/policy definition)**

- Probed real Supabase storage via `storage.listBuckets()`: returned `[]` (empty).
- The `supplier-invoices` bucket does not exist in the live project because the SQL migration (`insert into storage.buckets ...`) has not been executed on the remote database.
- Structural verification of `supabase/migrations/20261001120000_create_core_schema.sql`:
  - Bucket defined with `public = false` (private).
  - SELECT and INSERT policies on `storage.objects` scope access to authenticated business members matching `invoices.file_path`.
  - Permanent public access is disabled by design.

---

## 6. Security

| Check | Method | Result |
|-------|--------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` server-only | Static analysis & runtime check | **PASS** |
| `AI_PROVIDER_API_KEY` server-only | Static analysis & runtime check | **PASS** |
| Browser client cannot import service-role key | Static analysis (`config.ts` isolation) | **PASS** |
| `browser.ts` has `"use client"` | Code inspection | **PASS** |
| `server.ts` server-side only | Code inspection | **PASS** |
| No raw Supabase queries in domain layer | Static analysis (`src/domain/`) | **PASS** |
| No raw Supabase queries in application layer | Static analysis (`src/application/`) | **PASS** |
| No AI provider SDK in source tree | Static analysis | **PASS** |
| AI boundary is provider-agnostic (`ports.ts`) | Code inspection | **PASS** |
| `.gitignore` protects `.env*` files | Git status & `.gitignore` verification | **PASS** |
| No secrets committed to repository | Git diff & commit inspection | **PASS** |

---

## 7. Changes made

- Updated `docs/verification/oct1-supabase-foundation.md` with live Supabase verification findings.
- Verified local builds, linting, tests, and type checking against `.env.local`.

**README updated: NO** — The existing README accurately reflects the current status, distinguishing the implemented foundation from future unimplemented workflows.

---

## 8. Verification results

| Check | Result | Method |
|-------|--------|--------|
| pnpm install | **PASS** | Executed locally |
| pnpm lint | **PASS** | Executed locally |
| pnpm typecheck | **PASS** | Executed locally |
| pnpm test | **PASS** | Executed locally (2/2 tests) |
| pnpm build | **PASS** | Executed locally with `.env.local` |
| Supabase connection | **PASS** | Live HTTPS query to real project |
| Auth unauthenticated rejection | **PASS** | Live query returns null session & error |
| Auth user creation & sign-in | **PASS** | Live GoTrue test user session created |
| Server-side session verification | **PASS** | Live token verified via `auth.getUser()` |
| Test user cleanup | **PASS** | Ephemeral user deleted via admin API |
| Database migrations on live project | **NOT VERIFIED** | Tables missing (PGRST205); migrations unapplied |
| Schema coverage in migration files | **PASS** | All 13 canonical entities defined with RLS |
| Authenticated database access | **NOT VERIFIED** | Blocked by missing tables in live DB |
| Cross-tenant RLS (live sessions) | **NOT VERIFIED** | Blocked by missing tables in live DB |
| Storage bucket in live project | **NOT VERIFIED** | Bucket missing; migration unapplied |
| Storage configuration in migration | **PASS** | Private bucket + RLS policies defined |
| Secret containment & boundary safety | **PASS** | Verified server-only access & `.gitignore` |

---

## 9. Unverified items

1. **Database migrations on live project**: The 13 canonical tables do not exist in the remote database (`PGRST205`). Neither direct database credentials (`DATABASE_URL`) nor Supabase CLI linkage credentials are present locally to apply them.
2. **Authenticated database access**: Blocked until tables are created in the live database.
3. **Cross-tenant RLS verification**: Cannot be exercised against live data until tables and memberships exist.
4. **Storage bucket existence in live project**: `supplier-invoices` bucket must be created via migration.

**To unblock:**
1. Apply the two SQL migration files (`supabase/migrations/*.sql`) to the Supabase project using the Supabase Dashboard SQL Editor (or via CLI with DB password/access token).
2. Once tables exist, run cross-tenant RLS verification using two distinct authenticated user sessions.

---

## 10. Commit created

```
chore: verify Supabase foundation
```

Contains only: `docs/verification/oct1-supabase-foundation.md`

No secrets, keys, or credentials are included.

---

## 11. Recommended next step

1. Apply `supabase/migrations/20261001120000_create_core_schema.sql` and `supabase/migrations/20261001184700_reconcile_canonical_architecture.sql` in the Supabase Dashboard SQL Editor.
2. Re-run live database and cross-tenant RLS verification with real authenticated sessions across two test businesses.
3. Do **NOT** start the October 2 Finance Engine + Ingredients milestone until the database schema and RLS verification are complete.
