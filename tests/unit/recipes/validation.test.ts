import { describe, it, expect } from "vitest";
import { recipeInputSchema, validateRecipeInput } from "../../../src/application/validation/recipe";

describe("Recipe Validation", () => {
  const available = [
    {
      id: "78a6ff61-7bfd-46ee-876e-57b102b4d994",
      name: "Sugar",
      base_unit: "kg" as const,
    }
  ];

  it("validates valid input", () => {
    const input = {
      name: "Chocolate Cake",
      servings: "10",
      ingredients: [
        {
          ingredient_id: "78a6ff61-7bfd-46ee-876e-57b102b4d994",
          quantity: "500",
          unit: "g",
        }
      ]
    };

    const result = validateRecipeInput(input, available);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Chocolate Cake");
      expect(result.data.servings).toBe(10);
      expect(result.data.ingredients).toHaveLength(1);
      expect(result.data.ingredients[0]!.quantity).toBe(500);
    }
  });

  it("rejects empty name", () => {
    const input = { name: "   ", servings: 1, ingredients: [] };
    const result = recipeInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects negative or zero servings", () => {
    const input0 = { name: "A", servings: 0, ingredients: [] };
    const result0 = recipeInputSchema.safeParse(input0);
    expect(result0.success).toBe(false);

    const inputNeg = { name: "A", servings: -5, ingredients: [] };
    const resultNeg = recipeInputSchema.safeParse(inputNeg);
    expect(resultNeg.success).toBe(false);
  });

  it("rejects non-existent rows during strict validation", () => {
    const input = {
      name: "Cake",
      servings: 1,
      ingredients: []
    };
    const result = validateRecipeInput(input, available);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Add at least one ingredient.");
    }
  });

  it("rejects duplicate ingredients in strict validation", () => {
    const input = {
      name: "Cake",
      servings: 1,
      ingredients: [
        { ingredient_id: "78a6ff61-7bfd-46ee-876e-57b102b4d994", quantity: 100, unit: "g" },
        { ingredient_id: "78a6ff61-7bfd-46ee-876e-57b102b4d994", quantity: 200, unit: "g" },
      ]
    };
    const result = validateRecipeInput(input, available);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/Each ingredient can only be added once/);
    }
  });
});
