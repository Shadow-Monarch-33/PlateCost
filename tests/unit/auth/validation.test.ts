import { describe, it, expect } from "vitest";
import { validateDisplayName, validateSignupPayload } from "../../../src/application/auth/validation";

describe("validateDisplayName", () => {
  it("rejects empty names", () => {
    expect(validateDisplayName("")).toBe("Display name is required.");
    expect(validateDisplayName("   ")).toBe("Display name is required.");
  });

  it("rejects names over 50 chars", () => {
    const longName = "a".repeat(51);
    expect(validateDisplayName(longName)).toBe("Display name cannot exceed 50 characters.");
  });

  it("accepts valid names", () => {
    expect(validateDisplayName("Ayaan Ahmed")).toBeNull();
    expect(validateDisplayName(" Jane Doe ")).toBeNull(); // Trimmed automatically
  });
});

describe("validateSignupPayload", () => {
  it("rejects missing email", () => {
    expect(validateSignupPayload("Jane", "   ", "password123", "password123")).toBe("Email is required.");
  });

  it("rejects missing password", () => {
    expect(validateSignupPayload("Jane", "jane@example.com", "", "")).toBe("Password is required.");
  });

  it("rejects missing confirm password", () => {
    expect(validateSignupPayload("Jane", "jane@example.com", "password123", "")).toBe("Confirm password is required.");
  });

  it("rejects password mismatch", () => {
    expect(validateSignupPayload("Jane", "jane@example.com", "password123", "password124")).toBe("Passwords do not match.");
  });

  it("rejects short password", () => {
    expect(validateSignupPayload("Jane", "jane@example.com", "12345", "12345")).toBe("Password must be at least 6 characters.");
  });

  it("accepts valid payload", () => {
    expect(validateSignupPayload("Jane", "jane@example.com", "password123", "password123")).toBeNull();
  });
});
