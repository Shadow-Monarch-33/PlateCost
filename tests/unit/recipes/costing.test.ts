import { describe, it, expect } from "vitest";
import { costRecipe } from "../../../src/application/recipes/costing";
import { IncompatibleRecipeUnitError } from "../../../src/application/recipes/errors";
import { Decimal } from "../../../src/lib/finance";

describe("Recipe Costing", () => {
  it("calculates recipe cost with multiple dimensions", () => {
    const result = costRecipe({
      servings: 2,
      lines: [
        {
          quantity: 500,
          unit: "g",
          ingredientCurrentPrice: 100, // per kg
          ingredientBaseUnit: "kg",
        },
        {
          quantity: 2,
          unit: "L",
          ingredientCurrentPrice: 50, // per L
          ingredientBaseUnit: "L",
        },
        {
          quantity: 1,
          unit: "piece",
          ingredientCurrentPrice: 10, // per piece
          ingredientBaseUnit: "piece",
        },
      ],
    });

    expect(result.lineCosts.map((c) => c.toNumber())).toEqual([50, 100, 10]);
    expect(result.batchCost.toNumber()).toBe(160);
    expect(result.costPerServing.toNumber()).toBe(80);
  });

  it("throws IncompatibleRecipeUnitError if units are incompatible", () => {
    expect(() => {
      costRecipe({
        servings: 1,
        lines: [
          {
            quantity: 500,
            unit: "ml",
            ingredientCurrentPrice: 100,
            ingredientBaseUnit: "kg", // Mismatch
          },
        ],
      });
    }).toThrow(IncompatibleRecipeUnitError);
  });
});
