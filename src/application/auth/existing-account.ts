

export type SignupClassification = "existing" | "new" | "unknown";

/**
 * Detects if a signup response indicates that the account already exists.
 * Follows Supabase documented behaviors for both explicit errors and obfuscated responses.
 */
export function detectExistingAccount(
  response: {
    data: { user: unknown; session: unknown } | null;
    error: unknown;
  }
): SignupClassification {
  const { data, error } = response;

  if (error && typeof error === "object") {
    const errObj = error as Record<string, unknown>;
    const code = errObj.code;
    const message = typeof errObj.message === "string" ? errObj.message.toLowerCase() : "";

    // 1. Explicit error codes
    if (code === "email_exists" || code === "user_already_exists") {
      return "existing";
    }

    // 2. Explicit error messages
    if (
      message.includes("user already registered") ||
      message.includes("already exists") ||
      message.includes("email already in use")
    ) {
      return "existing";
    }
    
    // Unrelated error
    return "unknown";
  }

  // 3. Obfuscated user shape
  if (data && data.user && typeof data.user === "object") {
    // If there is a session, it's a new account that got logged in immediately
    if (data.session) {
      return "new";
    }

    // If there is no session, check identities
    const userObj = data.user as Record<string, unknown>;
    if (userObj.identities && Array.isArray(userObj.identities)) {
      if (userObj.identities.length === 0) {
        // Obfuscated response for existing user (when email confirmation obfuscation is enabled)
        return "existing";
      } else {
        // Normal confirmation-required signup has identities
        return "new";
      }
    }
  }

  return "unknown";
}
