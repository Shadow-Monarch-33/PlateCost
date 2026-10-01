create extension if not exists "pgcrypto";

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  currency char(3) not null default 'INR' check (currency = 'INR'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create index business_members_user_id_idx on public.business_members(user_id);

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  base_unit text not null check (base_unit in ('g', 'kg', 'ml', 'l', 'each')),
  current_price numeric(14, 4) not null check (current_price >= 0),
  currency char(3) not null default 'INR' check (currency = 'INR'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, name)
);

create index ingredients_business_id_idx on public.ingredients(business_id);

create table public.ingredient_price_history (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  price numeric(14, 4) not null check (price >= 0),
  currency char(3) not null default 'INR' check (currency = 'INR'),
  observed_at timestamptz not null default now(),
  source text not null check (source in ('manual', 'invoice', 'import')),
  created_at timestamptz not null default now()
);

create index ingredient_price_history_ingredient_idx
  on public.ingredient_price_history(ingredient_id, observed_at desc);
create index ingredient_price_history_business_idx
  on public.ingredient_price_history(business_id);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  yield_quantity numeric(14, 4) not null check (yield_quantity > 0),
  yield_unit text not null check (yield_unit in ('g', 'kg', 'ml', 'l', 'each')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, name)
);

create table public.recipe_ingredients (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  quantity numeric(14, 4) not null check (quantity > 0),
  unit text not null check (unit in ('g', 'kg', 'ml', 'l', 'each')),
  created_at timestamptz not null default now(),
  primary key (recipe_id, ingredient_id)
);

create index recipe_ingredients_ingredient_id_idx
  on public.recipe_ingredients(ingredient_id);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete set null,
  name text not null check (char_length(trim(name)) > 0),
  selling_price numeric(14, 4) not null check (selling_price >= 0),
  currency char(3) not null default 'INR' check (currency = 'INR'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, name)
);

create index menu_items_business_id_idx on public.menu_items(business_id);

create table public.business_costs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  amount numeric(14, 4) not null check (amount >= 0),
  currency char(3) not null default 'INR' check (currency = 'INR'),
  cadence text not null check (cadence in ('monthly', 'annual', 'one_time')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, name)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  supplier_name text,
  invoice_number text,
  invoice_date date,
  file_path text,
  status text not null default 'uploaded'
    check (status in ('uploaded', 'review_required', 'confirmed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index invoices_business_id_created_at_idx
  on public.invoices(business_id, created_at desc);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  ingredient_id uuid references public.ingredients(id) on delete set null,
  ingredient_name text not null check (char_length(trim(ingredient_name)) > 0),
  quantity numeric(14, 4) check (quantity is null or quantity > 0),
  unit text check (unit is null or unit in ('g', 'kg', 'ml', 'l', 'each')),
  unit_price numeric(14, 4) check (unit_price is null or unit_price >= 0),
  created_at timestamptz not null default now()
);

create index invoice_items_invoice_id_idx on public.invoice_items(invoice_id);
create index invoice_items_business_id_idx on public.invoice_items(business_id);

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.ingredients enable row level security;
alter table public.ingredient_price_history enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.menu_items enable row level security;
alter table public.business_costs enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

create or replace function public.is_business_member(target_business_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members
    where business_id = target_business_id
      and user_id = (select auth.uid())
  );
$$;

create policy "members can read businesses"
  on public.businesses for select
  using (public.is_business_member(id));

create policy "members can read business members"
  on public.business_members for select
  using (public.is_business_member(business_id));

create policy "members can access business ingredients"
  on public.ingredients for all
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "members can access ingredient price history"
  on public.ingredient_price_history for all
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "members can access recipes"
  on public.recipes for all
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "members can access recipe ingredients"
  on public.recipe_ingredients for all
  using (exists (
    select 1 from public.recipes recipe
    where recipe.id = recipe_ingredients.recipe_id
      and public.is_business_member(recipe.business_id)
  ))
  with check (exists (
    select 1 from public.recipes recipe
    where recipe.id = recipe_ingredients.recipe_id
      and public.is_business_member(recipe.business_id)
  ));

create policy "members can access menu items"
  on public.menu_items for all
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "members can access business costs"
  on public.business_costs for all
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "members can access invoices"
  on public.invoices for all
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "members can access invoice items"
  on public.invoice_items for all
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

insert into storage.buckets (id, name, public)
values ('supplier-invoices', 'supplier-invoices', false)
on conflict (id) do nothing;

create policy "members can read their invoice files"
  on storage.objects for select
  using (
    bucket_id = 'supplier-invoices'
    and exists (
      select 1
      from public.invoices
      where invoices.file_path = storage.objects.name
        and public.is_business_member(invoices.business_id)
    )
  );

create policy "members can upload invoice files"
  on storage.objects for insert
  with check (
    bucket_id = 'supplier-invoices'
    and exists (
      select 1
      from public.invoices
      where invoices.file_path = storage.objects.name
        and public.is_business_member(invoices.business_id)
    )
  );

create or replace function public.apply_ingredient_price_change(
  p_ingredient_id uuid,
  p_new_price numeric,
  p_source text default 'manual',
  p_observed_at timestamptz default now()
)
returns public.ingredients
language plpgsql
security invoker
set search_path = public
as $$
declare
  updated_ingredient public.ingredients;
begin
  if p_new_price < 0 then
    raise exception 'Ingredient price cannot be negative';
  end if;

  update public.ingredients
  set current_price = p_new_price, updated_at = now()
  where id = p_ingredient_id
  returning * into updated_ingredient;

  if updated_ingredient.id is null then
    raise exception 'Ingredient not found or inaccessible';
  end if;

  insert into public.ingredient_price_history (
    ingredient_id, business_id, price, currency, observed_at, source
  )
  values (
    updated_ingredient.id,
    updated_ingredient.business_id,
    p_new_price,
    updated_ingredient.currency,
    p_observed_at,
    p_source
  );

  return updated_ingredient;
end;
$$;
