import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import {
  getIngredients,
  resolveUserBusiness,
} from "@/infrastructure/supabase/ingredients";
import { getRecipesWithCosts } from "@/infrastructure/supabase/recipes";
import { RecipesClientView } from "./client-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Recipes — PlateCost",
};

export default async function RecipesPage() {
  const supabase = await createSupabaseServerClient();
  const session = await resolveUserBusiness(supabase);
  const [ingredients, recipes] = await Promise.all([
    getIngredients(supabase, session.businessId),
    getRecipesWithCosts(supabase, session.businessId),
  ]);

  return (
    <RecipesClientView
      initialRecipes={recipes}
      ingredients={ingredients.map((ingredient) => ({
        id: ingredient.id,
        name: ingredient.name,
        base_unit: ingredient.base_unit,
        current_price: String(ingredient.current_price),
      }))}
    />
  );
}
