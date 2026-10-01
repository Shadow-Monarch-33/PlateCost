import type { BaseUnit } from "./financial/types";

const baseUnits = ["g", "kg", "ml", "L", "piece"] as const satisfies readonly BaseUnit[];

const conversionFactors = {
  g: { g: 1, kg: 0.001 },
  kg: { g: 1_000, kg: 1 },
  ml: { ml: 1, L: 0.001 },
  L: { ml: 1_000, L: 1 },
  piece: { piece: 1 },
} as const;

export function isBaseUnit(value: string): value is BaseUnit {
  return (baseUnits as readonly string[]).includes(value);
}

export function normalizeQuantity(
  quantity: number,
  from: BaseUnit,
  to: BaseUnit,
): number {
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error("Quantity must be a finite, non-negative number.");
  }

  const factor = conversionFactors[from][to as keyof (typeof conversionFactors)[typeof from]];
  if (factor === undefined) {
    throw new Error(`Units cannot be converted from ${from} to ${to}.`);
  }

  return quantity * factor;
}

export { baseUnits };
