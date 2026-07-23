import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// A practitioner who hasn't published yet always lands on the onboarding
// checklist first — matches the plan's "guided post-signup onboarding"
// requirement. Once published, they land on their profile editor (with the
// Profile/Services/Availability nav) instead of a dead-end welcome page —
// there was no way back to edit a listing once it was live. Client browse/
// booking content and a real published-practitioner dashboard (earnings,
// upcoming bookings) arrive in later phases.
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

  if (profile?.role === "practitioner") {
    const { data: practitionerProfile } = await supabase
      .from("practitioner_profiles")
      .select("is_published")
      .eq("profile_id", user.id)
      .single();

    redirect(practitionerProfile?.is_published ? "/dashboard/profile" : "/dashboard/onboarding");
  }

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
