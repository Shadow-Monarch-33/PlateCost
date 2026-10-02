import { describe, it, expect } from "vitest";
import { analyzeResendError } from "../../../src/application/auth/resend";

describe("analyzeResendError", () => {
  it("detects already confirmed", () => {
    const error1 = { message: "Email is already confirmed" };
    const error2 = { message: "User ALREADY VERIFIED" };
    
    expect(analyzeResendError(error1)).toEqual({
      type: "already_confirmed",
      message: "This email is already verified. You can sign in.",
    });
    
    expect(analyzeResendError(error2)).toEqual({
      type: "already_confirmed",
      message: "This email is already verified. You can sign in.",
    });
  });

  it("detects rate limit by status 429", () => {
    const error = { status: 429, message: "Server overloaded" };
    expect(analyzeResendError(error)).toEqual({
      type: "rate_limit",
      retryAfterSeconds: undefined,
      message: "Please wait before requesting another verification email.",
    });
  });

  it("detects rate limit by message and extracts retry_after if available", () => {
    const error = { message: "Too many requests", retry_after: 45 };
    expect(analyzeResendError(error)).toEqual({
      type: "rate_limit",
      retryAfterSeconds: 45,
      message: "Please wait before requesting another verification email.",
    });
  });

  it("returns generic error for unknown issues", () => {
    const error = { message: "Invalid email domain" };
    expect(analyzeResendError(error)).toEqual({
      type: "generic",
      message: "Invalid email domain",
    });
  });
});
