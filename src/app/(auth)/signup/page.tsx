import { SignupForm } from "./signup-form";

export const metadata = {
  title: "Create Account — PlateCost",
};

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-900">PlateCost</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Create an account to start tracking your restaurant costs.
          </p>
        </div>
        <SignupForm />
        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <a
            href="/login"
            className="font-medium text-zinc-900 hover:text-zinc-700 underline underline-offset-4"
          >
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
