import type { SupabaseClient } from "@supabase/supabase-js";
import type { BaseUnit } from "../../domain/financial/types";
import type {
  RecipeIngredientLine,
  RecipeWithCost,
} from "../../domain/recipes/types";
import {
  validateRecipeInput,
  type RecipeInput,
} from "../../application/validation/recipe";
import { costRecipe, moneyToString } from "../../application/recipes/costing";
import {
  RecipeNotFoundError,
  RecipeValidationError,
} from "../../application/recipes/errors";
import { getIngredients } from "./ingredients";

/**
 * Single round-trip recipe list query. PostgREST resource embedding joins
 * recipes → recipe_ingredients → ingredients in ONE request, so the list never
 * issues a query per recipe (no N+1). The embedded ingredient carries its
 * CURRENT price, which is the only price used for costing.
 */
export const RECIPE_LIST_SELECT =
  "id, name, servings, created_at, updated_at, " +
  "recipe_ingredients(ingredient_id, quantity, unit, ingredients(id, name, base_unit, current_price))";

interface EmbeddedIngredient {
  id: string;
  name: string;
  base_unit: BaseUnit;
  current_price: number | string;
}

interface RecipeIngredientRow {
  ingredient_id: string;
  quantity: number | string;
  unit: BaseUnit;
  ingredients: EmbeddedIngredient | EmbeddedIngredient[] | null;
}

interface RecipeRow {
  id: string;
  name: string;
  servings: number | string;
  created_at: string;
  updated_at: string;
  recipe_ingredients: RecipeIngredientRow[] | null;
}

function unwrapIngredient(
  embedded: RecipeIngredientRow["ingredients"],
): EmbeddedIngredient | null {
  if (Array.isArray(embedded)) return embedded[0] ?? null;
  return embedded ?? null;
}

export function mapRecipeRow(row: RecipeRow): RecipeWithCost {
  const rawLines = (row.recipe_ingredients ?? []).map((line) => {
    const ingredient = unwrapIngredient(line.ingredients);
    if (!ingredient) {
      throw new Error("Recipe references an ingredient that is not accessible.");
    }
    return { line, ingredient };
  });

  rawLines.sort((a, b) => a.ingredient.name.localeCompare(b.ingredient.name));

  const costing = costRecipe({
    servings: String(row.servings),
    lines: rawLines.map(({ line, ingredient }) => ({
      quantity: String(line.quantity),
      unit: line.unit,
      ingredientCurrentPrice: String(ingredient.current_price),
      ingredientBaseUnit: ingredient.base_unit,
    })),
  });

  const lines: RecipeIngredientLine[] = rawLines.map(({ line, ingredient }, index) => ({
    ingredient_id: line.ingredient_id,
    ingredient_name: ingredient.name,
    quantity: String(line.quantity),
    unit: line.unit,
    ingredient_base_unit: ingredient.base_unit,
    ingredient_current_price: String(ingredient.current_price),
    line_cost: moneyToString(costing.lineCosts[index]!),
  }));

  return {
    id: String(row.id),
    name: String(row.name),
    servings: String(row.servings),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    lines,
    batch_cost: moneyToString(costing.batchCost),
    cost_per_serving: moneyToString(costing.costPerServing),
  };
}

export async function getRecipesWithCosts(
  supabase: SupabaseClient,
  businessId: string,
): Promise<RecipeWithCost[]> {
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_LIST_SELECT)
    .eq("business_id", businessId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch recipes: ${error.message}`);
  }

  return ((data ?? []) as unknown as RecipeRow[]).map(mapRecipeRow);
}

/**
 * Creates (recipeId = null) or fully updates a recipe via the atomic
 * `save_recipe` RPC. The business id comes from the server-resolved session,
 * never from the client.
 */
export async function saveRecipe(
  supabase: SupabaseClient,
  businessId: string,
  recipeId: string | null,
  input: RecipeInput,
): Promise<string> {
  const available = await getIngredients(supabase, businessId);
  const validation = validateRecipeInput(input, available);
  if (!validation.success) {
    throw new RecipeValidationError(validation.error);
  }
  const recipe = validation.data;

  const { data, error } = await supabase.rpc("save_recipe", {
    p_business_id: businessId,
    p_recipe_id: recipeId,
    p_name: recipe.name,
    p_servings: recipe.servings,
    p_ingredients: recipe.ingredients.map((line) => ({
      ingredient_id: line.ingredient_id,
      quantity: line.quantity,
      unit: line.unit,
    })),
  });

  if (error) {
    if (error.code === "23505") {
      throw new RecipeValidationError(
        `A recipe named "${recipe.name}" already exists in this business.`,
      );
    }
    if (error.message.includes("Recipe not found")) {
      throw new RecipeNotFoundError();
    }
    throw new Error(`Failed to save recipe: ${error.message}`);
  }

  return String(data);
}

/**
 * Deletes a recipe. Live FK `recipe_ingredients.recipe_id` is ON DELETE CASCADE,
 * so dependent lines are removed atomically by PostgreSQL — no orphans and no
 * manual pre-delete. Ingredients themselves are untouched.
 */
export async function deleteRecipe(
  supabase: SupabaseClient,
  businessId: string,
  recipeId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", recipeId)
    .eq("business_id", businessId)
    .select("id");

  if (error) {
    throw new Error(`Failed to delete recipe: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new RecipeNotFoundError();
  }
}
