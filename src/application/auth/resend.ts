export interface ResendErrorAnalysis {
  type: "already_confirmed" | "rate_limit" | "generic";
  retryAfterSeconds?: number;
  message: string;
}

export function analyzeResendError(error: unknown): ResendErrorAnalysis {
  if (!error || typeof error !== "object") {
    return { type: "generic", message: "An unexpected error occurred." };
  }

  // Type assertions safely
  const errorObj = error as Record<string, unknown>;
  const message = typeof errorObj.message === "string" ? errorObj.message.toLowerCase() : "";
  const status = typeof errorObj.status === "number" ? errorObj.status : undefined;

  // 1. Check for already confirmed
  if (/already\s+(confirmed|verified)/i.test(message)) {
    return {
      type: "already_confirmed",
      message: "This email is already verified. You can sign in.",
    };
  }

  // 2. Check for rate limit
  const isRateLimitStatus = status === 429;
  const isRateLimitMessage =
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("too many") ||
    message.includes("retry") ||
    message.includes("wait") ||
    message.includes("cooldown");

  if (isRateLimitStatus || isRateLimitMessage) {
    // Attempt to extract retry_after if provided by some error objects
    // Otherwise, we'll return undefined to let the UI fallback to 60 seconds
    let retryAfterSeconds: number | undefined = undefined;
    
    // Sometimes Supabase might include retry_after in the error object
    if (typeof errorObj.retry_after === "number") {
      retryAfterSeconds = errorObj.retry_after;
    }

    return {
      type: "rate_limit",
      retryAfterSeconds,
      message: "Please wait before requesting another verification email.",
    };
  }

  // 3. Generic error
  return {
    type: "generic",
    message: typeof errorObj.message === "string" && errorObj.message.trim() !== ""
      ? errorObj.message 
      : "Could not send the verification email. Please try again in a moment.",
  };
}
