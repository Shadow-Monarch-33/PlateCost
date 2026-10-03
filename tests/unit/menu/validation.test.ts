import { describe, it, expect } from "vitest";
import { validateMenuItemInput } from "../../../src/application/validation/menu";

describe("Menu Validation", () => {
  it("accepts valid menu item", () => {
    const valid = {
      name: "Chicken Biryani",
      selling_price: 199.5,
      recipe_id: "00000000-0000-0000-0000-000000000000",
      active: true,
    };
    const result = validateMenuItemInput(valid);
    expect(result).toEqual(valid);
  });

  it("rejects missing or empty names", () => {
    expect(() => validateMenuItemInput({ selling_price: 199, recipe_id: null })).toThrow();
    expect(() => validateMenuItemInput({ name: "   ", selling_price: 199, recipe_id: null })).toThrow();
  });

  it("rejects negative selling prices", () => {
    expect(() => validateMenuItemInput({ name: "Item", selling_price: -5, recipe_id: null })).toThrow();
    expect(() => validateMenuItemInput({ name: "Item", selling_price: 0, recipe_id: null })).toThrow();
  });
});
