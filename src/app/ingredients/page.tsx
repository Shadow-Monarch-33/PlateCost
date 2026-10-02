import Link from "next/link";
import { createSupabaseServerClient } from "../../infrastructure/supabase/server";
import {
  resolveUserBusiness,
  getIngredients,
} from "../../infrastructure/supabase/ingredients";
import { IngredientsClientView } from "./client-view";
import type { Ingredient } from "../../domain/ingredients/types";

export const dynamic = "force-dynamic";

export default async function IngredientsPage() {
  let ingredients: Ingredient[] = [];
  let businessId = "";
  let authError: string | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const session = await resolveUserBusiness(supabase);
    businessId = session.businessId;
    ingredients = await getIngredients(supabase, session.businessId);
  } catch (err) {
    authError =
      err instanceof Error
        ? err.message
        : "Failed to establish authenticated business session.";
  }

  return (
    <main className="min-h-screen bg-zinc-50/50">
      {/* Navigation Bar */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-base font-bold tracking-tight text-zinc-900"
            >
              PlateCost
            </Link>
            <nav className="flex items-center gap-4 text-xs font-medium text-zinc-600">
              <Link
                href="/ingredients"
                className="text-zinc-900 font-semibold"
              >
                Ingredients
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
              INR (₹)
            </span>
          </div>
        </div>
      </header>

      {authError ? (
        <div className="mx-auto mt-12 max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xs text-center">
          <h2 className="text-base font-semibold text-zinc-900">
            Authentication Required
          </h2>
          <p className="mt-2 text-xs text-zinc-600">
            {authError}
          </p>
          <div className="mt-4">
            <Link
              href="/"
              className="inline-flex rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-zinc-800"
            >
              Return Home
            </Link>
          </div>
        </div>
      ) : (
        <IngredientsClientView
          initialIngredients={ingredients}
          businessId={businessId}
        />
      )}
    </main>
  );
}
