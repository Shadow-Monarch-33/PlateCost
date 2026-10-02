import { requireAuthenticatedUser } from "@/infrastructure/auth/require-user";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { resolveUserBusiness } from "@/infrastructure/supabase/ingredients";
import { AppNavigation } from "./navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const business = await resolveUserBusiness(supabase, { autoProvision: false });

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppNavigation
        userEmail={user.email}
        displayName={user.displayName}
        avatarUrl={user.avatarUrl}
        businessName={business?.businessName ?? null}
      />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
