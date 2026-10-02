# October 2 Ingredient Management — Verification Record

Verification date: 2026-10-02
Commit verified: `feat: implement ingredient management`
Branch: `main`

---

## 1. Scope & Implementation Summary

The Ingredient Management slice was implemented end-to-end adhering strictly to `ARCHITECTURE.md` and deterministic financial principles:

- **Canonical Model**: Ingredients with `id`, `business_id`, `name`, `base_unit` (`g`, `kg`, `ml`, `L`, `piece`), `current_price` (`numeric(14,4)` / INR), `supplier`, `created_at`, `updated_at`.
- **Base Unit Immutability**: Base unit is established on creation and cannot be changed. The edit UI renders it read-only with explicit helper text (`"Base unit cannot be changed after creation."`), and the application update validation schema rejects/ignores base unit modifications.
- **Atomic Price RPC**: `update_ingredient_price(p_ingredient_id, p_new_price, p_source)` executes as `security invoker` with row locking (`FOR UPDATE`), RLS policy enforcement, non-negative validation, duplicate price bypass (0 redundant history records), and writes exactly 1 record to `ingredient_price_history`.
- **Safe Deletion**: Deletion is blocked whenever `recipe_ingredients` references exist, returning a user-friendly error with the recipe count (`"Cannot delete ingredient: it is used in X recipes. Remove it from all recipes first."`). Database foreign key `recipe_ingredients.ingredient_id` is enforced with `ON DELETE RESTRICT`.
- **Multi-Tenant Security**: Server-side business resolution from authenticated JWT -> `business_members` -> `business_id`. Client-provided business IDs are never trusted. All database operations are explicitly scoped by `business_id` and enforced by PostgreSQL Row Level Security (RLS).
- **UI**: Responsive, accessible, restrained MVP UI at `/ingredients` with search, creation modal, edit modal, delete confirmation modal, and full price history inspection modal.

---

## 2. Verification Commands & Results

| Command | Status | Notes |
|---------|--------|-------|
| `pnpm test` | **PASS** | 74/74 tests passing (57 finance engine + 17 ingredient validation/service tests) |
| `pnpm lint` | **PASS** | ESLint passed with 0 errors |
| `pnpm typecheck` | **PASS** | `tsc --noEmit` passed with 0 errors |
| `pnpm build` | **PASS** | Next.js 16.3.8 production build succeeded (`/` static, `/ingredients` dynamic) |
| `node --env-file=.env.local scripts/verify-cross-tenant-ingredients.mjs` | **PASS** | Live remote Supabase behavioral test with two real authenticated users |

---

## 3. Live Cross-Tenant Behavioral Test Results

Executed against remote Supabase project `fiswzazqmwnkbnascvxl` with two distinct authenticated users (User A & User B):

1. **A1 (Same-tenant read)**: User A queried Ingredient A -> Returned 1 row (**PASS**).
2. **A2 (Cross-tenant read)**: User A queried Ingredient B -> Returned 0 rows (**PASS**).
3. **A3 (Cross-tenant insert)**: User A attempted INSERT into Business B -> Rejected by RLS (`new row violates row-level security policy for table "ingredients"`) (**PASS**).
4. **A4 (Cross-tenant update)**: User A attempted UPDATE on Ingredient B -> 0 rows affected, DB confirmed price intact at ₹55 (**PASS**).
5. **A5 (Cross-tenant delete)**: User A attempted DELETE on Ingredient B -> 0 rows affected, DB confirmed row still exists (**PASS**).
6. **B1 (Same-tenant read)**: User B queried Ingredient B -> Returned 1 row (**PASS**).
7. **B2 (Cross-tenant read)**: User B queried Ingredient A -> Returned 0 rows (**PASS**).
8. **B3 (Cross-tenant insert)**: User B attempted INSERT into Business A -> Rejected by RLS (**PASS**).
9. **B4 (Cross-tenant update)**: User B attempted UPDATE on Ingredient A -> 0 rows affected, DB confirmed price intact at ₹330 (**PASS**).
10. **B5 (Cross-tenant delete)**: User B attempted DELETE on Ingredient A -> 0 rows affected, DB confirmed row still exists (**PASS**).
11. **RPC1 (Atomic price change)**: User A called `update_ingredient_price` on Ingredient A (₹330 -> ₹350) -> Succeeded, `current_price` updated to ₹350 (**PASS**).
12. **Hist1 (Price history creation)**: Checked `ingredient_price_history` -> Exactly 1 history record created with `old_price: 330, new_price: 350, unit: kg, source: manual` (**PASS**).
13. **Hist2 (Redundant price bypass)**: User A called `update_ingredient_price` with identical price (₹350 -> ₹350) -> Succeeded, 0 additional history rows created (**PASS**).
14. **RPC3 (Cross-tenant RPC)**: User A attempted `update_ingredient_price` on Ingredient B -> Rejected with `"Ingredient not found or inaccessible"` (**PASS**).
15. **RPC4 (Negative price validation)**: User A attempted negative price update (-50) -> Rejected with `"Ingredient price cannot be negative"` (**PASS**).
16. **SafeDelete (Referenced in recipe)**: Linked Ingredient A to test recipe; delete attempted -> Blocked with foreign key restriction violation (**PASS**).
17. **SafeDelete (Unreferenced deletion)**: Removed recipe reference; delete attempted -> Succeeded, Ingredient A deleted (**PASS**).
18. **SafeDelete (History cascade)**: Verified all price history associated with deleted ingredient cascaded cleanly with 0 orphans (**PASS**).
19. **Cleanup**: All temporary test users, businesses, ingredients, and recipes removed; database confirmed clean (**PASS**).
