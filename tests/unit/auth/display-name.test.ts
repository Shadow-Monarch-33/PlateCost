import { describe, it, expect } from "vitest";
import { getSafeDisplayName } from "../../../src/application/auth/display-name";

describe("getSafeDisplayName", () => {
  it("uses display name when available", () => {
    expect(getSafeDisplayName("Ayaan Ahmed", "ayaan@example.com")).toBe("Ayaan Ahmed");
  });

  it("trims whitespace from display name", () => {
    expect(getSafeDisplayName("  Jane Doe  ", "jane@example.com")).toBe("Jane Doe");
  });

  it("falls back to email prefix if display name is missing", () => {
    expect(getSafeDisplayName(undefined, "ayaan@example.com")).toBe("ayaan");
    expect(getSafeDisplayName(null, "jane@example.com")).toBe("jane");
    expect(getSafeDisplayName("", "john@example.com")).toBe("john");
    expect(getSafeDisplayName("   ", "john@example.com")).toBe("john");
  });

  it("falls back to 'User' if both are missing or invalid", () => {
    expect(getSafeDisplayName(undefined, undefined)).toBe("User");
    expect(getSafeDisplayName(null, null)).toBe("User");
    expect(getSafeDisplayName("", "")).toBe("User");
    expect(getSafeDisplayName(undefined, "invalid-email")).toBe("User");
  });
});
