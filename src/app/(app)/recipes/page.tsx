export const metadata = {
  title: "Recipes — PlateCost",
};

export default function RecipesPage() {
  return (
    <div className="mx-auto max-w-2xl py-16 text-center">
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8">
        <p className="text-3xl">📋</p>
        <h1 className="mt-4 text-xl font-semibold text-zinc-900">Recipes</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Recipe management with ingredient costing is coming soon. You&apos;ll
          be able to create recipes, calculate food costs, and track margins.
        </p>
      </div>
    </div>
  );
}
