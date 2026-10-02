import Decimal from "decimal.js";
import type { BaseUnit } from "./financial/types";

const baseUnits = ["g", "kg", "ml", "L", "piece"] as const satisfies readonly BaseUnit[];

const decimalConversionFactors: Record<BaseUnit, Partial<Record<BaseUnit, Decimal>>> = {
  g: { g: new Decimal(1), kg: new Decimal("0.001") },
  kg: { g: new Decimal(1000), kg: new Decimal(1) },
  ml: { ml: new Decimal(1), L: new Decimal("0.001") },
  L: { ml: new Decimal(1000), L: new Decimal(1) },
  piece: { piece: new Decimal(1) },
};

export function isBaseUnit(value: string): value is BaseUnit {
  return (baseUnits as readonly string[]).includes(value);
}

export function normalizeQuantity(quantity: Decimal, from: BaseUnit, to: BaseUnit): Decimal;
export function normalizeQuantity(quantity: number, from: BaseUnit, to: BaseUnit): number;
export function normalizeQuantity(
  quantity: Decimal | number,
  from: BaseUnit,
  to: BaseUnit,
): Decimal | number {
  if (!isBaseUnit(from)) {
    throw new Error(`Invalid base unit: ${from}.`);
  }
  if (!isBaseUnit(to)) {
    throw new Error(`Invalid base unit: ${to}.`);
  }

  if (quantity instanceof Decimal) {
    if (quantity.isNaN() || !quantity.isFinite() || quantity.isNegative()) {
      throw new Error("Quantity must be a finite, non-negative number.");
    }

    const factor = decimalConversionFactors[from]?.[to];
    if (factor === undefined) {
      throw new Error(`Units cannot be converted from ${from} to ${to}.`);
    }

    return quantity.times(factor);
  }

  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error("Quantity must be a finite, non-negative number.");
  }

  const factor = decimalConversionFactors[from]?.[to];
  if (factor === undefined) {
    throw new Error(`Units cannot be converted from ${from} to ${to}.`);
  }

  return quantity * factor.toNumber();
}

export { baseUnits };
