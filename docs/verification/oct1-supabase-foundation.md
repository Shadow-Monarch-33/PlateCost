# October 1 Supabase/Auth Foundation — Verification Record

Verification date: 2026-10-01  
Commit verified: `85a8e86` (chore: reconcile foundation with canonical architecture document)  
Branch: `main`

---

## Environment at verification time

| Item | Status |
|------|--------|
| Worktree | Clean |
| Package manager | pnpm 12.4.2 |
| `.env.local` | **Absent** — no real Supabase credentials in local environment |
| `NEXT_PUBLIC_SUPABASE_URL` | Not set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Not set |
| `SUPABASE_SERVICE_ROLE_KEY` | Not set |
| Supabase CLI | Not installed |
| Supabase project linkage | None (no `supabase/config.toml`) |

Because `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are absent, all
checks that require a live Supabase connection are reported as **NOT VERIFIED**.

---

## 1. Supabase connection

**NOT VERIFIED** — No `.env.local` file exists.  
The config module (`src/infrastructure/supabase/config.ts`) validates both public env vars
through a Zod schema at call-time; without the variables the client cannot be constructed.
A live connection test was therefore impossible.

---

## 2. Authentication

**NOT VERIFIED** — No live credentials.

Structural check (PASS — not equivalent to runtime verification):

- `src/infrastructure/supabase/server.ts` creates a server client via `@supabase/ssr`
  `createServerClient`, reading session tokens from the Next.js cookie store.
- `src/infrastructure/supabase/browser.ts` is marked `"use client"` and creates a browser
  client via `createBrowserClient`.
- The two boundaries are correctly separated; neither imports the other.
- `getPublicSupabaseEnvironment()` is the only function callable from browser context;
  `getSupabaseServiceRoleKey()` is only exported from the config module and is not imported
  anywhere in the current source tree — it exists as a server-only contract.

Unauthenticated-vs-authenticated session behaviour and server-side identity resolution
cannot be exercised without a real Supabase project.

---

## 3. Database

### Local checks

| Check | Result |
|-------|--------|
| `pnpm install` | **PASS** |
| `pnpm lint` | **PASS** |
| `pnpm typecheck` | **PASS** |
| `pnpm test` (2/2) | **PASS** |
| `pnpm build` | **PASS** |

### Canonical table coverage (structural inspection — not equivalent to live DB verification)

All 13 canonical entities are present in `supabase/migrations/`:

| Table | Migration file | RLS enabled | Policy present |
|-------|----------------|-------------|----------------|
| businesses | core schema | ✓ | ✓ (select via membership) |
| business_members | core schema | ✓ | ✓ (select via membership) |
| ingredients | core schema | ✓ | ✓ (all via membership) |
| ingredient_price_history | core schema | ✓ | ✓ (all via membership) |
| recipes | core schema | ✓ | ✓ (all via membership) |
| recipe_ingredients | core schema | ✓ | ✓ (all via membership, joins recipes) |
| menu_items | core schema | ✓ | ✓ (all via membership) |
| business_costs | core schema | ✓ | ✓ (all via membership) |
| invoices | core schema | ✓ | ✓ (all via membership) |
| invoice_items | core schema | ✓ | ✓ (all via membership) |
| price_changes | reconcile migration | ✓ | ✓ (all via membership) |
| scenarios | reconcile migration | ✓ | ✓ (all via membership) |
| business_snapshots | reconcile migration | ✓ | ✓ (all via membership) |

`price_changes`, `scenarios`, and `business_snapshots` are schema-only persistence
boundaries. Their product workflows are not implemented.

### Live migration / schema verification

**NOT VERIFIED** — No Supabase CLI and no live project credentials.

---

## 4. RLS / tenant isolation

**NOT VERIFIED — structural inspection only**

The RLS mechanism:

- `public.is_business_member(target_business_id uuid)` is a `SECURITY DEFINER` stable
  function with `search_path = public`. It resolves `auth.uid()` against `business_members`.
- Every table policy calls `is_business_member(business_id)`.
- `recipe_ingredients` policies join through `recipes` to resolve `business_id`.
- `storage.objects` policies join through `invoices.file_path` to scope storage access.
- The `apply_ingredient_price_change` function is `SECURITY INVOKER`, meaning RLS applies
  to it in the caller's context.

**Cross-tenant test**: NOT performed.  
Reason: No live Supabase project credentials available. Without real authenticated sessions
for two separate users in separate businesses, the cross-tenant isolation cannot be
exercised. Service-role access was not used as a substitute.

> [!IMPORTANT]
> An RLS PASS requires real authenticated user sessions. Service-role access bypasses RLS
> entirely and must never be presented as RLS verification. This check remains open until
> credentials are provided.

---

## 5. Storage

**NOT VERIFIED** — live project credentials absent.

Structural check (not equivalent to live verification):

- Migration inserts into `storage.buckets` with `public = false` → bucket is private by
  design.
- Two `storage.objects` policies are defined: one for SELECT (read), one for INSERT
  (upload). Both check `bucket_id = 'supplier-invoices'` and require the file path to
  match an invoice the authenticated user has business-member access to.
- No permanent public URL is set.

Whether the bucket actually exists in the linked Supabase project cannot be confirmed
without a live connection.

---

## 6. Security

| Check | Method | Result |
|-------|--------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` server-only | Static import analysis | **PASS** |
| `AI_PROVIDER_API_KEY` server-only | Static import analysis | **PASS** |
| Browser client cannot import service-role key | Static import analysis | **PASS** |
| `browser.ts` is `"use client"` | Code inspection | **PASS** |
| `server.ts` has no `"use client"` directive | Code inspection | **PASS** |
| No raw Supabase client in domain layer | Code inspection | **PASS** |
| No raw Supabase client in application layer | Code inspection | **PASS** |
| No AI provider SDK in source tree | Code inspection | **PASS** |
| AI boundary is interface-only (`ports.ts`) | Code inspection | **PASS** |
| `.gitignore` protects `.env*` (except `.env.example`) | Code inspection | **PASS** |
| No hardcoded credentials found | Code inspection | **PASS** |

