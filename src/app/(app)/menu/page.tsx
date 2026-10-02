export const metadata = {
  title: "Menu — PlateCost",
};

export default function MenuPage() {
  return (
    <div className="mx-auto max-w-2xl py-16 text-center">
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8">
        <p className="text-3xl">🍽️</p>
        <h1 className="mt-4 text-xl font-semibold text-zinc-900">Menu</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Menu management with pricing and food cost analysis is coming soon.
          You&apos;ll be able to set selling prices and see margins per dish.
        </p>
      </div>
    </div>
  );
}
