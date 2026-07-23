import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { AuroraBackground } from "@/components/layout/AuroraBackground";

// proxy.ts already guarantees an authenticated user reaches this layout —
// the check below is defensive (also fixes TS narrowing profile off the
// user-presence ternary), not the primary security boundary. See
// components/layout/RoleGuard.tsx and AdminGuard.tsx for the finer-grained
// checks used by individual dashboard subtrees in later phases.
export default async function DashboardLayout({
  children,
}: {
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
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  return (
    <div className="relative flex min-h-full flex-1 flex-col">
      <AuroraBackground intensity="subtle" />
      <header className="relative z-10 flex items-center justify-between border-b border-border bg-background px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-heading text-lg font-semibold tracking-tight">
            Seudo
          </Link>
          <Link href="/practitioners" className="text-sm text-muted-foreground hover:text-foreground">
            Browse
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {profile && (
            <span className="text-sm text-muted-foreground">
              {profile.full_name} · {profile.role}
            </span>
          )}
          <form action={signOutAction}>
            <Button type="submit" variant="outline" size="sm" className="cursor-pointer">
              Log out
            </Button>
          </form>
        </div>
      </header>
      <main className="flex flex-1 flex-col px-6 py-8">{children}</main>
    </div>
  );
}
