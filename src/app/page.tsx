export default function Home() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center gap-8 px-6 py-24">
      <div className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
          PlateCost
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Build on financial truth.
        </h1>
        <p className="max-w-xl text-lg leading-8 text-zinc-600">
          Track ingredient costs, manage recipes, and optimize your food cost
          percentage with deterministic financial logic and tenant-isolated data.
        </p>
      </div>
      <ul className="grid gap-3 text-sm text-zinc-700 sm:grid-cols-2">
        <li className="rounded-lg border border-zinc-200 p-4">
          Ingredient cost tracking
        </li>
        <li className="rounded-lg border border-zinc-200 p-4">
          Recipe cost calculation
        </li>
        <li className="rounded-lg border border-zinc-200 p-4">
          Tenant-isolated data
        </li>
        <li className="rounded-lg border border-zinc-200 p-4">
          Invoice price extraction
        </li>
      </ul>
      <div className="flex flex-wrap gap-3">
        <a
          href="/signup"
          className="inline-flex items-center justify-center rounded-lg dark:border dark:border-zinc-600 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-zinc-800 transition-colors"
        >
          Create account
        </a>
        <a
          href="/login"
          className="inline-flex items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 transition-colors"
        >
          Sign in
        </a>
      </div>
    </main>
  );
}
