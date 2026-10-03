export default function RecipesLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6" aria-busy="true">
      <div className="border-b border-zinc-200 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Recipes</h1>
        <p className="mt-1 text-sm text-zinc-500">Loading recipes…</p>
      </div>
      <div className="mt-6 space-y-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="h-16 animate-pulse rounded-xl border border-zinc-200 bg-white" />
        ))}
      </div>
    </div>
  );
}
