import type { BaseUnit } from "./financial/types";

const baseUnits = ["g", "kg", "ml", "l", "each"] as const satisfies readonly BaseUnit[];

export function isBaseUnit(value: string): value is BaseUnit {
  return (baseUnits as readonly string[]).includes(value);
}

export { baseUnits };
