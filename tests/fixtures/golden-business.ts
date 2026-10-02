import { Decimal } from "@/lib/finance";

const d = (value: string) => new Decimal(value);

export interface GoldenBusinessFixture {
  business: {
    name: string;
    startingCapital: Decimal;
    fixedMonthlyCost: Decimal;
    ordersPerDay: Decimal;
    daysPerMonth: Decimal;
    platformFeePercent: Decimal;
  };
  menuItem: {
    name: string;
    sellingPrice: Decimal;
    ingredientCost: Decimal;
    packagingCost: Decimal;
    otherVariableCosts: Decimal;
  };
  expected: {
    ingredientCost: Decimal;
    platformFee: Decimal;
    foodCostPercent: Decimal;
    contribution: Decimal;
    contributionMargin: Decimal;
    monthlyOrders: Decimal;
    monthlyRevenue: Decimal;
    perOrderVariableCost: Decimal;
    monthlyVariableCosts: Decimal;
    monthlyContribution: Decimal;
    monthlyOperatingResult: Decimal;
    breakEvenOrdersMonthly: Decimal;
    breakEvenOrdersDaily: Decimal;
  };
}

export const goldenBusinessFixture: GoldenBusinessFixture = {
  business: {
    name: "Chennai Cloud Kitchen",
    startingCapital: d("300000"),
    fixedMonthlyCost: d("55000"),
    ordersPerDay: d("50"),
    daysPerMonth: d("30"),
    platformFeePercent: d("0.25"),
  },
  menuItem: {
    name: "Chicken Biryani",
    sellingPrice: d("199"),
    ingredientCost: d("82"),
    packagingCost: d("10"),
    otherVariableCosts: d("15"),
  },
  expected: {
    ingredientCost: d("82.00"),
    platformFee: d("49.75"),
    foodCostPercent: d("41.2060"),
    contribution: d("42.25"),
    contributionMargin: d("21.2312"),
    monthlyOrders: d("1500"),
    monthlyRevenue: d("298500.00"),
    perOrderVariableCost: d("156.75"),
    monthlyVariableCosts: d("235125.00"),
    monthlyContribution: d("63375.00"),
    monthlyOperatingResult: d("8375.00"),
    breakEvenOrdersMonthly: d("1301.78"),
    breakEvenOrdersDaily: d("43.39"),
  },
};
