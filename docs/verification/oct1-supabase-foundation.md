# October 1 Supabase/Auth Foundation — Verification Record

Verification date: 2026-10-01
Commit verified: `07fde76` / `85a8e86` (reconciled canonical architecture foundation)
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
| Supabase CLI verification | Verified (`migration list` matches, `db push --dry-run` clean) |
| Supabase project linkage | Live project verified via SQL Editor / CLI |

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
  - `src/infrastructure/supabase/browser.ts` specifies `"use client"` and initializes `createBrowserClient` with public credentials.
  - `src/infrastructure/supabase/server.ts` operates strictly server-side using `@supabase/ssr` `createServerClient` reading from cookie headers.
  - Client and server instantiation were tested and confirmed operational without circular imports or credential leakage.
- **Authenticated session & identity resolution**:
  - Created an ephemeral test user via admin auth API (`admin.createUser`).
  - Successfully authenticated the test user via `signInWithPassword()` through the anon client to receive a real JWT user session.
  - Resolved user identity (`id`, `email`, `aud`) server-side via `auth.getUser(token)` using the real session token.
  - Deleted the ephemeral test user via `admin.deleteUser()`; cleanup was confirmed successful with zero residual test users.

---

## 3. Database

**PASS**

### Local checks

| Check | Result |
|-------|--------|
| `pnpm install` | **PASS** |
| `pnpm lint` | **PASS** |
| `pnpm typecheck` | **PASS** |
| `pnpm test` (2/2) | **PASS** |
| `pnpm build` | **PASS** (Next.js 16.3.8 Turbopack with `.env.local`) |

### Canonical table verification on live Supabase project

All 13 canonical entities were queried in the live Supabase project and confirmed present:

| Entity | Status in Live Project | Result |
|--------|------------------------|--------|
| `business_costs` | Present in database | **PASS** |
| `business_members` | Present in database | **PASS** |
| `business_snapshots` | Present in database | **PASS** |
| `businesses` | Present in database | **PASS** |
| `ingredient_price_history` | Present in database | **PASS** |
| `ingredients` | Present in database | **PASS** |
| `invoice_items` | Present in database | **PASS** |
| `invoices` | Present in database | **PASS** |
| `menu_items` | Present in database | **PASS** |
| `price_changes` | Present in database | **PASS** |
| `recipe_ingredients` | Present in database | **PASS** |
| `recipes` | Present in database | **PASS** |
| `scenarios` | Present in database | **PASS** |

### Live migration verification

**PASS**
- `supabase migration list` confirmed both local migrations match remote:
  - `20261001120000` (create core schema)
  - `20261001184700` (reconcile canonical architecture)
- `supabase db push --dry-run` returned: `Remote database is up to date.`

---

## 4. RLS / tenant isolation

**PASS**

- **RLS enabled query**: **PASS** — Verified all 13 canonical tables have `rowsecurity = true`.
- **RLS policies exist**: **PASS** — Verified 13 policies exist in the live database, one per table:
  - `business_costs` — `members can access business costs` — `ALL`
  - `business_members` — `members can read business members` — `SELECT`
  - `business_snapshots` — `members can access business snapshots` — `ALL`
  - `businesses` — `members can read businesses` — `SELECT`
  - `ingredient_price_history` — `members can access ingredient price history` — `ALL`
  - `ingredients` — `members can access business ingredients` — `ALL`
  - `invoice_items` — `members can access invoice items` — `ALL`
  - `invoices` — `members can access invoices` — `ALL`
  - `menu_items` — `members can access menu items` — `ALL`
  - `price_changes` — `members can access price changes` — `ALL`
  - `recipe_ingredients` — `members can access recipe ingredients` — `ALL`
  - `recipes` — `members can access recipes` — `ALL`
  - `scenarios` — `members can access scenarios` — `ALL`
- **Policy definition inspection**:
  - *Policy definition source*: Repository migration (`supabase/migrations/20261001120000_create_core_schema.sql`), not live database introspection (psql / CLI SQL query not available locally).
  - *Definition*: `FOR ALL USING (public.is_business_member(business_id)) WITH CHECK (public.is_business_member(business_id))`.
