-- Forward migration for Recipe Management
--
-- Live schema (inspected before this migration):
--   recipes(id, business_id, name, yield_quantity NOT NULL, yield_unit NOT NULL, created_at, updated_at)
--   recipe_ingredients(recipe_id, ingredient_id, quantity, unit, created_at), PK (recipe_id, ingredient_id)
--   recipe_ingredients.recipe_id     -> recipes(id)     ON DELETE CASCADE
--   recipe_ingredients.ingredient_id -> ingredients(id) ON DELETE RESTRICT
--
-- 1. Add ONE canonical positive serving count. Recipe cost per serving = batch cost / servings.
alter table public.recipes
  add column if not exists servings numeric(14, 4) not null default 1
    constraint recipes_servings_check check (servings > 0);

-- 2. yield_quantity / yield_unit describe a physical batch yield that the recipe
--    workflow does not collect. Relax NOT NULL so recipes are not forced to invent
--    a yield. Existing CHECK constraints still validate any non-null value.
alter table public.recipes
  alter column yield_quantity drop not null,
  alter column yield_unit drop not null;

-- 3. Atomic recipe save (create or full replace of ingredient lines).
--    SECURITY INVOKER: every statement is subject to RLS for the calling user.
--    Additionally enforces that every referenced ingredient belongs to the same
--    business and that recipe units share the ingredient base unit's dimension.
create or replace function public.save_recipe(
  p_business_id uuid,
  p_recipe_id uuid,
  p_name text,
  p_servings numeric,
  p_ingredients jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_recipe_id uuid;
  v_line_count integer;
  v_distinct_count integer;
  v_valid_count integer;
begin
  if not public.is_business_member(p_business_id) then
    raise exception 'Business not found or inaccessible';
  end if;

  if char_length(v_name) = 0 then
    raise exception 'Recipe name cannot be empty';
  end if;
  if char_length(v_name) > 100 then
    raise exception 'Recipe name is too long';
  end if;

  if p_servings is null or p_servings <= 0 then
    raise exception 'Servings must be greater than 0';
  end if;

  if p_ingredients is null
    or jsonb_typeof(p_ingredients) <> 'array'
    or jsonb_array_length(p_ingredients) = 0 then
    raise exception 'Add at least one ingredient.';
  end if;

  select count(*), count(distinct item ->> 'ingredient_id')
  into v_line_count, v_distinct_count
  from jsonb_array_elements(p_ingredients) as item;

  if v_distinct_count <> v_line_count then
    raise exception 'Each ingredient can only be added once per recipe';
  end if;

  select count(*)
  into v_valid_count
  from jsonb_array_elements(p_ingredients) as item
  join public.ingredients as ing
    on ing.id = (item ->> 'ingredient_id')::uuid
   and ing.business_id = p_business_id
  where (item ->> 'quantity')::numeric > 0
    and (case
           when item ->> 'unit' in ('g', 'kg') then 'mass'
           when item ->> 'unit' in ('ml', 'L') then 'volume'
           when item ->> 'unit' = 'piece' then 'count'
         end)
      = (case
           when ing.base_unit in ('g', 'kg') then 'mass'
           when ing.base_unit in ('ml', 'L') then 'volume'
           when ing.base_unit = 'piece' then 'count'
         end);

  if v_valid_count <> v_line_count then
    raise exception 'Recipe ingredients are invalid, inaccessible, or use incompatible units';
  end if;

  if p_recipe_id is null then
    insert into public.recipes (business_id, name, servings)
    values (p_business_id, v_name, p_servings)
    returning id into v_recipe_id;
  else
    update public.recipes
    set name = v_name,
        servings = p_servings,
        updated_at = now()
    where id = p_recipe_id
      and business_id = p_business_id
    returning id into v_recipe_id;

    if v_recipe_id is null then
      raise exception 'Recipe not found or inaccessible';
    end if;

    delete from public.recipe_ingredients where recipe_id = v_recipe_id;
  end if;

  insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
  select
    v_recipe_id,
    (item ->> 'ingredient_id')::uuid,
    (item ->> 'quantity')::numeric,
    item ->> 'unit'
  from jsonb_array_elements(p_ingredients) as item;

  return v_recipe_id;
end;
$$;

revoke execute on function public.save_recipe(uuid, uuid, text, numeric, jsonb) from public, anon;
grant execute on function public.save_recipe(uuid, uuid, text, numeric, jsonb) to authenticated;
