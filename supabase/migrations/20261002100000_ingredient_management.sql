-- Forward migration for Ingredient Management
-- 1. Ensure supplier column on ingredients
alter table public.ingredients
  add column if not exists supplier text;

-- 2. Ensure canonical fields on ingredient_price_history
alter table public.ingredient_price_history
  add column if not exists old_price numeric(14, 4),
  add column if not exists new_price numeric(14, 4),
  add column if not exists unit text check (unit is null or unit in ('g', 'kg', 'ml', 'L', 'piece')),
  add column if not exists invoice_id uuid references public.invoices(id) on delete set null,
  add column if not exists changed_at timestamptz default now();

create index if not exists ingredient_price_history_changed_at_idx
  on public.ingredient_price_history(ingredient_id, changed_at desc);

-- 3. Atomic price update RPC with row locking and RLS enforcement
create or replace function public.update_ingredient_price(
  p_ingredient_id uuid,
  p_new_price numeric,
  p_source text default 'manual'
)
returns public.ingredients
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_ingredient public.ingredients%rowtype;
  v_old_price numeric(14, 4);
begin
  -- Validate negative price
  if p_new_price < 0 then
    raise exception 'Ingredient price cannot be negative';
  end if;

  -- Validate supported source
  if p_source not in ('manual', 'invoice', 'import') then
    raise exception 'Invalid price change source: %', p_source;
  end if;

  -- Lock target ingredient FOR UPDATE (subject to RLS for security invoker)
  select *
  into v_ingredient
  from public.ingredients
  where id = p_ingredient_id
  for update;

  -- Reject nonexistent or unauthorized ingredients
  if not found then
    raise exception 'Ingredient not found or inaccessible';
  end if;

  v_old_price := v_ingredient.current_price;

  -- If old_price = new_price, do not create history; return ingredient
  if v_old_price = p_new_price then
    return v_ingredient;
  end if;

  -- Update ingredient current_price and updated_at
  update public.ingredients
  set current_price = p_new_price,
      updated_at = now()
  where id = p_ingredient_id
  returning * into v_ingredient;

  -- Insert exactly one price history record
  insert into public.ingredient_price_history (
    ingredient_id,
    business_id,
    price,
    old_price,
    new_price,
    unit,
    currency,
    source,
    observed_at,
    changed_at
  )
  values (
    v_ingredient.id,
    v_ingredient.business_id,
    p_new_price,
    v_old_price,
    p_new_price,
    v_ingredient.base_unit,
    v_ingredient.currency,
    p_source,
    now(),
    now()
  );

  return v_ingredient;
end;
$$;

grant execute on function public.update_ingredient_price(uuid, numeric, text) to authenticated;
