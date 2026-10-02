"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/infrastructure/supabase/browser";
import { analyzeResendError } from "@/application/auth/resend";

interface Props {
  email: string;
}

const SUCCESS_COOLDOWN_SECONDS = 20;
const FALLBACK_RATE_LIMIT_COOLDOWN_SECONDS = 60;

export function SignupConfirmation({ email }: Props) {
  const [isSending, setIsSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAlreadyConfirmed, setIsAlreadyConfirmed] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((c) => c - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown]);

  const handleResend = async () => {
    if (isSending || cooldown > 0) return;

    setIsSending(true);
    setError(null);
    setSuccess(null);
    setIsAlreadyConfirmed(false);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (resendError) {
        const analysis = analyzeResendError(resendError);
        
        if (analysis.type === "already_confirmed") {
          setIsAlreadyConfirmed(true);
        } else if (analysis.type === "rate_limit") {
          setError(analysis.message);
          setCooldown(analysis.retryAfterSeconds ?? FALLBACK_RATE_LIMIT_COOLDOWN_SECONDS);
        } else {
          setError(analysis.message);
        }
        
        setIsSending(false);
        return;
      }

      setSuccess("Verification email sent.");
      setCooldown(SUCCESS_COOLDOWN_SECONDS);
      setIsSending(false);
    } catch {
      setError("Could not send the verification email. Please try again in a moment.");
      setIsSending(false);
    }
  };

  return (
    <div className="rounded-xl bg-white border border-zinc-200 p-6 shadow-2xs text-center">
      <div className="text-3xl mb-3">✉️</div>
      <h2 className="text-xl font-semibold text-zinc-900">Check your email</h2>
      <p className="mt-2 text-sm text-zinc-500">
        We&apos;ve sent a verification link to
      </p>
      <p className="mt-1 font-medium text-zinc-900">{email}</p>

      {isAlreadyConfirmed ? (
        <div className="mt-6 rounded-md bg-green-50 p-4 border border-green-200">
          <p className="text-sm text-green-800 font-medium mb-3">
            This email is already verified. You can sign in.
          </p>
          <a
            href="/login"
            className="inline-flex w-full justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-zinc-800 transition-colors"
          >
            Go to login
          </a>
        </div>
      ) : (
        <div className="mt-8 border-t border-zinc-100 pt-6">
          <p className="text-sm text-zinc-600 mb-3">Didn&apos;t receive it?</p>
          
          <div aria-live="polite" className="sr-only">
            {isSending ? "Sending verification email..." : ""}
            {success ? success : ""}
            {error ? error : ""}
          </div>
          
          {error && (
            <p className="mb-3 text-sm text-red-600 font-medium">{error}</p>
          )}

          {success && (
            <p className="mb-3 text-sm text-green-700 font-medium">{success}</p>
          )}

          <button
            onClick={handleResend}
            disabled={isSending || cooldown > 0}
            className="w-full rounded-lg bg-white border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
          >
            {isSending ? "Sending..." : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend verification email"}
          </button>
        </div>
      )}

      <div className="mt-6">
        <a
          href="/login"
          className="text-sm font-medium text-zinc-500 hover:text-zinc-900 underline underline-offset-4"
        >
          Back to login
        </a>
      </div>
    </div>
  );
}
