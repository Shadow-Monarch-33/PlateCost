export const metadata = {
  title: "Invoices — PlateCost",
};

export default function InvoicesPage() {
  return (
    <div className="mx-auto max-w-2xl py-16 text-center">
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8">
        <p className="text-3xl">📄</p>
        <h1 className="mt-4 text-xl font-semibold text-zinc-900">Invoices</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Invoice scanning and AI extraction is coming soon. Upload supplier
          invoices to automatically update ingredient prices.
        </p>
      </div>
    </div>
  );
}
