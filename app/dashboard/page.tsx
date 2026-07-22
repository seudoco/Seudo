import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Placeholder landing view — Phase 2 replaces this with real practitioner
// (profile/services/availability) and client (browse) content per role.
export default async function DashboardPage() {
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
    <div>
      <h1 className="font-heading text-2xl font-semibold text-foreground">
        Welcome, {profile?.full_name}
      </h1>
      <p className="mt-2 text-muted-foreground">
        You&apos;re signed in as a {profile?.role}. This dashboard fills in over the next
        build phases.
      </p>
    </div>
  );
}
