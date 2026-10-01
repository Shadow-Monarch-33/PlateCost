# PlateCost

PlateCost is a planned financial decision platform for small food businesses. This repository
currently contains the technical foundation only; menu economics, invoice extraction, scenarios,
and other product workflows are **not implemented yet**.

## Architecture

PlateCost is one Next.js application with a hybrid layered structure:

- `src/app` - Next.js routes and the intentionally minimal foundation landing page.
- `src/application` - orchestration contracts and runtime validation for untrusted input.
- `src/domain` - framework-independent financial and unit contracts. This layer must remain free
  of React, Next.js, Supabase, AI SDKs, and browser APIs.
- `src/infrastructure` - Supabase browser/server integration boundaries.
- `supabase/migrations` - tenant-isolated PostgreSQL schema and transactional database functions.
- `tests` - focused domain tests and shared fixtures.

Dependencies point inward: UI/application code may use domain contracts; infrastructure implements
external boundaries; the domain does not import from either.

## Stack

- Node 24.21.0 and pnpm 12.4.2
- Next.js 16.3.8, React 19.3.0, TypeScript 6.0.3
- Tailwind CSS 4.3.3 and shadcn/ui configuration (no product components yet)
- Supabase JS 2.117.2 and Supabase SSR 0.12.7
- Zod 4.6.5 and Vitest 5.0.3

The versions above are the versions installed and locally verified from the npm registry on
October 1, 2026. Absolute future-version stability cannot be guaranteed; dependency upgrades
should be re-verified before release.

## Local setup

1. Install Node 24.21.0 and pnpm 12.4.2 (`corepack enable` is recommended).
2. Copy `.env.example` to `.env.local` and fill in the public Supabase values.
3. Install dependencies:

   ```bash
   pnpm install
   ```

4. Apply `supabase/migrations` to a Supabase project using the Supabase CLI or dashboard.
5. Start development:

   ```bash
   pnpm dev
   ```

Required variables are `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
`SUPABASE_SERVICE_ROLE_KEY` is reserved for server-only privileged operations and must never be
exposed to browser code. `AI_PROVIDER_API_KEY` is reserved for a future server-side provider
adapter.

## Verification commands

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Supabase credentials are required to apply and exercise the database/auth integration; they are
not required for the local TypeScript, lint, test, and build checks. AI-provider credentials are
not required because invoice/recipe extraction is only an abstraction at this stage.

## Financial truth rule

AI output is untrusted input. It must be runtime-validated and, where required, human-confirmed
before it can affect business data. Deterministic domain code owns unit normalization and all
financial calculations. PostgreSQL `numeric(14,4)` stores current and historical prices; UI
rounding is presentation-only. Scenarios and price-impact previews must remain side-effect free,
while confirmed price changes use the transactional database function boundary.
