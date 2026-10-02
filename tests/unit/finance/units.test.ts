import { describe, expect, it } from "vitest";
import { baseUnits, isBaseUnit, normalizeQuantity } from "@/lib/finance";
import Decimal from "decimal.js";

describe("Unit System & Normalization", () => {
  it("recognizes only the 5 canonical base units", () => {
    expect(baseUnits).toEqual(["g", "kg", "ml", "L", "piece"]);
    expect(isBaseUnit("g")).toBe(true);
    expect(isBaseUnit("kg")).toBe(true);
    expect(isBaseUnit("ml")).toBe(true);
    expect(isBaseUnit("L")).toBe(true);
    expect(isBaseUnit("piece")).toBe(true);

    // Rejects non-canonical units
    expect(isBaseUnit("l")).toBe(false);
    expect(isBaseUnit("each")).toBe(false);
    expect(isBaseUnit("gram")).toBe(false);
    expect(isBaseUnit("liter")).toBe(false);
  });

  describe("Decimal normalization", () => {
    it("converts kg → g", () => {
      const result = normalizeQuantity(new Decimal("1.5"), "kg", "g");
      expect(result.equals(new Decimal("1500"))).toBe(true);
    });

    it("converts g → kg", () => {
      const result = normalizeQuantity(new Decimal("500"), "g", "kg");
      expect(result.equals(new Decimal("0.5"))).toBe(true);
    });

    it("converts L → ml", () => {
      const result = normalizeQuantity(new Decimal("2"), "L", "ml");
      expect(result.equals(new Decimal("2000"))).toBe(true);
    });

    it("converts ml → L", () => {
      const result = normalizeQuantity(new Decimal("750"), "ml", "L");
      expect(result.equals(new Decimal("0.75"))).toBe(true);
    });

    it("converts piece → piece", () => {
      const result = normalizeQuantity(new Decimal("12"), "piece", "piece");
      expect(result.equals(new Decimal("12"))).toBe(true);
    });

    it("rejects incompatible cross-dimension conversions", () => {
      expect(() => normalizeQuantity(new Decimal("1"), "kg", "L")).toThrow(
        "Units cannot be converted from kg to L.",
      );
      expect(() => normalizeQuantity(new Decimal("1"), "ml", "g")).toThrow(
        "Units cannot be converted from ml to g.",
      );
      expect(() => normalizeQuantity(new Decimal("1"), "piece", "kg")).toThrow(
        "Units cannot be converted from piece to kg.",
      );
    });

    it("rejects invalid units", () => {
      // @ts-expect-error testing runtime validation of non-canonical units
      expect(() => normalizeQuantity(new Decimal("1"), "each", "piece")).toThrow(
        "Invalid base unit: each.",
      );
      // @ts-expect-error testing runtime validation of non-canonical units
      expect(() => normalizeQuantity(new Decimal("1"), "l", "ml")).toThrow(
        "Invalid base unit: l.",
      );
    });

    it("rejects negative quantities", () => {
      expect(() => normalizeQuantity(new Decimal("-1"), "kg", "g")).toThrow(
        "Quantity must be a finite, non-negative number.",
      );
    });
  });

  describe("number backward compatibility", () => {
    it("converts number values correctly", () => {
      expect(normalizeQuantity(180, "g", "kg")).toBe(0.18);
      expect(normalizeQuantity(2.5, "kg", "g")).toBe(2500);
      expect(normalizeQuantity(500, "ml", "L")).toBe(0.5);
      expect(normalizeQuantity(1, "L", "ml")).toBe(1000);
    });

    it("rejects negative numbers", () => {
      expect(() => normalizeQuantity(-10, "g", "kg")).toThrow(
        "Quantity must be a finite, non-negative number.",
      );
    });
  });
});
