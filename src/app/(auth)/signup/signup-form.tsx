"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/infrastructure/supabase/browser";
import { validateSignupPayload } from "@/application/auth/validation";

export function SignupForm() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateSignupPayload(displayName, email, password, confirmPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
          },
        },
      });

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
        return;
      }

      // If email confirmation is disabled, redirect immediately
      // If enabled, show a success message
      setIsSuccess(true);
      setIsLoading(false);
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="rounded-xl bg-white border border-zinc-200 p-6 shadow-2xs text-center">
        <div className="text-3xl mb-3">✉️</div>
        <h2 className="text-lg font-semibold text-zinc-900">Check your email</h2>
        <p className="mt-2 text-sm text-zinc-500">
          We sent a confirmation link to{" "}
          <strong className="text-zinc-700">{email}</strong>. Click the link to
          activate your account, then{" "}
          <a
            href="/login"
            className="font-medium text-zinc-900 underline underline-offset-4"
          >
            sign in
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="displayName"
          className="block text-sm font-medium text-zinc-700"
        >
          Display name
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          autoComplete="name"
          required
          maxLength={50}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 shadow-2xs focus:border-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-zinc-500"
          placeholder="Jane Doe"
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-zinc-700"
        >
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 shadow-2xs focus:border-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-zinc-500"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-zinc-700"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 shadow-2xs focus:border-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-zinc-500"
          placeholder="••••••••"
        />
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-zinc-700"
        >
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 shadow-2xs focus:border-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-zinc-500"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-zinc-800 disabled:opacity-50 transition-colors"
      >
        {isLoading ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
