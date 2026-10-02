"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import {
  resolveUserBusiness,
  getIngredients,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  getIngredientPriceHistory,
} from "@/infrastructure/supabase/ingredients";
import type {
  CreateIngredientInput,
  UpdateIngredientInput,
} from "@/application/validation/ingredient";
import type {
  Ingredient,
  IngredientPriceHistory,
} from "@/domain/ingredients/types";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function fetchIngredientsAction(): Promise<
  ActionResult<{ ingredients: Ingredient[]; businessId: string }>
> {
  try {
    const supabase = await createSupabaseServerClient();
    const session = await resolveUserBusiness(supabase);
    const ingredients = await getIngredients(supabase, session.businessId);
    return {
      success: true,
      data: { ingredients, businessId: session.businessId },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load ingredients.",
    };
  }
}

export async function createIngredientAction(
  input: CreateIngredientInput,
): Promise<ActionResult<Ingredient>> {
  try {
    const supabase = await createSupabaseServerClient();
    const session = await resolveUserBusiness(supabase);
    const created = await createIngredient(supabase, session.businessId, input);
    revalidatePath("/ingredients");
    return { success: true, data: created };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create ingredient.",
    };
  }
}

export async function updateIngredientAction(
  ingredientId: string,
  input: UpdateIngredientInput & { base_unit?: string },
): Promise<ActionResult<Ingredient>> {
  try {
    const supabase = await createSupabaseServerClient();
    const session = await resolveUserBusiness(supabase);
    const updated = await updateIngredient(
      supabase,
      session.businessId,
      ingredientId,
      input,
    );
    revalidatePath("/ingredients");
    return { success: true, data: updated };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update ingredient.",
    };
  }
}

export async function deleteIngredientAction(
  ingredientId: string,
): Promise<ActionResult<void>> {
  try {
    const supabase = await createSupabaseServerClient();
    const session = await resolveUserBusiness(supabase);
    await deleteIngredient(supabase, session.businessId, ingredientId);
    revalidatePath("/ingredients");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete ingredient.",
    };
  }
}

export async function fetchPriceHistoryAction(
  ingredientId: string,
): Promise<ActionResult<IngredientPriceHistory[]>> {
  try {
    const supabase = await createSupabaseServerClient();
    const session = await resolveUserBusiness(supabase);
    const history = await getIngredientPriceHistory(
      supabase,
      session.businessId,
      ingredientId,
    );
    return { success: true, data: history };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch price history.",
    };
  }
}
