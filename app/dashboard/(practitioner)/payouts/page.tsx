import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PayoutsPanel } from "@/components/dashboard/PayoutsPanel";

export default async function PayoutsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("practitioner_profiles")
    .select("stripe_connect_onboarded")
    .eq("profile_id", user.id)
    .single();

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-foreground">Payouts</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Set up Stripe to receive payouts for your bookings — 85% of every session, paid out automatically.
      </p>
      <PayoutsPanel initiallyOnboarded={profile?.stripe_connect_onboarded ?? false} />
    </div>
  );
}
