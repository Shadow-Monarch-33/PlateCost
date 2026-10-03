import { describe, it, expect } from "vitest";
import { calculateMenuEconomics } from "../../../src/application/menu/costing";

describe("Menu Costing", () => {
  it("calculates correct economics matching exact formula", () => {
    // Recipe cost/serving = 82, Selling price = 199, Platform fee = 0
    const result = calculateMenuEconomics({
      sellingPrice: 199,
      costPerServing: 82,
      platformFeePercent: 0,
      packagingCost: 0,
      otherVariableCosts: 0,
    });

    // Food cost = 82 / 199 = 41.206... -> 41.21%
    expect(result.foodCostPercent).toBe("41.21");
    // Contribution = 199 - 82 = 117
    expect(result.contribution).toBe("117.00");
    // Margin = 117 / 199 = 58.79%
    expect(result.contributionMargin).toBe("58.79");
  });

  it("applies platform fees and extra costs correctly", () => {
    // Selling price = 199, Cost/serving = 82, Platform = 25%, Packaging = 10, Other = 15
    const result = calculateMenuEconomics({
      sellingPrice: 199,
      costPerServing: 82,
      platformFeePercent: 25,
      packagingCost: 10,
      otherVariableCosts: 15,
    });

    // Platform fee = 199 * 0.25 = 49.75
    // Contribution = 199 - 82 - 10 - 15 - 49.75 = 42.25
    expect(result.contribution).toBe("42.25");
    // Margin = 42.25 / 199 = 21.23%
    expect(result.contributionMargin).toBe("21.23");
  });

  it("handles null costPerServing correctly", () => {
    const result = calculateMenuEconomics({
      sellingPrice: 199,
      costPerServing: null,
    });

    expect(result.foodCostPercent).toBeNull();
    expect(result.contribution).toBeNull();
    expect(result.contributionMargin).toBeNull();
  });

  it("handles zero or negative selling prices without throwing", () => {
    const resultZero = calculateMenuEconomics({
      sellingPrice: 0,
      costPerServing: 82,
    });
    expect(resultZero.foodCostPercent).toBeNull();
    expect(resultZero.contribution).toBeNull();

    const resultNegative = calculateMenuEconomics({
      sellingPrice: -10,
      costPerServing: 82,
    });
    expect(resultNegative.foodCostPercent).toBeNull();
    expect(resultNegative.contribution).toBeNull();
  });
});
