import { describe, it, expect } from "vitest";
import { isProtectedRoute } from "../../../src/proxy";

describe("Proxy Route Protection", () => {
  it("protects core app routes", () => {
    expect(isProtectedRoute("/dashboard")).toBe(true);
    expect(isProtectedRoute("/ingredients")).toBe(true);
    expect(isProtectedRoute("/recipes")).toBe(true);
    expect(isProtectedRoute("/menu")).toBe(true);
    expect(isProtectedRoute("/invoices")).toBe(true);
  });

  it("protects account routes", () => {
    expect(isProtectedRoute("/profile")).toBe(true);
    expect(isProtectedRoute("/settings")).toBe(true);
  });

  it("protects sub-routes of protected paths", () => {
    expect(isProtectedRoute("/profile/edit")).toBe(true);
    expect(isProtectedRoute("/settings/notifications")).toBe(true);
  });

  it("allows public routes", () => {
    expect(isProtectedRoute("/")).toBe(false);
    expect(isProtectedRoute("/login")).toBe(false);
    expect(isProtectedRoute("/signup")).toBe(false);
    expect(isProtectedRoute("/about")).toBe(false);
  });
});
