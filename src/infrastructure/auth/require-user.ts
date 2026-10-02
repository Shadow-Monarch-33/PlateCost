import { createSupabaseServerClient } from "../supabase/server";
import { redirect } from "next/navigation";

export interface AuthenticatedUser {
  id: string;
  email: string | undefined;
  displayName: string | undefined;
  createdAt: string;
}

/**
 * Defense-in-depth auth check for server components and server actions.
 * Middleware is the primary gate; this is the secondary check.
 *
 * Uses getUser() (not getSession()) for authoritative verification.
 *
 * @returns The authenticated user
 * @throws Redirects to /login if not authenticated
 */
export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.user_metadata?.display_name as string | undefined,
    createdAt: user.created_at,
  };
}
