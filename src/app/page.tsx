export default function Home() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center gap-8 px-6 py-24">
      <div className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
          PlateCost foundation
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">Build on financial truth.</h1>
        <p className="max-w-xl text-lg leading-8 text-zinc-600">
          The application foundation is ready for deterministic financial logic, tenant-isolated
          data, and reviewed AI input processing.
        </p>
      </div>
      <ul className="grid gap-3 text-sm text-zinc-700 sm:grid-cols-2">
        <li className="rounded-lg border border-zinc-200 p-4">Typed domain boundaries</li>
        <li className="rounded-lg border border-zinc-200 p-4">Supabase SSR integration</li>
        <li className="rounded-lg border border-zinc-200 p-4">Tenant-isolated migrations</li>
        <li className="rounded-lg border border-zinc-200 p-4">Vitest and strict TypeScript</li>
      </ul>
      <div>
        <a
          href="/ingredients"
          className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-zinc-800 transition-colors"
        >
          Manage Ingredients →
        </a>
      </div>
    </main>
  );
}
