alter table public.businesses
  add column if not exists owner_id uuid references auth.users(id) on delete restrict,
  add column if not exists type text,
  add column if not exists starting_capital numeric(14, 4) check (starting_capital is null or starting_capital >= 0),
  add column if not exists expected_orders_day numeric(14, 4)
    check (expected_orders_day is null or expected_orders_day >= 0),
  add column if not exists platform_fee_pct numeric(7, 4)
    check (platform_fee_pct is null or (platform_fee_pct >= 0 and platform_fee_pct <= 100)),
  add column if not exists fixed_monthly_cost numeric(14, 4)
    check (fixed_monthly_cost is null or fixed_monthly_cost >= 0);

create table if not exists public.price_changes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  invoice_id uuid references public.invoices(id) on delete set null,
  changed_by uuid references auth.users(id) on delete set null,
  old_price numeric(14, 4) not null check (old_price >= 0),
  new_price numeric(14, 4) not null check (new_price >= 0),
  unit text not null check (unit in ('g', 'kg', 'ml', 'L', 'piece')),
  source text not null check (source in ('manual', 'invoice', 'import')),
  changed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index price_changes_business_idx on public.price_changes(business_id, changed_at desc);
create index price_changes_ingredient_idx on public.price_changes(ingredient_id, changed_at desc);

create table if not exists public.scenarios (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  name text not null check (char_length(trim(name)) > 0),
  overrides jsonb not null default '{}'::jsonb,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index scenarios_business_idx on public.scenarios(business_id, created_at desc);

create table if not exists public.business_snapshots (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  scenario_id uuid references public.scenarios(id) on delete set null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index business_snapshots_business_idx
  on public.business_snapshots(business_id, created_at desc);

alter table public.ingredients drop constraint if exists ingredients_base_unit_check;
alter table public.recipes drop constraint if exists recipes_yield_unit_check;
alter table public.recipe_ingredients drop constraint if exists recipe_ingredients_unit_check;
alter table public.invoice_items drop constraint if exists invoice_items_unit_check;

alter table public.ingredients
  add constraint ingredients_base_unit_check check (base_unit in ('g', 'kg', 'ml', 'L', 'piece'));
alter table public.recipes
  add constraint recipes_yield_unit_check check (yield_unit in ('g', 'kg', 'ml', 'L', 'piece'));
alter table public.recipe_ingredients
  add constraint recipe_ingredients_unit_check check (unit in ('g', 'kg', 'ml', 'L', 'piece'));
alter table public.invoice_items
  add constraint invoice_items_unit_check
    check (unit is null or unit in ('g', 'kg', 'ml', 'L', 'piece'));

alter table public.invoices
  add column if not exists supplier_confidence numeric(5, 4)
    check (supplier_confidence is null or (supplier_confidence >= 0 and supplier_confidence <= 1)),
  add column if not exists invoice_number_confidence numeric(5, 4)
    check (invoice_number_confidence is null or (invoice_number_confidence >= 0 and invoice_number_confidence <= 1)),
  add column if not exists invoice_date_confidence numeric(5, 4)
    check (invoice_date_confidence is null or (invoice_date_confidence >= 0 and invoice_date_confidence <= 1));

alter table public.invoice_items
  add column if not exists total_price numeric(14, 4)
    check (total_price is null or total_price >= 0),
  add column if not exists confidence numeric(5, 4)
    check (confidence is null or (confidence >= 0 and confidence <= 1)),
  add column if not exists source_text text;

alter table public.price_changes enable row level security;
alter table public.scenarios enable row level security;
alter table public.business_snapshots enable row level security;

create policy "members can access price changes"
  on public.price_changes for all
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "members can access scenarios"
  on public.scenarios for all
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "members can access business snapshots"
  on public.business_snapshots for all
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));
