import { describe, it, expect } from "vitest";
import { detectExistingAccount } from "../../../src/application/auth/existing-account";

describe("detectExistingAccount", () => {
  it("classifies explicit error code email_exists as existing", () => {
    const response = {
      data: null,
      error: { code: "email_exists", message: "User already exists" },
    };
    expect(detectExistingAccount(response)).toBe("existing");
  });

  it("classifies explicit error code user_already_exists as existing", () => {
    const response = {
      data: null,
      error: { code: "user_already_exists", message: "User exists" },
    };
    expect(detectExistingAccount(response)).toBe("existing");
  });

  it("classifies message 'User already registered' as existing", () => {
    const response = {
      data: null,
      error: { message: "User already registered" },
    };
    expect(detectExistingAccount(response)).toBe("existing");
  });

  it("classifies message 'email already in use' case-insensitively as existing", () => {
    const response = {
      data: null,
      error: { message: "Email ALREADY IN USE" },
    };
    expect(detectExistingAccount(response)).toBe("existing");
  });

  it("classifies obfuscated response (user present, no session, empty identities) as existing", () => {
    const response = {
      data: {
        user: { id: "123", email: "test@example.com", identities: [] },
        session: null,
      },
      error: null,
    };
    expect(detectExistingAccount(response)).toBe("existing");
  });

  it("classifies new confirmation-required signup (user present, no session, has identities) as new", () => {
    const response = {
      data: {
        user: {
          id: "123",
          email: "test@example.com",
          identities: [{ id: "identity1" }],
        },
        session: null,
      },
      error: null,
    };
    expect(detectExistingAccount(response)).toBe("new");
  });

  it("classifies new immediate-session signup (user present, session present) as new", () => {
    const response = {
      data: {
        user: { id: "123" },
        session: { access_token: "token" },
      },
      error: null,
    };
    expect(detectExistingAccount(response)).toBe("new");
  });

  it("classifies unknown generic error as unknown", () => {
    const response = {
      data: null,
      error: { message: "Database connection failed" },
    };
    expect(detectExistingAccount(response)).toBe("unknown");
  });

  it("classifies missing data as unknown", () => {
    const response = {
      data: null,
      error: null,
    };
    expect(detectExistingAccount(response)).toBe("unknown");
  });
});
