import { Decimal, roundMoney } from "@/lib/finance";

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats a monetary amount for display with EXACTLY two decimal places,
 * e.g. ₹82.00, ₹820.00, ₹33.60.
 *
 * Presentation only — never feed the returned string back into calculations.
 */
export function formatMoney(value: Decimal | string | number): string {
  const decimal = value instanceof Decimal ? value : new Decimal(String(value));
  if (decimal.isNaN() || !decimal.isFinite()) {
    throw new Error("Cannot format a non-finite monetary amount.");
  }
  return inrFormatter.format(roundMoney(decimal).toNumber());
}
