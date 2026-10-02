import { Decimal, roundMoney, roundOrders, roundPercent } from "./decimal";
import {
  FinanceValidationError,
  type BreakEvenInput,
  type BreakEvenResult,
  type CashFlowInput,
  type CashFlowResult,
  type ContributionInput,
  type ContributionMarginInput,
  type FoodCostPercentInput,
  type IngredientCostInput,
  type MonthlyContributionInput,
  type MonthlyOperatingResultInput,
  type MonthlyRevenueInput,
  type MonthlyVariableCostsInput,
  type PlatformFeeInput,
  type RecipeCostInput,
  type RecipeCostResult,
  type RunwayInput,
  type RunwayResult,
} from "./types";
import { normalizeQuantity } from "./units";

Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
});

/**
 * Calculates raw cost for a specific ingredient amount.
 * Formula: normalizedQuantity × ingredientUnitPrice = rawIngredientCost
 *
 * Returned monetary value is rounded to 2 decimal places using ROUND_HALF_UP.
 */
export function calculateIngredientCost(input: IngredientCostInput): Decimal {
  if (input.recipeQuantity.isNaN() || !input.recipeQuantity.isFinite() || input.recipeQuantity.lessThanOrEqualTo(0)) {
    throw new FinanceValidationError("Recipe quantity must be a positive number.");
  }
  if (input.ingredientPrice.isNaN() || !input.ingredientPrice.isFinite() || input.ingredientPrice.isNegative()) {
    throw new FinanceValidationError("Ingredient price must be a non-negative number.");
  }

  const normalizedQuantity = normalizeQuantity(
    input.recipeQuantity,
    input.recipeUnit,
    input.ingredientUnit,
  );
  const rawCost = normalizedQuantity.times(input.ingredientPrice);
  return roundMoney(rawCost);
}

/**
 * Calculates the total batch cost and per-serving cost of a recipe.
 * Follows the canonical pipeline:
 *   sum(rawIngredientCosts) → batch cost → cost per serving
 *
 * NOTE ON YIELD / WASTE:
 * The canonical architecture defines recipe yield quantity and unit, but does not
 * define a standard waste factor formula. In accordance with the project specification,
 * only the unambiguous calculation is implemented; any waste factor parameter is
 * preserved in the contract as a documented deferred stub to prevent inventing
 * arbitrary financial semantics.
 */
export function calculateRecipeCost(input: RecipeCostInput): RecipeCostResult {
  const servings = input.servings ?? new Decimal(1);
  if (servings.isNaN() || !servings.isFinite() || servings.lessThanOrEqualTo(0)) {
    throw new FinanceValidationError("Recipe servings must be a positive number.");
  }

  let rawBatchCost = new Decimal(0);

  for (const ingredient of input.ingredients) {
    if (
      ingredient.recipeQuantity.isNaN() ||
      !ingredient.recipeQuantity.isFinite() ||
      ingredient.recipeQuantity.lessThanOrEqualTo(0)
    ) {
      throw new FinanceValidationError("Recipe ingredient quantity must be a positive number.");
    }
    if (
      ingredient.ingredientPrice.isNaN() ||
      !ingredient.ingredientPrice.isFinite() ||
      ingredient.ingredientPrice.isNegative()
    ) {
      throw new FinanceValidationError("Ingredient price must be a non-negative number.");
    }

    const normalizedQuantity = normalizeQuantity(
      ingredient.recipeQuantity,
      ingredient.recipeUnit,
      ingredient.ingredientUnit,
    );
    rawBatchCost = rawBatchCost.plus(normalizedQuantity.times(ingredient.ingredientPrice));
  }

  const batchCost = roundMoney(rawBatchCost);
  const rawCostPerServing = rawBatchCost.div(servings);
  const costPerServing = roundMoney(rawCostPerServing);

  return {
    batchCost,
    costPerServing,
  };
}

/**
 * Calculates the food cost percentage on a 0–100 scale, rounded to 4 decimals.
 * Formula: (ingredientCost / sellingPrice) × 100
 */
export function calculateFoodCostPercent(input: FoodCostPercentInput): Decimal {
  if (input.sellingPrice.isNaN() || !input.sellingPrice.isFinite() || input.sellingPrice.lessThanOrEqualTo(0)) {
    throw new FinanceValidationError("Selling price must be a positive number.");
  }
  if (input.ingredientCost.isNaN() || !input.ingredientCost.isFinite() || input.ingredientCost.isNegative()) {
    throw new FinanceValidationError("Ingredient cost must be a non-negative number.");
  }

  const percent = input.ingredientCost.div(input.sellingPrice).times(100);
  return roundPercent(percent);
}

