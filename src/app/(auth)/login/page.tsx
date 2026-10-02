import { LoginForm } from "./login-form";

export const metadata = {
  title: "Sign In — PlateCost",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-900">PlateCost</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Sign in to manage your restaurant costs.
          </p>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-zinc-500">
          Don&apos;t have an account?{" "}
          <a
            href="/signup"
            className="font-medium text-zinc-900 hover:text-zinc-700 underline underline-offset-4"
          >
            Create account
          </a>
        </p>
      </div>
    </div>
  );
}
