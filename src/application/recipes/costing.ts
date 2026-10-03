import {
  calculateIngredientCost,
  calculateRecipeCost,
  Decimal,
  toDecimal,
} from "@/lib/finance";
import type { BaseUnit } from "@/domain/financial/types";
import { areUnitsCompatible } from "@/domain/recipes/unit-dimensions";
import { IncompatibleRecipeUnitError } from "./errors";

type NumericInput = Decimal | string | number;

export interface CostableRecipeLine {
  quantity: NumericInput;
  unit: BaseUnit;
  /** CURRENT ingredient price per base unit — the only authoritative price. */
  ingredientCurrentPrice: NumericInput;
  ingredientBaseUnit: BaseUnit;
}

export interface RecipeCosting {
  lineCosts: Decimal[];
  batchCost: Decimal;
  costPerServing: Decimal;
}

/**
 * Adapter between recipe data and the deterministic Finance Engine.
 *
 *   line cost        = normalized quantity × current ingredient price
 *   batch cost       = Σ line costs (summed unrounded, rounded once)
 *   cost per serving = batch cost / servings
 *
 * Unit normalization is performed by the Finance Engine. Cross-dimension units
 * are rejected before reaching the engine; no density/piece-weight guessing.
 */
export function costRecipe(input: {
  servings: NumericInput;
  lines: readonly CostableRecipeLine[];
}): RecipeCosting {
  const engineLines = input.lines.map((line) => {
    if (!areUnitsCompatible(line.unit, line.ingredientBaseUnit)) {
      throw new IncompatibleRecipeUnitError(line.unit, line.ingredientBaseUnit);
    }
    return {
      recipeQuantity: toDecimal(line.quantity),
      recipeUnit: line.unit,
      ingredientPrice: toDecimal(line.ingredientCurrentPrice),
      ingredientUnit: line.ingredientBaseUnit,
    };
  });

  const { batchCost, costPerServing } = calculateRecipeCost({
    ingredients: engineLines,
    servings: toDecimal(input.servings),
  });

  return {
    lineCosts: engineLines.map((line) => calculateIngredientCost(line)),
    batchCost,
    costPerServing,
  };
}

/** Serializes an engine money value (already 2-dp) for transport to the client. */
export function moneyToString(value: Decimal): string {
  return value.toFixed(2);
}
