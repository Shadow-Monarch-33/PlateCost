import type { BaseUnit } from "../financial/types";

/**
 * Physical dimension of a supported unit.
 *
 * Recipe quantities may only be expressed in a unit that shares the ingredient
 * base unit's dimension. PlateCost never guesses density or piece weights, so
 * mass ↔ volume, mass ↔ count and volume ↔ count are never compatible.
 *
 * Numeric conversion between compatible units is owned exclusively by the
 * Finance Engine (`normalizeQuantity`); this module only classifies units.
 */
export type UnitDimension = "mass" | "volume" | "count";

const unitDimensions: Record<BaseUnit, UnitDimension> = {
  g: "mass",
  kg: "mass",
  ml: "volume",
  L: "volume",
  piece: "count",
};

const unitsByDimension: Record<UnitDimension, readonly BaseUnit[]> = {
  mass: ["g", "kg"],
  volume: ["ml", "L"],
  count: ["piece"],
};

export function getUnitDimension(unit: BaseUnit): UnitDimension {
  const dimension = unitDimensions[unit];
  if (!dimension) {
    throw new Error(`Unsupported unit: ${String(unit)}.`);
  }
  return dimension;
}

export function areUnitsCompatible(recipeUnit: string, ingredientUnit: string): boolean {
  const recipeDimension = unitDimensions[recipeUnit as BaseUnit];
  const ingredientDimension = unitDimensions[ingredientUnit as BaseUnit];
  return (
    recipeDimension !== undefined &&
    ingredientDimension !== undefined &&
    recipeDimension === ingredientDimension
  );
}

/** Units a recipe may use for an ingredient with the given base unit. */
export function getCompatibleUnits(ingredientUnit: BaseUnit): readonly BaseUnit[] {
  return unitsByDimension[getUnitDimension(ingredientUnit)];
}