/**
 * Calculates the platform commission fee for a single order.
 * Input platformFeePercent is a 0–1 ratio (e.g. 0.25 for 25%).
 * Formula: sellingPrice × platformFeePercent
 *
 * Returned monetary value is rounded to 2 decimal places using ROUND_HALF_UP.
 */
export function calculatePlatformFee(input: PlatformFeeInput): Decimal {
  if (input.sellingPrice.isNaN() || !input.sellingPrice.isFinite() || input.sellingPrice.lessThanOrEqualTo(0)) {
    throw new FinanceValidationError("Selling price must be a positive number.");
  }
  if (
    input.platformFeePercent.isNaN() ||
    !input.platformFeePercent.isFinite() ||
    input.platformFeePercent.isNegative() ||
    input.platformFeePercent.greaterThan(1)
  ) {
    throw new FinanceValidationError("Platform fee percentage must be a ratio between 0 and 1.");
  }

  const fee = input.sellingPrice.times(input.platformFeePercent);
  return roundMoney(fee);
}

/**
 * Calculates per-order contribution.
 * Formula:
 *   sellingPrice − ingredientCost − packagingCost − platformFee − otherVariableCosts
 *
 * Platform fee is calculated internally from platformFeePercent (0–1 ratio).
 * Contribution may legitimately be negative and is NOT clamped.
 * Returned monetary value is rounded to 2 decimal places using ROUND_HALF_UP.
 */
export function calculateContribution(input: ContributionInput): Decimal {
  if (input.sellingPrice.isNaN() || !input.sellingPrice.isFinite() || input.sellingPrice.lessThanOrEqualTo(0)) {
    throw new FinanceValidationError("Selling price must be a positive number.");
  }
  if (input.ingredientCost.isNaN() || !input.ingredientCost.isFinite() || input.ingredientCost.isNegative()) {
    throw new FinanceValidationError("Ingredient cost must be a non-negative number.");
  }
  if (input.packagingCost.isNaN() || !input.packagingCost.isFinite() || input.packagingCost.isNegative()) {
    throw new FinanceValidationError("Packaging cost must be a non-negative number.");
  }
  if (
    input.otherVariableCosts.isNaN() ||
    !input.otherVariableCosts.isFinite() ||
    input.otherVariableCosts.isNegative()
  ) {
    throw new FinanceValidationError("Other variable costs must be a non-negative number.");
  }
  if (
    input.platformFeePercent.isNaN() ||
    !input.platformFeePercent.isFinite() ||
    input.platformFeePercent.isNegative() ||
    input.platformFeePercent.greaterThan(1)
  ) {
    throw new FinanceValidationError("Platform fee percentage must be a ratio between 0 and 1.");
  }

  const platformFee = input.sellingPrice.times(input.platformFeePercent);
  const rawContribution = input.sellingPrice
    .minus(input.ingredientCost)
    .minus(input.packagingCost)
    .minus(platformFee)
    .minus(input.otherVariableCosts);

  return roundMoney(rawContribution);
}

/**
 * Calculates contribution margin on a 0–100 scale, rounded to 4 decimals.
 * Formula: (contribution / sellingPrice) × 100
 *
 * Contribution margin may legitimately be negative.
 */
export function calculateContributionMargin(input: ContributionMarginInput): Decimal {
  if (input.sellingPrice.isNaN() || !input.sellingPrice.isFinite() || input.sellingPrice.lessThanOrEqualTo(0)) {
    throw new FinanceValidationError("Selling price must be a positive number.");
  }
  if (input.contribution.isNaN() || !input.contribution.isFinite()) {
    throw new FinanceValidationError("Contribution must be a finite number.");
  }

  const margin = input.contribution.div(input.sellingPrice).times(100);
  return roundPercent(margin);
}

/**
 * Calculates monthly revenue.
 * Formula: sellingPrice × (ordersPerDay × daysPerMonth)
 *
 * Returned monetary value is rounded to 2 decimal places using ROUND_HALF_UP.
 */
