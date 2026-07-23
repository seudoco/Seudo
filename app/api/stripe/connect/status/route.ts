import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/client";

// Manual-refresh fallback for onboarding status — the webhook
// (account.updated) is the primary way stripe_connect_onboarded gets set,
// but this lets the dashboard re-check immediately after the practitioner
// finishes the embedded onboarding flow, without waiting on the webhook.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: practitionerProfile } = await supabase
    .from("practitioner_profiles")
    .select("stripe_connect_account_id, stripe_connect_onboarded")
    .eq("profile_id", user.id)
    .single();

  if (!practitionerProfile?.stripe_connect_account_id) {
    return NextResponse.json({ hasAccount: false, onboarded: false });
  }

  const account = await stripe.accounts.retrieve(practitionerProfile.stripe_connect_account_id);
  const onboarded = Boolean(account.charges_enabled && account.payouts_enabled);

  if (onboarded !== practitionerProfile.stripe_connect_onboarded) {
    await supabase
      .from("practitioner_profiles")
      .update({
        stripe_connect_onboarded: onboarded,
        onboarding_completed_at: onboarded ? new Date().toISOString() : null,
      })
      .eq("profile_id", user.id);
  }

  return NextResponse.json({ hasAccount: true, onboarded });
}
