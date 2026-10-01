export const goldenBusinessFixture = {
  startingCapital: 300_000,
  ordersPerDay: 50,
  sellingPrice: 199,
  ingredientCost: 82,
  packagingCost: 10,
  otherVariableCosts: 15,
  platformFeePercent: 25,
  fixedMonthlyCost: 55_000,
} as const;

/**
 * Reference values for future financial-engine tests:
 * - Platform fee: ₹49.75
 * - Contribution: ₹42.25
 * - Contribution margin: approximately 21.23%
 * - Food cost: approximately 41.21%
 * - Monthly break-even: ₹55,000 / ₹42.25 ≈ 1,301.78 orders/month
 * - Daily break-even: approximately 43.39 orders/day
 *
 * This fixture is input only. These values are not production constants.
 */
