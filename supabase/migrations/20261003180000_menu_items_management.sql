-- 1. Add `active` column for deactivation support
alter table public.menu_items
  add column active boolean not null default true;

-- 2. Prevent silent deletion of recipes that are tied to menu items
alter table public.menu_items
  drop constraint menu_items_recipe_id_fkey,
  add constraint menu_items_recipe_id_fkey
    foreign key (recipe_id)
    references public.recipes(id)
    on delete restrict;

-- 3. We also need an atomic RPC to create or update menu items (like recipes and ingredients)
create or replace function public.save_menu_item(
  p_business_id uuid,
  p_menu_item_id uuid,
  p_recipe_id uuid,
  p_name text,
  p_selling_price numeric,
  p_active boolean
) returns uuid
language plpgsql security definer
as $$
declare
  v_id uuid;
  v_verified_recipe_id uuid;
begin
  -- 1. Verify business authorization
  if not public.is_business_member(p_business_id) then
    raise exception 'Unauthorized to save menu item for this business';
  end if;

  -- 2. Verify recipe belongs to the same business (cross-tenant safety)
  if p_recipe_id is not null then
    select id into v_verified_recipe_id
    from public.recipes
    where id = p_recipe_id and business_id = p_business_id;

    if not found then
      raise exception 'Recipe not found or belongs to another business';
    end if;
  end if;

  -- 3. Upsert menu item
  if p_menu_item_id is null then
    insert into public.menu_items (business_id, recipe_id, name, selling_price, active, currency)
    values (p_business_id, p_recipe_id, trim(p_name), p_selling_price, coalesce(p_active, true), 'INR')
    returning id into v_id;
  else
    update public.menu_items
    set
      recipe_id = p_recipe_id,
      name = trim(p_name),
      selling_price = p_selling_price,
      active = coalesce(p_active, true),
      updated_at = now()
    where id = p_menu_item_id and business_id = p_business_id
    returning id into v_id;

    if not found then
      raise exception 'Menu item not found or unauthorized';
    end if;
  end if;

  return v_id;
end;
$$;
