export const metadata = {
  title: "Settings — PlateCost",
};

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage your PlateCost preferences
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-12 text-center">
        <p className="text-sm text-zinc-500">
          More settings are coming soon.
        </p>
      </div>
    </div>
  );
}