export function calculateMonthlyRevenue(input: MonthlyRevenueInput): Decimal {
  if (input.sellingPrice.isNaN() || !input.sellingPrice.isFinite() || input.sellingPrice.lessThanOrEqualTo(0)) {
    throw new FinanceValidationError("Selling price must be a positive number.");
  }
  if (input.ordersPerDay.isNaN() || !input.ordersPerDay.isFinite() || input.ordersPerDay.isNegative()) {
    throw new FinanceValidationError("Orders per day must be a non-negative number.");
  }
  if (input.daysPerMonth.isNaN() || !input.daysPerMonth.isFinite() || input.daysPerMonth.lessThanOrEqualTo(0)) {
    throw new FinanceValidationError("Days per month must be a positive number.");
  }

  const monthlyOrders = input.ordersPerDay.times(input.daysPerMonth);
  const revenue = input.sellingPrice.times(monthlyOrders);
  return roundMoney(revenue);
}

/**
 * Calculates total monthly variable costs.
 * Formula: (ingredientCost + packagingCost + platformFee + otherVariableCosts) × monthlyOrders
 *
 * Returned monetary value is rounded to 2 decimal places using ROUND_HALF_UP.
 */
export function calculateMonthlyVariableCosts(input: MonthlyVariableCostsInput): Decimal {
  if (input.sellingPrice.isNaN() || !input.sellingPrice.isFinite() || input.sellingPrice.lessThanOrEqualTo(0)) {
    throw new FinanceValidationError("Selling price must be a positive number.");
  }
  if (input.ordersPerDay.isNaN() || !input.ordersPerDay.isFinite() || input.ordersPerDay.isNegative()) {
    throw new FinanceValidationError("Orders per day must be a non-negative number.");
  }
  if (input.daysPerMonth.isNaN() || !input.daysPerMonth.isFinite() || input.daysPerMonth.lessThanOrEqualTo(0)) {
    throw new FinanceValidationError("Days per month must be a positive number.");
  }
  if (input.ingredientCost.isNaN() || !input.ingredientCost.isFinite() || input.ingredientCost.isNegative()) {
    throw new FinanceValidationError("Ingredient cost must be a non-negative number.");
  }
  if (input.packagingCost.isNaN() || !input.packagingCost.isFinite() || input.packagingCost.isNegative()) {
    throw new FinanceValidationError("Packaging cost must be a non-negative number.");
  }
  if (
    input.otherVariableCosts.isNaN() ||
    !input.otherVariableCosts.isFinite() ||
    input.otherVariableCosts.isNegative()
  ) {
    throw new FinanceValidationError("Other variable costs must be a non-negative number.");
  }
  if (
    input.platformFeePercent.isNaN() ||
    !input.platformFeePercent.isFinite() ||
    input.platformFeePercent.isNegative() ||
    input.platformFeePercent.greaterThan(1)
  ) {
    throw new FinanceValidationError("Platform fee percentage must be a ratio between 0 and 1.");
  }

  const platformFee = input.sellingPrice.times(input.platformFeePercent);
  const perOrderVariable = input.ingredientCost
    .plus(input.packagingCost)
    .plus(platformFee)
    .plus(input.otherVariableCosts);

  const monthlyOrders = input.ordersPerDay.times(input.daysPerMonth);
  const monthlyVariableCosts = perOrderVariable.times(monthlyOrders);
  return roundMoney(monthlyVariableCosts);
}

/**
 * Calculates monthly contribution.
 * Mathematical identity:
 *   monthlyContribution = contributionPerOrder × monthlyOrders
 *
 * Returned monetary value is rounded to 2 decimal places using ROUND_HALF_UP.
 */
