import type { BaseUnit } from "@/domain/financial/types";
import type { Decimal } from "./decimal";

export class FinanceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinanceValidationError";
  }
}

export type IngredientCostInput = {
  recipeQuantity: Decimal;
  recipeUnit: BaseUnit;
  ingredientPrice: Decimal;
  ingredientUnit: BaseUnit;
};

export type RecipeIngredientCostInput = {
  recipeQuantity: Decimal;
  recipeUnit: BaseUnit;
  ingredientPrice: Decimal;
  ingredientUnit: BaseUnit;
};

export type RecipeCostInput = {
  ingredients: RecipeIngredientCostInput[];
  servings?: Decimal;
  /**
   * Waste/yield adjustment factor.
   * NOTE: Architecture does not unambiguously define waste factor semantics yet.
   * Preserved as an optional contract parameter; deferred until standardized.
   */
  wasteFactor?: Decimal;
};

export type RecipeCostResult = {
  batchCost: Decimal;
  costPerServing: Decimal;
};

export type FoodCostPercentInput = {
  ingredientCost: Decimal;
  sellingPrice: Decimal;
};

export type PlatformFeeInput = {
  sellingPrice: Decimal;
  platformFeePercent: Decimal;
};

export type ContributionInput = {
  sellingPrice: Decimal;
  ingredientCost: Decimal;
  packagingCost: Decimal;
  platformFeePercent: Decimal;
  otherVariableCosts: Decimal;
};

export type ContributionMarginInput = {
  contribution: Decimal;
  sellingPrice: Decimal;
};

export type MonthlyRevenueInput = {
  sellingPrice: Decimal;
  ordersPerDay: Decimal;
  daysPerMonth: Decimal;
};

export type MonthlyVariableCostsInput = {
  sellingPrice: Decimal;
  ordersPerDay: Decimal;
  daysPerMonth: Decimal;
  ingredientCost: Decimal;
  packagingCost: Decimal;
  platformFeePercent: Decimal;
  otherVariableCosts: Decimal;
};

export type MonthlyContributionInput =
  | {
      sellingPrice: Decimal;
      ordersPerDay: Decimal;
      daysPerMonth: Decimal;
      ingredientCost: Decimal;
      packagingCost: Decimal;
      platformFeePercent: Decimal;
      otherVariableCosts: Decimal;
    }
  | {
      contributionPerOrder: Decimal;
      ordersPerDay: Decimal;
      daysPerMonth: Decimal;
    };

export type MonthlyOperatingResultInput = {
  monthlyContribution: Decimal;
  monthlyFixedCosts: Decimal;
};

export type BreakEvenInput = {
  monthlyFixedCost: Decimal;
  contributionPerOrder: Decimal;
  daysPerMonth?: Decimal;
};

export type BreakEvenResult =
  | {
      kind: "reachable";
      monthlyOrders: Decimal;
      dailyOrders: Decimal;
    }
  | {
      kind: "unreachable";
    };

export type CashFlowInput = {
  startingCash: Decimal;
  grossRevenue: Decimal;
  platformFees: Decimal;
  otherVariableCosts: Decimal;
  fixedCosts: Decimal;
  startupCosts?: Decimal;
};

export type CashFlowResult = {
  startingCash: Decimal;
  grossRevenue: Decimal;
  platformFees: Decimal;
  netCashReceived: Decimal;
  cashOutflow: Decimal;
  netCashFlow: Decimal;
  endingCash: Decimal;
};

export type RunwayInput =
  | {
      availableCash: Decimal;
      monthlyNetBurn: Decimal;
      monthlyCashFlow?: never;
    }
  | {
      availableCash: Decimal;
      monthlyCashFlow: Decimal;
      monthlyNetBurn?: never;
    };

export type RunwayResult =
  | {
      kind: "burning";
      months: Decimal;
    }
  | {
      kind: "profitable";
    };
