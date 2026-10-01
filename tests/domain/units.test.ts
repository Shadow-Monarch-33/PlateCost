import { describe, expect, it } from "vitest";

import { isBaseUnit, normalizeQuantity } from "@/domain/units";

describe("isBaseUnit", () => {
  it("accepts canonical units and rejects arbitrary labels", () => {
    expect(isBaseUnit("kg")).toBe(true);
    expect(isBaseUnit("kilogram")).toBe(false);
  });

  it("normalizes compatible mass units without converting unrelated units", () => {
    expect(normalizeQuantity(180, "g", "kg")).toBe(0.18);
    expect(() => normalizeQuantity(1, "kg", "L")).toThrow(
      "Units cannot be converted from kg to L.",
    );
  });
});
