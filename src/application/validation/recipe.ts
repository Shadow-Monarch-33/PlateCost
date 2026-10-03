import { z } from "zod";
import type { BaseUnit } from "@/domain/financial/types";
import {
  areUnitsCompatible,
  getCompatibleUnits,
} from "@/domain/recipes/unit-dimensions";
import { supportedBaseUnits } from "./ingredient";

export const RECIPE_NAME_MAX_LENGTH = 100;
export const DEFAULT_SERVINGS = 1;
export const NO_INGREDIENT_ROWS_MESSAGE = "Add at least one ingredient.";

const recipeIngredientSchema = z.object({
  ingredient_id: z.guid("Select an ingredient for every row."),
  quantity: z.coerce
    .number({ message: "Quantity must be a valid number." })
    .finite("Quantity must be a valid number.")
    .gt(0, "Quantity must be greater than 0."),
  unit: z.enum(supportedBaseUnits, {
    message: "Unit must be one of: g, kg, ml, L, piece",
  }),
});

/**
 * Recipe input schema. Mirrors Ingredient name conventions:
 * trimmed, non-empty, at most 100 characters.
 */
export const recipeInputSchema = z
  .object({
    name: z
      .string({ message: "Recipe name cannot be empty" })
      .trim()
      .min(1, "Recipe name cannot be empty")
      .max(RECIPE_NAME_MAX_LENGTH, "Recipe name is too long"),
    servings: z.coerce
      .number({ message: "Servings must be a valid number." })
      .finite("Servings must be a valid number.")
      .gt(0, "Servings must be greater than 0.")
      .default(DEFAULT_SERVINGS),
    ingredients: z
      .array(recipeIngredientSchema, { message: NO_INGREDIENT_ROWS_MESSAGE })
      .min(1, NO_INGREDIENT_ROWS_MESSAGE),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    value.ingredients.forEach((line, index) => {
      if (seen.has(line.ingredient_id)) {
        ctx.addIssue({
          code: "custom",
          path: ["ingredients", index, "ingredient_id"],
          message: "Each ingredient can only be added once per recipe.",
        });
      }
      seen.add(line.ingredient_id);
    });
  });

export type RecipeInput = z.input<typeof recipeInputSchema>;
export type ValidRecipeInput = z.output<typeof recipeInputSchema>;

export interface AvailableIngredient {
  id: string;
  name: string;
  base_unit: BaseUnit;
}

/**
 * Validates that every line references an available ingredient of the
 * business and uses a unit of the same dimension as its base unit.
 * Returns an error message, or null when valid.
 */
export function validateRecipeIngredientUnits(
  lines: ValidRecipeInput["ingredients"],
  available: readonly AvailableIngredient[],
): string | null {
  const byId = new Map(available.map((ingredient) => [ingredient.id, ingredient]));
  for (const line of lines) {
    const ingredient = byId.get(line.ingredient_id);
    if (!ingredient) {
      return "Selected ingredient is not available.";
    }
    if (!areUnitsCompatible(line.unit, ingredient.base_unit)) {
      const allowed = getCompatibleUnits(ingredient.base_unit).join(" or ");
      return `Unit "${line.unit}" is not compatible with ${ingredient.name} (${ingredient.base_unit}). Use ${allowed}.`;
    }
  }
  return null;
}

export type RecipeValidationResult =
  | { success: true; data: ValidRecipeInput }
  | { success: false; error: string };

/** Full recipe validation shared by the client form and the server. */
export function validateRecipeInput(
  input: unknown,
  available: readonly AvailableIngredient[],
): RecipeValidationResult {
  const parsed = recipeInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid recipe.",
    };
  }

  const unitError = validateRecipeIngredientUnits(parsed.data.ingredients, available);
  if (unitError) {
    return { success: false, error: unitError };
  }

  return { success: true, data: parsed.data };
}
