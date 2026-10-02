import { requireAuthenticatedUser } from "@/infrastructure/auth/require-user";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { resolveUserBusiness } from "@/infrastructure/supabase/ingredients";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard — PlateCost",
};

export default async function DashboardPage() {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const business = await resolveUserBusiness(supabase, { autoProvision: false });

  if (!business) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-2xs">
          <h1 className="text-xl font-semibold text-zinc-900">
            Welcome to PlateCost
          </h1>
          <p className="mt-3 text-sm text-zinc-500">
            Your account is set up, but you don&apos;t belong to any business
            yet. A business owner or administrator needs to add you as a member.
          </p>
          <p className="mt-4 text-xs text-zinc-400">
            Signed in as {user.email}
          </p>
        </div>
      </div>
    );
  }

  // Fetch ingredient count for a simple dashboard stat
  const { count: ingredientCount } = await supabase
    .from("ingredients")
    .select("*", { count: "exact", head: true })
    .eq("business_id", business.businessId);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Welcome back. Here&apos;s an overview of {business.businessName}.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <a
          href="/ingredients"
          className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs hover:border-zinc-300 transition-colors"
        >
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Ingredients
          </p>
          <p className="mt-2 text-2xl font-bold text-zinc-900">
            {ingredientCount ?? 0}
          </p>
          <p className="mt-1 text-xs text-zinc-400">Tracked items →</p>
        </a>

        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-5">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Recipes
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            Coming soon
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-5">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Menu Items
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            Coming soon
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-5">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Invoices
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            Coming soon
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-sm font-medium text-zinc-700">Quick actions</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <a
            href="/ingredients"
            className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 transition-colors"
          >
            Manage Ingredients
          </a>
        </div>
      </div>
    </div>
  );
}
