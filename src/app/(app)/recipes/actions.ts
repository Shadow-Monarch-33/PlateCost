"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { resolveUserBusiness } from "@/infrastructure/supabase/ingredients";
import {
  deleteRecipe,
  getRecipesWithCosts,
  saveRecipe,
} from "@/infrastructure/supabase/recipes";
import type { RecipeInput } from "@/application/validation/recipe";
import type { RecipeWithCost } from "@/domain/recipes/types";

export type RecipeActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function toErrorResult(error: unknown, fallback: string): { success: false; error: string } {
  return {
    success: false,
    error: error instanceof Error ? error.message : fallback,
  };
}

/**
 * Every action resolves the tenant server-side through `resolveUserBusiness`,
 * which authorizes with the validated `supabase.auth.getUser()` call and the
 * user's `business_members` row. Client-supplied business/user ids are never
 * accepted.
 */
async function getScopedClient() {
  const supabase = await createSupabaseServerClient();
  const session = await resolveUserBusiness(supabase);
  return { supabase, businessId: session.businessId };
}

export async function createRecipeAction(
  input: RecipeInput,
): Promise<RecipeActionResult<RecipeWithCost[]>> {
  try {
    const { supabase, businessId } = await getScopedClient();
    await saveRecipe(supabase, businessId, null, input);
    const recipes = await getRecipesWithCosts(supabase, businessId);
    revalidatePath("/recipes");
    return { success: true, data: recipes };
  } catch (error) {
    return toErrorResult(error, "Failed to create recipe.");
  }
}

export async function updateRecipeAction(
  recipeId: string,
  input: RecipeInput,
): Promise<RecipeActionResult<RecipeWithCost[]>> {
  try {
    const { supabase, businessId } = await getScopedClient();
    await saveRecipe(supabase, businessId, recipeId, input);
    const recipes = await getRecipesWithCosts(supabase, businessId);
    revalidatePath("/recipes");
    return { success: true, data: recipes };
  } catch (error) {
    return toErrorResult(error, "Failed to update recipe.");
  }
}

export async function deleteRecipeAction(
  recipeId: string,
): Promise<RecipeActionResult<RecipeWithCost[]>> {
  try {
    const { supabase, businessId } = await getScopedClient();
    await deleteRecipe(supabase, businessId, recipeId);
    const recipes = await getRecipesWithCosts(supabase, businessId);
    revalidatePath("/recipes");
    return { success: true, data: recipes };
  } catch (error) {
    return toErrorResult(error, "Failed to delete recipe.");
  }
}
