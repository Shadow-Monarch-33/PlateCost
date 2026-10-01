import { describe, expect, it } from "vitest";

import { isBaseUnit } from "@/domain/units";

describe("isBaseUnit", () => {
  it("accepts canonical units and rejects arbitrary labels", () => {
    expect(isBaseUnit("kg")).toBe(true);
    expect(isBaseUnit("kilogram")).toBe(false);
  });
});
