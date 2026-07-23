import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/client";
import { getCountryCode } from "@/lib/geo/profile-options";

// Creates (if needed) the practitioner's Stripe Connect account and returns
// an Account Session client secret for the embedded onboarding component —
// the practitioner completes onboarding entirely on seudo.co, never
// redirected to a Stripe-hosted page. `controller.stripe_dashboard.type:
// "none"` + fees/losses on "application" is the modern replacement for the
// deprecated `type: "custom"` account shape.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: profile }, { data: practitionerProfile }] = await Promise.all([
    supabase.from("profiles").select("role, email, country").eq("id", user.id).single(),
    supabase
      .from("practitioner_profiles")
      .select("stripe_connect_account_id, country")
      .eq("profile_id", user.id)
      .single(),
  ]);
  if (profile?.role !== "practitioner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let accountId = practitionerProfile?.stripe_connect_account_id ?? null;

  if (!accountId) {
    // Stripe requires a supported country code for the connected account.
    // Prefer the validated practitioner_profiles.country (set via the
    // profile's searchable country dropdown) over the free-text signup
    // country, since only the former is guaranteed to resolve to a real
    // ISO code; fall back to US if neither does.
    const country =
      getCountryCode(practitionerProfile?.country ?? "") ?? getCountryCode(profile.country ?? "") ?? "US";

    const account = await stripe.accounts.create({
      country,
      controller: {
        stripe_dashboard: { type: "none" },
        fees: { payer: "application" },
        // Stripe's embedded account-onboarding component collects
        // requirements on Stripe's behalf (requirement_collection defaults
        // to "stripe" for this controller shape) — Stripe requires that
        // combination to also mean Stripe (not the platform) is liable for
        // negative balances/refunds, so losses.payments must be "stripe"
        // here, not "application".
        losses: { payments: "stripe" },
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      email: profile.email,
      metadata: { practitioner_id: user.id },
    });
    accountId = account.id;

    const { error: updateErr } = await supabase
      .from("practitioner_profiles")
      .update({ stripe_connect_account_id: accountId })
      .eq("profile_id", user.id);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  const accountSession = await stripe.accountSessions.create({
    account: accountId,
    components: {
      account_onboarding: { enabled: true },
    },
  });

  return NextResponse.json({ client_secret: accountSession.client_secret });
}
