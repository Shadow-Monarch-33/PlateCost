import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { resolveUserBusiness } from "@/infrastructure/supabase/ingredients";
import { getMenuItemsWithEconomics } from "@/infrastructure/supabase/menu";
import { getRecipesWithCosts } from "@/infrastructure/supabase/recipes";
import { getIngredients } from "@/infrastructure/supabase/ingredients";
import { MenuClientView } from "./client-view";

export const metadata = {
  title: "Menu | PlateCost",
};

export default async function MenuPage() {
  const supabase = await createSupabaseServerClient();
  const session = await resolveUserBusiness(supabase);

  // Prefetch data concurrently
  const [items, recipes, ingredients, business] = await Promise.all([
    getMenuItemsWithEconomics(supabase, session.businessId),
    getRecipesWithCosts(supabase, session.businessId),
    getIngredients(supabase, session.businessId),
    supabase.from("businesses").select("platform_fee_pct").eq("id", session.businessId).single(),
  ]);

  const hasIngredients = ingredients.length > 0;
  const platformFeePct = business.data?.platform_fee_pct || null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-zinc-900 dark:text-zinc-100 sm:truncate sm:text-3xl sm:tracking-tight">
            Menu
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Manage your menu items and view their real-time unit economics based on recipe costs.
          </p>
        </div>
      </div>

      <MenuClientView 
        initialItems={items} 
        recipes={recipes} 
        platformFeePct={platformFeePct}
        hasIngredients={hasIngredients}
      />
    </div>
  );
}
