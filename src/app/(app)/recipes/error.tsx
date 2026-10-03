"use client";

export default function RecipesError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="mx-auto max-w-2xl py-16 text-center">
      <div className="rounded-xl border border-red-200 bg-white p-8">
        <h1 className="text-xl font-semibold text-zinc-900">Could not load recipes</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Something went wrong while loading your recipes. Please try again.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-6 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