export function calculateMonthlyContribution(input: MonthlyContributionInput): Decimal {
  if (input.ordersPerDay.isNaN() || !input.ordersPerDay.isFinite() || input.ordersPerDay.isNegative()) {
    throw new FinanceValidationError("Orders per day must be a non-negative number.");
  }
  if (input.daysPerMonth.isNaN() || !input.daysPerMonth.isFinite() || input.daysPerMonth.lessThanOrEqualTo(0)) {
    throw new FinanceValidationError("Days per month must be a positive number.");
  }

  const monthlyOrders = input.ordersPerDay.times(input.daysPerMonth);

  if ("contributionPerOrder" in input) {
    if (input.contributionPerOrder.isNaN() || !input.contributionPerOrder.isFinite()) {
      throw new FinanceValidationError("Contribution per order must be a finite number.");
    }
    return roundMoney(input.contributionPerOrder.times(monthlyOrders));
  }

  if (input.sellingPrice.isNaN() || !input.sellingPrice.isFinite() || input.sellingPrice.lessThanOrEqualTo(0)) {
    throw new FinanceValidationError("Selling price must be a positive number.");
  }
  if (input.ingredientCost.isNaN() || !input.ingredientCost.isFinite() || input.ingredientCost.isNegative()) {
    throw new FinanceValidationError("Ingredient cost must be a non-negative number.");
  }
  if (input.packagingCost.isNaN() || !input.packagingCost.isFinite() || input.packagingCost.isNegative()) {
    throw new FinanceValidationError("Packaging cost must be a non-negative number.");
  }
  if (
    input.otherVariableCosts.isNaN() ||
    !input.otherVariableCosts.isFinite() ||
    input.otherVariableCosts.isNegative()
  ) {
    throw new FinanceValidationError("Other variable costs must be a non-negative number.");
  }
  if (
    input.platformFeePercent.isNaN() ||
    !input.platformFeePercent.isFinite() ||
    input.platformFeePercent.isNegative() ||
    input.platformFeePercent.greaterThan(1)
  ) {
    throw new FinanceValidationError("Platform fee percentage must be a ratio between 0 and 1.");
  }

  const platformFee = input.sellingPrice.times(input.platformFeePercent);
  const contributionPerOrder = input.sellingPrice
    .minus(input.ingredientCost)
    .minus(input.packagingCost)
    .minus(platformFee)
    .minus(input.otherVariableCosts);

  return roundMoney(contributionPerOrder.times(monthlyOrders));
}

/**
 * Calculates monthly operating result.
 * Formula: monthlyContribution − monthlyFixedCosts
 *
 * Returned monetary value is rounded to 2 decimal places using ROUND_HALF_UP.
 */
export function calculateMonthlyOperatingResult(input: MonthlyOperatingResultInput): Decimal {
  if (input.monthlyContribution.isNaN() || !input.monthlyContribution.isFinite()) {
    throw new FinanceValidationError("Monthly contribution must be a finite number.");
  }
  if (
    input.monthlyFixedCosts.isNaN() ||
    !input.monthlyFixedCosts.isFinite() ||
    input.monthlyFixedCosts.isNegative()
  ) {
    throw new FinanceValidationError("Monthly fixed costs must be a non-negative number.");
  }

  return roundMoney(input.monthlyContribution.minus(input.monthlyFixedCosts));
}

/**
 * Calculates monthly and daily break-even orders.
 * Formula:
 *   breakEvenOrders = monthlyFixedCost / contributionPerOrder
 *   breakEvenOrdersPerDay = breakEvenOrders / daysPerMonth
 *
 * Rules:
 * - If monthlyFixedCost is zero: break-even is 0 orders.
 * - If monthlyFixedCost > 0 and contributionPerOrder <= 0: unreachable.
 * - Negative monthlyFixedCost is rejected.
 * - Intermediate arithmetic is unrounded. Order counts rounded to 2 decimal places.
 */
export function calculateBreakEvenOrders(input: BreakEvenInput): BreakEvenResult {
  if (input.monthlyFixedCost.isNaN() || !input.monthlyFixedCost.isFinite() || input.monthlyFixedCost.isNegative()) {
    throw new FinanceValidationError("Monthly fixed cost must be a non-negative number.");
  }
  if (input.contributionPerOrder.isNaN() || !input.contributionPerOrder.isFinite()) {
    throw new FinanceValidationError("Contribution per order must be a finite number.");
  }

  const daysPerMonth = input.daysPerMonth ?? new Decimal(30);
  if (daysPerMonth.isNaN() || !daysPerMonth.isFinite() || daysPerMonth.lessThanOrEqualTo(0)) {
    throw new FinanceValidationError("Days per month must be a positive number.");
  }

  if (input.monthlyFixedCost.isZero()) {
    return {
      kind: "reachable",
      monthlyOrders: new Decimal("0.00"),
      dailyOrders: new Decimal("0.00"),
    };
  }

  if (input.contributionPerOrder.lessThanOrEqualTo(0)) {
    return { kind: "unreachable" };
  }

  const rawMonthlyOrders = input.monthlyFixedCost.div(input.contributionPerOrder);
  const rawDailyOrders = rawMonthlyOrders.div(daysPerMonth);

  return {
    kind: "reachable",
    monthlyOrders: roundOrders(rawMonthlyOrders),
    dailyOrders: roundOrders(rawDailyOrders),
  };
}

