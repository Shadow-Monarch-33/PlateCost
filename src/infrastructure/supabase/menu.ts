import type { SupabaseClient } from "@supabase/supabase-js";
import type { MenuItem, MenuItemWithEconomics } from "../../domain/menu/types";
import { getRecipesWithCosts } from "./recipes";
import { calculateMenuEconomics } from "../../application/menu/costing";
import type { MenuItemInput } from "../../application/validation/menu";

export const MENU_ITEMS_SELECT =
  "id, business_id, recipe_id, name, selling_price, active, created_at, updated_at";

export async function getMenuItemsWithEconomics(
  supabase: SupabaseClient,
  businessId: string
): Promise<MenuItemWithEconomics[]> {
  // 1. Fetch menu items
  const { data: menuItemsData, error: menuItemsError } = await supabase
    .from("menu_items")
    .select(MENU_ITEMS_SELECT)
    .eq("business_id", businessId)
    .order("name", { ascending: true });

  if (menuItemsError) {
    throw new Error(`Failed to fetch menu items: ${menuItemsError.message}`);
  }

  const items = (menuItemsData || []) as MenuItem[];

  // 2. Fetch business assumptions (platform_fee_pct)
  const { data: businessData, error: businessError } = await supabase
    .from("businesses")
    .select("platform_fee_pct, fixed_monthly_cost")
    .eq("id", businessId)
    .single();

  if (businessError && businessError.code !== 'PGRST116') {
    throw new Error(`Failed to fetch business details: ${businessError.message}`);
  }

  const platformFeePct = businessData?.platform_fee_pct;

  // 3. Fetch all recipes with precalculated exact costs
  // Avoids N+1 by grabbing them all at once.
  const recipes = await getRecipesWithCosts(supabase, businessId);
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));

  // 4. Combine
  const result: MenuItemWithEconomics[] = items.map((item) => {
    const recipe = item.recipe_id ? recipeMap.get(item.recipe_id) : null;
    
    const economics = calculateMenuEconomics({
      sellingPrice: item.selling_price,
      costPerServing: recipe ? recipe.cost_per_serving : null,
      platformFeePercent: platformFeePct,
      packagingCost: 0,
      otherVariableCosts: 0,
    });

    return {
      ...item,
      recipe_name: recipe ? recipe.name : null,
      cost_per_serving: recipe ? recipe.cost_per_serving : null,
      food_cost_percent: economics.foodCostPercent,
      contribution: economics.contribution,
      contribution_margin: economics.contributionMargin,
    };
  });

  return result;
}

export async function saveMenuItem(
  supabase: SupabaseClient,
  businessId: string,
  menuItemId: string | null,
  input: MenuItemInput
): Promise<string> {
  const { data, error } = await supabase.rpc("save_menu_item", {
    p_business_id: businessId,
    p_menu_item_id: menuItemId,
    p_recipe_id: input.recipe_id,
    p_name: input.name,
    p_selling_price: input.selling_price,
    p_active: input.active,
  });

  if (error) {
    throw new Error(`Failed to save menu item: ${error.message}`);
  }

  return data as string;
}

export async function deleteMenuItem(
  supabase: SupabaseClient,
  businessId: string,
  menuItemId: string
): Promise<void> {
  const { error } = await supabase
    .from("menu_items")
    .delete()
    .eq("id", menuItemId)
    .eq("business_id", businessId);

  if (error) {
    throw new Error(`Failed to delete menu item: ${error.message}`);
  }
}
