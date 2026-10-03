import { Decimal } from "../../lib/finance/decimal";
import {
  calculateFoodCostPercent,
  calculateContribution,
  calculateContributionMargin,
} from "../../lib/finance/engine";

export interface CalculateMenuEconomicsInput {
  sellingPrice: string | number;
  costPerServing: string | number | null;
  platformFeePercent?: string | number | null;
  packagingCost?: string | number | null;
  otherVariableCosts?: string | number | null;
}

export interface MenuEconomicsResult {
  foodCostPercent: string | null;
  contribution: string | null;
  contributionMargin: string | null;
}

export function calculateMenuEconomics(input: CalculateMenuEconomicsInput): MenuEconomicsResult {
  if (input.costPerServing == null) {
    return {
      foodCostPercent: null,
      contribution: null,
      contributionMargin: null,
    };
  }

  const sellingPrice = new Decimal(input.sellingPrice);
  const ingredientCost = new Decimal(input.costPerServing);
  
  if (sellingPrice.isNaN() || !sellingPrice.isFinite() || sellingPrice.lessThanOrEqualTo(0)) {
    return {
      foodCostPercent: null,
      contribution: null,
      contributionMargin: null,
    };
  }
  
  // Platform fee percent from DB is typically 0-100 (e.g. 25 for 25%).
  // The finance engine expects a ratio (0-1), so we divide by 100.
  let platformFeePercent = new Decimal(0);
  if (input.platformFeePercent != null) {
    const rawPct = new Decimal(input.platformFeePercent);
    platformFeePercent = rawPct.div(100);
  }

  const packagingCost = input.packagingCost != null ? new Decimal(input.packagingCost) : new Decimal(0);
  const otherVariableCosts = input.otherVariableCosts != null ? new Decimal(input.otherVariableCosts) : new Decimal(0);

  const foodCostPercent = calculateFoodCostPercent({
    ingredientCost,
    sellingPrice,
  });

  const contribution = calculateContribution({
    sellingPrice,
    ingredientCost,
    packagingCost,
    otherVariableCosts,
    platformFeePercent,
  });

  const contributionMargin = calculateContributionMargin({
    contribution,
    sellingPrice,
  });

  return {
    foodCostPercent: foodCostPercent.toFixed(2),
    contribution: contribution.toFixed(2),
    contributionMargin: contributionMargin.toFixed(2),
  };
}
