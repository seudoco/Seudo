import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

/**
 * Server-side role check for a subtree of the dashboard. This is a UX
 * convenience, not the security boundary — RLS policies (see
 * supabase/migrations/0001_init.sql) are what actually enforce access.
 * proxy.ts already guarantees `user` exists for any /dashboard route.
 */
export async function RoleGuard({
  requiredRole,
  children,
}: {
  requiredRole: UserRole;
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== requiredRole) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
