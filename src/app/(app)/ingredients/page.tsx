import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import {
  resolveUserBusiness,
  getIngredients,
} from "@/infrastructure/supabase/ingredients";
import { IngredientsClientView } from "./client-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ingredients — PlateCost",
};

export default async function IngredientsPage() {
  const supabase = await createSupabaseServerClient();
  const session = await resolveUserBusiness(supabase);
  const ingredients = await getIngredients(supabase, session.businessId);

  return (
    <IngredientsClientView
      initialIngredients={ingredients}
      businessId={session.businessId}
    />
  );
}
