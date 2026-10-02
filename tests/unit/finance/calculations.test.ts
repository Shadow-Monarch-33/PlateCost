import { describe, expect, it } from "vitest";
import {
  calculateBreakEvenOrders,
  calculateCashFlow,
  calculateContribution,
  calculateContributionMargin,
  calculateFoodCostPercent,
  calculateIngredientCost,
  calculateMonthlyContribution,
  calculateMonthlyOperatingResult,
  calculateMonthlyRevenue,
  calculateMonthlyVariableCosts,
  calculatePlatformFee,
  calculatePriceChangeImpact,
  calculateRecipeCost,
  calculateRunway,
  calculateScenario,
  Decimal,
  FinanceValidationError,
} from "@/lib/finance";

const d = (val: string) => new Decimal(val);

describe("Finance Engine — Deterministic Calculation Tests", () => {
  describe("calculateIngredientCost", () => {
    it("calculates cost with exact base unit matching", () => {
      const cost = calculateIngredientCost({
        recipeQuantity: d("2"),
        recipeUnit: "kg",
        ingredientPrice: d("100"),
        ingredientUnit: "kg",
      });
      expect(cost.equals(d("200.00"))).toBe(true);
    });

    it("calculates cost with normalized units (g to kg)", () => {
      // 200g of chicken @ ₹250/kg = 0.2kg * ₹250 = ₹50.00
      const cost = calculateIngredientCost({
        recipeQuantity: d("200"),
        recipeUnit: "g",
        ingredientPrice: d("250"),
        ingredientUnit: "kg",
      });
      expect(cost.equals(d("50.00"))).toBe(true);
    });

    it("calculates cost with decimal quantities (ml to L)", () => {
      // 250ml oil @ ₹180/L = 0.25L * ₹180 = ₹45.00
      const cost = calculateIngredientCost({
        recipeQuantity: d("250"),
        recipeUnit: "ml",
        ingredientPrice: d("180"),
        ingredientUnit: "L",
      });
      expect(cost.equals(d("45.00"))).toBe(true);
    });

    it("allows valid zero price (e.g. tap water / complimentary salt)", () => {
      const cost = calculateIngredientCost({
        recipeQuantity: d("500"),
        recipeUnit: "ml",
        ingredientPrice: d("0"),
        ingredientUnit: "ml",
      });
      expect(cost.equals(d("0.00"))).toBe(true);
    });

    it("rejects non-positive recipe quantities", () => {
      expect(() =>
        calculateIngredientCost({
          recipeQuantity: d("0"),
          recipeUnit: "g",
          ingredientPrice: d("100"),
          ingredientUnit: "kg",
        }),
      ).toThrow(FinanceValidationError);

      expect(() =>
        calculateIngredientCost({
          recipeQuantity: d("-10"),
          recipeUnit: "g",
          ingredientPrice: d("100"),
          ingredientUnit: "kg",
        }),
      ).toThrow(FinanceValidationError);
    });

    it("rejects negative ingredient prices", () => {
      expect(() =>
        calculateIngredientCost({
          recipeQuantity: d("100"),
          recipeUnit: "g",
          ingredientPrice: d("-50"),
          ingredientUnit: "kg",
        }),
      ).toThrow(FinanceValidationError);
    });
  });

  describe("calculateRecipeCost", () => {
    it("aggregates multiple ingredients with unit normalization and serves per portion", () => {
      // Chicken Biryani batch (4 servings):
      // - 800g Chicken @ ₹250/kg = ₹200.00
      // - 600g Basmati Rice @ ₹120/kg = ₹72.00
      // - 200ml Ghee/Oil @ ₹200/L = ₹40.00
      // - 4 pieces Boiled Eggs @ ₹4/piece = ₹16.00
      // Batch cost = ₹328.00
      // Cost per serving = ₹328.00 / 4 = ₹82.00
      const result = calculateRecipeCost({
        ingredients: [
          { recipeQuantity: d("800"), recipeUnit: "g", ingredientPrice: d("250"), ingredientUnit: "kg" },
          { recipeQuantity: d("600"), recipeUnit: "g", ingredientPrice: d("120"), ingredientUnit: "kg" },
          { recipeQuantity: d("200"), recipeUnit: "ml", ingredientPrice: d("200"), ingredientUnit: "L" },
          { recipeQuantity: d("4"), recipeUnit: "piece", ingredientPrice: d("4"), ingredientUnit: "piece" },
        ],
        servings: d("4"),
      });

      expect(result.batchCost.equals(d("328.00"))).toBe(true);
      expect(result.costPerServing.equals(d("82.00"))).toBe(true);
    });

    it("defaults to 1 serving when not specified", () => {
      const result = calculateRecipeCost({
        ingredients: [
          { recipeQuantity: d("1"), recipeUnit: "piece", ingredientPrice: d("50"), ingredientUnit: "piece" },
        ],
      });
      expect(result.batchCost.equals(d("50.00"))).toBe(true);
      expect(result.costPerServing.equals(d("50.00"))).toBe(true);
    });

    it("rejects invalid servings (<= 0)", () => {
      expect(() =>
        calculateRecipeCost({
          ingredients: [
            { recipeQuantity: d("1"), recipeUnit: "piece", ingredientPrice: d("50"), ingredientUnit: "piece" },
          ],
          servings: d("0"),
        }),
      ).toThrow(FinanceValidationError);

      expect(() =>
        calculateRecipeCost({
          ingredients: [
            { recipeQuantity: d("1"), recipeUnit: "piece", ingredientPrice: d("50"), ingredientUnit: "piece" },
          ],
          servings: d("-2"),
        }),
      ).toThrow(FinanceValidationError);
    });

    it("rejects invalid ingredient quantity in recipe", () => {
      expect(() =>
        calculateRecipeCost({
          ingredients: [
            { recipeQuantity: d("-1"), recipeUnit: "kg", ingredientPrice: d("100"), ingredientUnit: "kg" },
          ],
        }),
      ).toThrow(FinanceValidationError);
    });
  });

  describe("Unit Economics & Contribution", () => {
    it("calculates food cost percentage on 0-100 scale", () => {
      const pct = calculateFoodCostPercent({
        ingredientCost: d("82"),
        sellingPrice: d("199"),
      });
      expect(pct.equals(d("41.2060"))).toBe(true);
    });

    it("rejects non-positive selling price for food cost percent", () => {
      expect(() =>
        calculateFoodCostPercent({
          ingredientCost: d("82"),
          sellingPrice: d("0"),
        }),
      ).toThrow(FinanceValidationError);

      expect(() =>
        calculateFoodCostPercent({
          ingredientCost: d("82"),
          sellingPrice: d("-100"),
        }),
      ).toThrow(FinanceValidationError);
    });

    it("rejects negative ingredient cost for food cost percent", () => {
      expect(() =>
        calculateFoodCostPercent({
          ingredientCost: d("-10"),
          sellingPrice: d("100"),
        }),
      ).toThrow(FinanceValidationError);
    });

    it("calculates platform fee at 0% and 25%", () => {
      const zeroFee = calculatePlatformFee({
        sellingPrice: d("200"),
        platformFeePercent: d("0"),
      });
      expect(zeroFee.equals(d("0.00"))).toBe(true);

      const fee25 = calculatePlatformFee({
        sellingPrice: d("200"),
        platformFeePercent: d("0.25"),
      });
      expect(fee25.equals(d("50.00"))).toBe(true);
    });

    it("rejects platform fee percent outside [0, 1]", () => {
      expect(() =>
        calculatePlatformFee({
          sellingPrice: d("100"),
          platformFeePercent: d("-0.01"),
        }),
      ).toThrow(FinanceValidationError);

      expect(() =>
        calculatePlatformFee({
          sellingPrice: d("100"),
          platformFeePercent: d("1.01"),
        }),
      ).toThrow(FinanceValidationError);

      expect(() =>
        calculatePlatformFee({
          sellingPrice: d("100"),
          platformFeePercent: d("25"), // must be 0-1 ratio, not 25
        }),
      ).toThrow(FinanceValidationError);
    });

    it("handles zero packaging and zero other variable costs", () => {
      const contribution = calculateContribution({
        sellingPrice: d("100"),
        ingredientCost: d("40"),
        packagingCost: d("0"),
        platformFeePercent: d("0"),
        otherVariableCosts: d("0"),
      });
      expect(contribution.equals(d("60.00"))).toBe(true);
    });

    it("permits negative contribution and does not clamp it", () => {
      // Selling price 100, ingredients 120, packaging 10 -> contribution = -30
      const contribution = calculateContribution({
        sellingPrice: d("100"),
        ingredientCost: d("120"),
        packagingCost: d("10"),
        platformFeePercent: d("0"),
        otherVariableCosts: d("0"),
      });
      expect(contribution.equals(d("-30.00"))).toBe(true);

      const margin = calculateContributionMargin({
        contribution,
        sellingPrice: d("100"),
      });
      expect(margin.equals(d("-30.0000"))).toBe(true);
    });

    it("rejects negative packaging and other variable costs", () => {
      expect(() =>
        calculateContribution({
          sellingPrice: d("100"),
          ingredientCost: d("30"),
          packagingCost: d("-5"),
          platformFeePercent: d("0.2"),
          otherVariableCosts: d("10"),
        }),
      ).toThrow(FinanceValidationError);

      expect(() =>
        calculateContribution({
          sellingPrice: d("100"),
          ingredientCost: d("30"),
          packagingCost: d("5"),
          platformFeePercent: d("0.2"),
          otherVariableCosts: d("-10"),
        }),
      ).toThrow(FinanceValidationError);
    });
  });

  describe("Monthly Model", () => {
    it("rejects negative orders per day and non-positive days per month", () => {
      expect(() =>
        calculateMonthlyRevenue({
          sellingPrice: d("100"),
          ordersPerDay: d("-1"),
          daysPerMonth: d("30"),
        }),
      ).toThrow(FinanceValidationError);

      expect(() =>
        calculateMonthlyRevenue({
          sellingPrice: d("100"),
          ordersPerDay: d("50"),
          daysPerMonth: d("0"),
        }),
      ).toThrow(FinanceValidationError);
    });

    it("handles zero orders per day correctly", () => {
      const revenue = calculateMonthlyRevenue({
        sellingPrice: d("199"),
        ordersPerDay: d("0"),
        daysPerMonth: d("30"),
      });
      expect(revenue.equals(d("0.00"))).toBe(true);

      const variableCosts = calculateMonthlyVariableCosts({
        sellingPrice: d("199"),
        ordersPerDay: d("0"),
        daysPerMonth: d("30"),
        ingredientCost: d("82"),
        packagingCost: d("10"),
        platformFeePercent: d("0.25"),
        otherVariableCosts: d("15"),
      });
      expect(variableCosts.equals(d("0.00"))).toBe(true);

      const contribution = calculateMonthlyContribution({
        sellingPrice: d("199"),
        ordersPerDay: d("0"),
        daysPerMonth: d("30"),
        ingredientCost: d("82"),
        packagingCost: d("10"),
        platformFeePercent: d("0.25"),
        otherVariableCosts: d("15"),
      });
      expect(contribution.equals(d("0.00"))).toBe(true);
    });

    it("calculates monthly operating result including positive, negative, and invalid fixed costs", () => {
      // Positive operating result
      const profit = calculateMonthlyOperatingResult({
        monthlyContribution: d("63375"),
        monthlyFixedCosts: d("55000"),
      });
      expect(profit.equals(d("8375.00"))).toBe(true);

      // Negative operating result (loss)
      const loss = calculateMonthlyOperatingResult({
        monthlyContribution: d("40000"),
        monthlyFixedCosts: d("55000"),
      });
      expect(loss.equals(d("-15000.00"))).toBe(true);

      // Negative fixed costs rejected
      expect(() =>
        calculateMonthlyOperatingResult({
          monthlyContribution: d("50000"),
          monthlyFixedCosts: d("-1000"),
        }),
      ).toThrow(FinanceValidationError);
    });
  });

  describe("Break-Even Calculation", () => {
    it("returns reachable with finite orders for positive contribution", () => {
      const result = calculateBreakEvenOrders({
        monthlyFixedCost: d("60000"),
        contributionPerOrder: d("50"),
        daysPerMonth: d("30"),
      });
      expect(result.kind).toBe("reachable");
      if (result.kind === "reachable") {
        expect(result.monthlyOrders.equals(d("1200.00"))).toBe(true);
        expect(result.dailyOrders.equals(d("40.00"))).toBe(true);
      }
    });

    it("returns 0 break-even orders when fixed costs are 0", () => {
      const result = calculateBreakEvenOrders({
        monthlyFixedCost: d("0"),
        contributionPerOrder: d("50"),
      });
      expect(result.kind).toBe("reachable");
      if (result.kind === "reachable") {
        expect(result.monthlyOrders.equals(d("0.00"))).toBe(true);
        expect(result.dailyOrders.equals(d("0.00"))).toBe(true);
      }
    });

    it("returns unreachable when fixed cost > 0 and contribution is 0", () => {
      const result = calculateBreakEvenOrders({
        monthlyFixedCost: d("50000"),
        contributionPerOrder: d("0"),
      });
      expect(result.kind).toBe("unreachable");
    });

    it("returns unreachable when fixed cost > 0 and contribution is negative", () => {
      const result = calculateBreakEvenOrders({
        monthlyFixedCost: d("50000"),
        contributionPerOrder: d("-20"),
      });
      expect(result.kind).toBe("unreachable");
    });

    it("rejects negative fixed costs", () => {
      expect(() =>
        calculateBreakEvenOrders({
          monthlyFixedCost: d("-1000"),
          contributionPerOrder: d("50"),
        }),
      ).toThrow(FinanceValidationError);
    });
  });

  describe("Cash Model & Runway", () => {
    it("handles launch month with startup costs and ensures they do not recur", () => {
      // Month 1: launch with ₹50,000 startup cost
      const month1 = calculateCashFlow({
        startingCash: d("300000"),
        grossRevenue: d("298500"),
        platformFees: d("74625"),
        otherVariableCosts: d("160500"),
        fixedCosts: d("55000"),
        startupCosts: d("50000"),
      });
      // netCashReceived = 223875
      // cashOutflow = 160500 + 55000 + 50000 = 265500
      // netCashFlow = 223875 - 265500 = -41625
      // endingCash = 300000 - 41625 = 258375
      expect(month1.netCashFlow.equals(d("-41625.00"))).toBe(true);
      expect(month1.endingCash.equals(d("258375.00"))).toBe(true);

      // Month 2: regular operations (startup costs 0, not recurring)
      const month2 = calculateCashFlow({
        startingCash: month1.endingCash,
        grossRevenue: d("298500"),
        platformFees: d("74625"),
        otherVariableCosts: d("160500"),
        fixedCosts: d("55000"),
        startupCosts: d("0"),
      });
      // netCashFlow = +8375.00
      // endingCash = 258375 + 8375 = 266750.00
      expect(month2.netCashFlow.equals(d("8375.00"))).toBe(true);
      expect(month2.endingCash.equals(d("266750.00"))).toBe(true);
    });

    it("permits negative cash balance where economically valid", () => {
      const flow = calculateCashFlow({
        startingCash: d("10000"),
        grossRevenue: d("50000"),
        platformFees: d("10000"),
        otherVariableCosts: d("40000"),
        fixedCosts: d("30000"),
      });
      // netCashReceived = 40000, outflow = 70000, netFlow = -30000
      // endingCash = 10000 - 30000 = -20000.00
      expect(flow.endingCash.equals(d("-20000.00"))).toBe(true);
    });

    it("calculates runway when burning cash", () => {
      const runway = calculateRunway({
        availableCash: d("300000"),
        monthlyNetBurn: d("50000"),
      });
      expect(runway.kind).toBe("burning");
      if (runway.kind === "burning") {
        expect(runway.months.equals(d("6.00"))).toBe(true);
      }
    });

    it("calculates runway from negative cash flow", () => {
      const runway = calculateRunway({
        availableCash: d("100000"),
        monthlyCashFlow: d("-30000"),
      });
      expect(runway.kind).toBe("burning");
      if (runway.kind === "burning") {
        // 100000 / 30000 = 3.3333... -> 3.33
        expect(runway.months.equals(d("3.33"))).toBe(true);
      }
    });

    it("returns profitable when cash flow is positive or burn is 0", () => {
      const profitable1 = calculateRunway({
        availableCash: d("100000"),
        monthlyNetBurn: d("0"),
      });
      expect(profitable1.kind).toBe("profitable");

      const profitable2 = calculateRunway({
        availableCash: d("100000"),
        monthlyCashFlow: d("15000"),
      });
      expect(profitable2.kind).toBe("profitable");
    });

    it("rejects negative available cash and negative net burn", () => {
      expect(() =>
        calculateRunway({
          availableCash: d("-1000"),
          monthlyNetBurn: d("5000"),
        }),
      ).toThrow(FinanceValidationError);

      expect(() =>
        calculateRunway({
          availableCash: d("10000"),
          monthlyNetBurn: d("-5000"),
        }),
      ).toThrow(FinanceValidationError);
    });
  });

  describe("Documented Stubs", () => {
    it("calculateScenario throws documenting scheduled milestone", () => {
      expect(() => calculateScenario()).toThrow(
        "calculateScenario is scheduled for the Scenarios milestone.",
      );
    });

    it("calculatePriceChangeImpact throws documenting scheduled milestone", () => {
      expect(() => calculatePriceChangeImpact()).toThrow(
        "calculatePriceChangeImpact is scheduled for the Price Change Impact milestone.",
      );
    });
  });
});
