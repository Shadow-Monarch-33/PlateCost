import { describe, expect, it } from "vitest";
import {
  calculateBreakEvenOrders,
  calculateCashFlow,
  calculateContribution,
  calculateContributionMargin,
  calculateFoodCostPercent,
  calculateMonthlyContribution,
  calculateMonthlyOperatingResult,
  calculateMonthlyRevenue,
  calculateMonthlyVariableCosts,
  calculatePlatformFee,
  calculateRunway,
  Decimal,
} from "@/lib/finance";
import { goldenBusinessFixture } from "../../fixtures/golden-business";

describe("Golden Business Fixture — Single-Item MVP Model", () => {
  const { business, menuItem, expected } = goldenBusinessFixture;

  it("calculates platform fee exactly", () => {
    const fee = calculatePlatformFee({
      sellingPrice: menuItem.sellingPrice,
      platformFeePercent: business.platformFeePercent,
    });
    expect(fee.equals(expected.platformFee)).toBe(true);
  });

  it("calculates contribution per order exactly", () => {
    const contribution = calculateContribution({
      sellingPrice: menuItem.sellingPrice,
      ingredientCost: menuItem.ingredientCost,
      packagingCost: menuItem.packagingCost,
      platformFeePercent: business.platformFeePercent,
      otherVariableCosts: menuItem.otherVariableCosts,
    });
    expect(contribution.equals(expected.contribution)).toBe(true);
  });

  it("calculates food cost percentage to 4 decimal places", () => {
    const foodCostPct = calculateFoodCostPercent({
      ingredientCost: menuItem.ingredientCost,
      sellingPrice: menuItem.sellingPrice,
    });
    expect(foodCostPct.equals(expected.foodCostPercent)).toBe(true);
  });

  it("calculates contribution margin to 4 decimal places", () => {
    const margin = calculateContributionMargin({
      contribution: expected.contribution,
      sellingPrice: menuItem.sellingPrice,
    });
    expect(margin.equals(expected.contributionMargin)).toBe(true);
  });

  it("calculates monthly revenue exactly", () => {
    const revenue = calculateMonthlyRevenue({
      sellingPrice: menuItem.sellingPrice,
      ordersPerDay: business.ordersPerDay,
      daysPerMonth: business.daysPerMonth,
    });
    expect(revenue.equals(expected.monthlyRevenue)).toBe(true);
  });

  it("calculates monthly variable costs exactly", () => {
    const variableCosts = calculateMonthlyVariableCosts({
      sellingPrice: menuItem.sellingPrice,
      ordersPerDay: business.ordersPerDay,
      daysPerMonth: business.daysPerMonth,
      ingredientCost: menuItem.ingredientCost,
      packagingCost: menuItem.packagingCost,
      platformFeePercent: business.platformFeePercent,
      otherVariableCosts: menuItem.otherVariableCosts,
    });
    expect(variableCosts.equals(expected.monthlyVariableCosts)).toBe(true);
  });

  it("calculates monthly contribution and preserves mathematical identity", () => {
    const monthlyContributionFromFullInput = calculateMonthlyContribution({
      sellingPrice: menuItem.sellingPrice,
      ordersPerDay: business.ordersPerDay,
      daysPerMonth: business.daysPerMonth,
      ingredientCost: menuItem.ingredientCost,
      packagingCost: menuItem.packagingCost,
      platformFeePercent: business.platformFeePercent,
      otherVariableCosts: menuItem.otherVariableCosts,
    });
    expect(monthlyContributionFromFullInput.equals(expected.monthlyContribution)).toBe(true);

    const monthlyContributionFromPerOrder = calculateMonthlyContribution({
      contributionPerOrder: expected.contribution,
      ordersPerDay: business.ordersPerDay,
      daysPerMonth: business.daysPerMonth,
    });
    expect(monthlyContributionFromPerOrder.equals(expected.monthlyContribution)).toBe(true);

    // monthlyContribution = monthlyRevenue - monthlyVariableCosts
    const identityContribution = expected.monthlyRevenue.minus(expected.monthlyVariableCosts);
    expect(identityContribution.equals(expected.monthlyContribution)).toBe(true);
  });

  it("calculates monthly operating result exactly", () => {
    const operatingResult = calculateMonthlyOperatingResult({
      monthlyContribution: expected.monthlyContribution,
      monthlyFixedCosts: business.fixedMonthlyCost,
    });
    expect(operatingResult.equals(expected.monthlyOperatingResult)).toBe(true);
  });

  it("calculates monthly and daily break-even orders to 2 decimal places without intermediate rounding", () => {
    const breakEven = calculateBreakEvenOrders({
      monthlyFixedCost: business.fixedMonthlyCost,
      contributionPerOrder: expected.contribution,
      daysPerMonth: business.daysPerMonth,
    });

    expect(breakEven.kind).toBe("reachable");
    if (breakEven.kind === "reachable") {
      expect(breakEven.monthlyOrders.equals(expected.breakEvenOrdersMonthly)).toBe(true);
      expect(breakEven.dailyOrders.equals(expected.breakEvenOrdersDaily)).toBe(true);
    }
  });

  it("calculates cash flow and runway for golden business assumptions", () => {
    // 1500 orders * 49.75 platform fee = 74625.00
    const totalPlatformFees = expected.platformFee.times(expected.monthlyOrders);
    // other variable costs = (82 + 10 + 15) * 1500 = 160500.00
    const otherVariableCosts = menuItem.ingredientCost
      .plus(menuItem.packagingCost)
      .plus(menuItem.otherVariableCosts)
      .times(expected.monthlyOrders);

    const cashFlow = calculateCashFlow({
      startingCash: business.startingCapital,
      grossRevenue: expected.monthlyRevenue,
      platformFees: totalPlatformFees,
      otherVariableCosts,
      fixedCosts: business.fixedMonthlyCost,
    });

    // netCashReceived = 298500 - 74625 = 223875.00
    expect(cashFlow.netCashReceived.equals(new Decimal("223875.00"))).toBe(true);
    // cashOutflow = 160500 + 55000 = 215500.00
    expect(cashFlow.cashOutflow.equals(new Decimal("215500.00"))).toBe(true);
    // netCashFlow = 223875 - 215500 = 8375.00 (matches operating result)
    expect(cashFlow.netCashFlow.equals(expected.monthlyOperatingResult)).toBe(true);
    // endingCash = 300000 + 8375 = 308375.00
    expect(cashFlow.endingCash.equals(new Decimal("308375.00"))).toBe(true);

    // Business is profitable, not burning cash
    const runway = calculateRunway({
      availableCash: cashFlow.endingCash,
      monthlyCashFlow: cashFlow.netCashFlow,
    });
    expect(runway.kind).toBe("profitable");
  });
});
