import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe delivers webhooks at-least-once, so every handler is idempotent via
// processed_webhook_events — insert-then-branch-on-unique-violation, not a
// separate SELECT-then-INSERT (avoids a race between two deliveries of the
// same event landing concurrently).
//
// Event coverage grows with the booking/checkout sub-phases; for now this
// only needs account.updated (Stripe Connect onboarding completion).
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { error: insertErr } = await supabase.from("processed_webhook_events").insert({ event_id: event.id });
  if (insertErr) {
    if (insertErr.code === "23505") return NextResponse.json({ received: true }); // already processed
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  switch (event.type) {
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      const onboarded = Boolean(account.charges_enabled && account.payouts_enabled);
      await supabase
        .from("practitioner_profiles")
        .update({
          stripe_connect_onboarded: onboarded,
          onboarding_completed_at: onboarded ? new Date().toISOString() : null,
        })
        .eq("stripe_connect_account_id", account.id);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