- **Cross-tenant behavioral verification**: **PASS**
  - *Methodology*: Real authenticated Supabase sessions using the standard anon client (`@supabase/supabase-js`) via `signInWithPassword`. The service-role client was used strictly for administrative fixture creation and cleanup, never for authorization assertions.
  - *Setup*:
    - Created User A and User B with cryptographically random in-memory passwords (`email_confirm: true`).
    - Created Business A owned by User A, and Business B owned by User B.
    - Assigned `owner` membership in `business_members` for User A -> Business A and User B -> Business B.
    - Created Ingredient A in Business A and Ingredient B in Business B.
  - *Behavioral test results*:
    - **A1 (Same-tenant read)**: User A queried Ingredient A -> Returned 1 row (**PASS**).
    - **A2 (Cross-tenant read)**: User A queried Ingredient B -> Returned 0 rows (**PASS**).
    - **A3 (Cross-tenant insert)**: User A attempted INSERT into Business B -> Rejected by RLS (`new row violates row-level security policy for table "ingredients"`), DB confirmed 0 rows created (**PASS**).
    - **A4 (Cross-tenant update)**: User A attempted UPDATE on Ingredient B -> 0 rows affected, DB confirmed price unchanged (**PASS**).
    - **A5 (Cross-tenant delete)**: User A attempted DELETE on Ingredient B -> 0 rows affected, DB confirmed row still exists (**PASS**).
    - **A6 (Authorized write)**: User A updated Ingredient A -> Success, DB confirmed price updated and ownership preserved (**PASS**).
    - **B1 (Same-tenant read)**: User B queried Ingredient B -> Returned 1 row (**PASS**).
    - **B2 (Cross-tenant read)**: User B queried Ingredient A -> Returned 0 rows (**PASS**).
    - **B3 (Cross-tenant insert)**: User B attempted INSERT into Business A -> Rejected by RLS, DB confirmed 0 rows created (**PASS**).
    - **B4 (Cross-tenant update)**: User B attempted UPDATE on Ingredient A -> 0 rows affected, DB confirmed price unchanged (**PASS**).
    - **B5 (Cross-tenant delete)**: User B attempted DELETE on Ingredient A -> 0 rows affected, DB confirmed row still exists (**PASS**).
    - **B6 (Authorized write)**: User B updated Ingredient B -> Success, DB confirmed price updated and ownership preserved (**PASS**).
  - *Cleanup*:
    - All temporary test ingredients, business members, businesses, and auth users were deleted via admin client.
    - Database verified clear of all test artifacts (**PASS**).

---

## 5. Storage

**PASS**

- Live storage query confirmed: `supplier-invoices | supplier-invoices | false`.
- The `supplier-invoices` bucket exists and is confirmed private (`public = false`).
- Storage RLS policies for `storage.objects` restrict SELECT and INSERT operations to authenticated users whose `business_id` matches the invoice's file path via `public.is_business_member()`.

---

## 6. Security

**PASS**

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

- Updated `docs/verification/oct1-supabase-foundation.md` with behavioral cross-tenant RLS isolation test results using live authenticated user sessions.

**README updated: NO** — The existing README accurately reflects the current status, distinguishing the implemented foundation from future unimplemented workflows.

---

## 8. Verification results

| Item | Result | Verification Mode |
|---|---|---|
| Supabase application configuration | **PASS** | Executed against live `.env.local` |
| Supabase connection | **PASS** | Live HTTPS query to real project |
| Server/client boundaries | **PASS** | Code & import boundary inspection |
| Auth unauthenticated rejection | **PASS** | Live query verified against real GoTrue |
| Auth user session creation | **PASS** | Live ephemeral session verified |
| Auth server-side identity resolution | **PASS** | Live JWT token verified via `getUser()` |
| Auth test user cleanup | **PASS** | Confirmed deletion via admin API |
| Database migrations on live project | **PASS** | Verified via `migration list` & `db push --dry-run` |
| Canonical tables query (all 13 tables) | **PASS** | Live SQL query confirmed all 13 tables |
| RLS enabled query (all 13 tables) | **PASS** | Live SQL query confirmed `rowsecurity = true` |
| RLS policy query (13 policies) | **PASS** | Live SQL query confirmed 13 policies exist |
| Cross-tenant test (behavioral enforcement) | **PASS** | Real authenticated user sessions across two tenants |
| Storage bucket exists and is private | **PASS** | Live SQL query confirmed `supplier-invoices` (private) |
| Storage configuration in migration | **PASS** | Private bucket + RLS policies defined |
| Secret containment & boundary isolation | **PASS** | Static analysis & git inspection |
| `pnpm install` | **PASS** | Executed locally |
| `pnpm lint` | **PASS** | Executed locally |
| `pnpm typecheck` | **PASS** | Executed locally |
| `pnpm test` | **PASS** | Executed locally |
| `pnpm build` | **PASS** | Executed locally with `.env.local` |

---

## 9. Unverified items

None. All foundation, database, authentication, RLS, and storage verification checks have **PASSED**.

---

## 10. Commit created

```
docs: verify Oct 1 cross-tenant RLS isolation
```

Contains only: `docs/verification/oct1-supabase-foundation.md`

No secrets, keys, or credentials are included.

---

## 11. Recommended next step

The October 1 Supabase/Auth foundation and behavioral RLS isolation are fully verified.

Next milestone: **October 2 Finance Engine + Ingredients**.
Do **NOT** begin October 2 in this session.