`getSupabaseServiceRoleKey()` is defined in `config.ts` (server-only path) and is not
imported anywhere in the current codebase — it is reserved for future server-side operations.
No client component or domain module can reach it through a `"use client"` import chain.

---

## 7. Changes made

The following changes were made as part of this verification task:

- Added `docs/verification/oct1-supabase-foundation.md` (this document).

**README updated: NO** — The existing README accurately distinguishes implemented foundation
from unimplemented product workflows. No corrections were required.

---

## 8. Verification results

| Check | Result | Method |
|-------|--------|--------|
| pnpm install | **PASS** | Executed |
| pnpm lint | **PASS** | Executed |
| pnpm typecheck | **PASS** | Executed |
| pnpm test | **PASS** | Executed (2/2 tests) |
| pnpm build | **PASS** | Executed |
| Supabase connection | **NOT VERIFIED** | No credentials |
| Auth session (server-side) | **NOT VERIFIED** | No credentials |
| Auth session (unauthenticated rejection) | **NOT VERIFIED** | No credentials |
| Authenticated DB access | **NOT VERIFIED** | No credentials |
| Migration status vs live project | **NOT VERIFIED** | No CLI / credentials |
| Schema: all 13 canonical tables | **PASS** (structural) | Migration inspection |
| RLS enabled on all tables | **PASS** (structural) | Migration inspection |
| RLS policies present on all tables | **PASS** (structural) | Migration inspection |
| Cross-tenant RLS (real sessions) | **NOT VERIFIED** | No credentials |
| Storage bucket defined as private | **PASS** (structural) | Migration inspection |
| Storage bucket exists in live project | **NOT VERIFIED** | No credentials |
| Service-role key server-only | **PASS** | Static analysis |
| No AI provider SDK in source | **PASS** | Static analysis |
| Domain layer isolated from frameworks | **PASS** | Static analysis |
| .gitignore protects secrets | **PASS** | Code inspection |

---

## 9. Unverified items

All unverified items have the same root cause: **no `.env.local` with valid Supabase
credentials and no Supabase CLI installation**.

1. Live Supabase connection
2. Auth session creation, reading, and unauthenticated rejection
3. Authenticated server-side session access
4. Business membership resolution via live query
5. Authenticated database access through intended boundaries
6. Migration execution against real project (unknown whether migrations were applied)
7. Cross-tenant RLS using real authenticated user sessions for User A / Business A vs
   User B / Business B isolation
8. Storage bucket physical existence and private configuration in the live project

**To unblock these checks:**

1. Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (see `.env.example`).
2. Optionally add `SUPABASE_SERVICE_ROLE_KEY` for fixture-creation during cross-tenant RLS
   testing (server-side use only; never commit).
3. Apply migrations via the Supabase dashboard SQL editor or install the Supabase CLI
   (`brew install supabase/tap/supabase`) and run `supabase db push`.
4. Create two test users and two businesses, one per user, to exercise cross-tenant isolation.

---

## 10. Commit created

```
chore: verify Supabase foundation
```

Contains only: `docs/verification/oct1-supabase-foundation.md`

No credentials, secrets, test data, or generated output are included.

---

## 11. Recommended next step

**Provide Supabase credentials to complete the live verification.**

The foundation's structural correctness is confirmed by the local checks. The live
infrastructure checks are blocked solely by absent credentials.

Priority order:

1. Create `.env.local` with public Supabase vars.
2. Apply migrations to the real Supabase project.
3. Verify the live connection (build will confirm env parsing).
4. Create two test user sessions and two businesses; test cross-tenant isolation with
   real authenticated queries using the anon-key client (not service-role).
5. Confirm the `supplier-invoices` storage bucket exists and is private.

Do **not** begin the October 2 Finance Engine + Ingredients milestone until live Supabase
verification is complete.