/**
 * Calculates cash flow using the architecture's simplified cash model:
 *   endingCash = startingCash + cashIn − cashOut
 *
 * Preferred convention:
 * - grossRevenue = sellingPrice × orders
 * - netCashReceived = grossRevenue − platformFees
 * - cashOutflow = otherVariableCosts + fixedCosts + startupCosts
 * - netCashFlow = netCashReceived − cashOutflow
 * - platform fees are never deducted twice.
 *
 * Startup costs occur only in the specified launch month and do not recur.
 * Negative ending cash is permitted (indicates cash deficit).
 */
export function calculateCashFlow(input: CashFlowInput): CashFlowResult {
  if (input.startingCash.isNaN() || !input.startingCash.isFinite() || input.startingCash.isNegative()) {
    throw new FinanceValidationError("Starting capital must be a non-negative number.");
  }
  if (input.grossRevenue.isNaN() || !input.grossRevenue.isFinite() || input.grossRevenue.isNegative()) {
    throw new FinanceValidationError("Gross revenue must be a non-negative number.");
  }
  if (input.platformFees.isNaN() || !input.platformFees.isFinite() || input.platformFees.isNegative()) {
    throw new FinanceValidationError("Platform fees must be a non-negative number.");
  }
  if (
    input.otherVariableCosts.isNaN() ||
    !input.otherVariableCosts.isFinite() ||
    input.otherVariableCosts.isNegative()
  ) {
    throw new FinanceValidationError("Other variable costs must be a non-negative number.");
  }
  if (input.fixedCosts.isNaN() || !input.fixedCosts.isFinite() || input.fixedCosts.isNegative()) {
    throw new FinanceValidationError("Fixed costs must be a non-negative number.");
  }

  const startupCosts = input.startupCosts ?? new Decimal(0);
  if (startupCosts.isNaN() || !startupCosts.isFinite() || startupCosts.isNegative()) {
    throw new FinanceValidationError("Startup costs must be a non-negative number.");
  }

  const netCashReceived = input.grossRevenue.minus(input.platformFees);
  const cashOutflow = input.otherVariableCosts.plus(input.fixedCosts).plus(startupCosts);
  const netCashFlow = netCashReceived.minus(cashOutflow);
  const endingCash = input.startingCash.plus(netCashFlow);

  return {
    startingCash: roundMoney(input.startingCash),
    grossRevenue: roundMoney(input.grossRevenue),
    platformFees: roundMoney(input.platformFees),
    netCashReceived: roundMoney(netCashReceived),
    cashOutflow: roundMoney(cashOutflow),
    netCashFlow: roundMoney(netCashFlow),
    endingCash: roundMoney(endingCash),
  };
}

/**
 * Calculates runway in months.
 * Formula:
 *   runwayMonths = availableCash / netBurn (where netBurn > 0)
 *
 * Returns a typed RunwayResult:
 * - { kind: "burning", months: Decimal } when net burn is positive
 * - { kind: "profitable" } when cash flow is non-negative (not burning)
 *
 * Never returns Infinity or NaN.
 */
export function calculateRunway(input: RunwayInput): RunwayResult {
  if (input.availableCash.isNaN() || !input.availableCash.isFinite() || input.availableCash.isNegative()) {
    throw new FinanceValidationError("Available cash must be a non-negative number.");
  }

  let burn: Decimal;

  if (input.monthlyNetBurn !== undefined) {
    if (input.monthlyNetBurn.isNaN() || !input.monthlyNetBurn.isFinite() || input.monthlyNetBurn.isNegative()) {
      throw new FinanceValidationError("Monthly net burn must be a non-negative number.");
    }
    burn = input.monthlyNetBurn;
  } else {
    if (input.monthlyCashFlow === undefined || input.monthlyCashFlow.isNaN() || !input.monthlyCashFlow.isFinite()) {
      throw new FinanceValidationError("Monthly cash flow must be a finite number.");
    }
    if (input.monthlyCashFlow.greaterThanOrEqualTo(0)) {
      return { kind: "profitable" };
    }
    burn = input.monthlyCashFlow.abs();
  }

  if (burn.isZero()) {
    return { kind: "profitable" };
  }

  const rawMonths = input.availableCash.div(burn);
  return {
    kind: "burning",
    months: roundOrders(rawMonths),
  };
}

/**
 * Scenario calculation stub.
 * Scheduled for the Scenarios milestone.
 */
export function calculateScenario(): never {
  throw new Error("calculateScenario is scheduled for the Scenarios milestone.");
}

/**
 * Price change impact calculation stub.
 * Scheduled for the Price Change Impact milestone.
 */
export function calculatePriceChangeImpact(): never {
  throw new Error("calculatePriceChangeImpact is scheduled for the Price Change Impact milestone.");
}
