import { describe, it, expect } from "vitest";
import {
  createIngredientSchema,
  updateIngredientSchema,
  supportedBaseUnits,
} from "../../../src/application/validation/ingredient";
import {
  IngredientReferencedInRecipesError,
  BaseUnitImmutableError,
} from "../../../src/application/ingredients/errors";

describe("Ingredient Validation Schemas", () => {
  describe("createIngredientSchema", () => {
    it("accepts valid canonical ingredient inputs", () => {
      const validCases = [
        {
          name: "Chicken",
          base_unit: "kg",
          current_price: 330,
          supplier: "Local Poultry Farm",
        },
        {
          name: "Rice",
          base_unit: "kg",
          current_price: 55,
          supplier: null,
        },
        {
          name: "Oil",
          base_unit: "L",
          current_price: 170,
        },
        {
          name: "Eggs",
          base_unit: "piece",
          current_price: "6.50", // handles numeric string coercion
          supplier: "Egg Wholesale",
        },
        {
          name: "Salt",
          base_unit: "g",
          current_price: 0, // 0 price is allowed (e.g. water or free item)
        },
      ];

      for (const testCase of validCases) {
        const result = createIngredientSchema.safeParse(testCase);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe(testCase.name);
          expect(typeof result.data.current_price).toBe("number");
        }
      }
    });

    it("rejects empty, whitespace-only, or overly long names", () => {
      const invalidNames = ["", "   ", "a".repeat(101)];
      for (const name of invalidNames) {
        const res = createIngredientSchema.safeParse({
          name,
          base_unit: "kg",
          current_price: 100,
        });
        expect(res.success).toBe(false);
      }
    });

    it("rejects non-canonical or legacy units", () => {
      const invalidUnits = [
        "packet",
        "box",
        "dozen",
        "cup",
        "tbsp",
        "tsp",
        "each", // legacy deprecated
        "l", // lowercase l deprecated
        "KG",
        "G",
      ];

      for (const unit of invalidUnits) {
        const res = createIngredientSchema.safeParse({
          name: "Test Item",
          base_unit: unit,
          current_price: 50,
        });
        expect(res.success).toBe(false);
      }
    });

    it("accepts only canonical base units: g, kg, ml, L, piece", () => {
      expect(supportedBaseUnits).toEqual(["g", "kg", "ml", "L", "piece"]);
      for (const unit of supportedBaseUnits) {
        const res = createIngredientSchema.safeParse({
          name: "Test",
          base_unit: unit,
          current_price: 10,
        });
        expect(res.success).toBe(true);
      }
    });

    it("rejects negative or NaN prices", () => {
      const invalidPrices = [-0.01, -100, "abc", NaN, Infinity, -Infinity];
      for (const price of invalidPrices) {
        const res = createIngredientSchema.safeParse({
          name: "Test Item",
          base_unit: "kg",
          current_price: price,
        });
        expect(res.success).toBe(false);
      }
    });

    it("trims strings and normalizes empty supplier to null", () => {
      const res = createIngredientSchema.parse({
        name: "  Flour  ",
        base_unit: "kg",
        current_price: "45.50",
        supplier: "   ",
      });
      expect(res.name).toBe("Flour");
      expect(res.current_price).toBe(45.5);
      expect(res.supplier).toBeNull();
    });
  });

  describe("updateIngredientSchema", () => {
    it("allows updating name, price, and supplier independently", () => {
      const res1 = updateIngredientSchema.parse({ current_price: 350 });
      expect(res1.current_price).toBe(350);

      const res2 = updateIngredientSchema.parse({ name: "Boneless Chicken" });
      expect(res2.name).toBe("Boneless Chicken");

      const res3 = updateIngredientSchema.parse({ supplier: "New Vendor" });
      expect(res3.supplier).toBe("New Vendor");
    });

    it("does not allow base_unit to be updated (stripped/ignored by schema)", () => {
      const input = {
        name: "Chicken",
        base_unit: "g", // attempt to modify base unit
        current_price: 350,
      };
      const parsed = updateIngredientSchema.parse(input);
      // base_unit is not in UpdateIngredientInput type
      expect("base_unit" in parsed).toBe(false);
    });

    it("rejects negative prices on update", () => {
      const res = updateIngredientSchema.safeParse({ current_price: -5 });
      expect(res.success).toBe(false);
    });
  });

  describe("Application Errors", () => {
    it("formats IngredientReferencedInRecipesError correctly for singular and plural", () => {
      const err1 = new IngredientReferencedInRecipesError(1);
      expect(err1.message).toContain("used in 1 recipe.");
      expect(err1.recipeCount).toBe(1);

      const err2 = new IngredientReferencedInRecipesError(3);
      expect(err2.message).toContain("used in 3 recipes.");
      expect(err2.recipeCount).toBe(3);
    });

    it("formats BaseUnitImmutableError with canonical message", () => {
      const err = new BaseUnitImmutableError();
      expect(err.message).toBe("Base unit cannot be changed after creation.");
    });
  });
});
