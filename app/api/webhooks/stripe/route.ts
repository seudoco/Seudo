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
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { data: booking } = await supabase
        .from("bookings")
        .select("id, scheduled_start, status")
        .eq("stripe_payment_intent_id", paymentIntent.id)
        .single();
      // Only a still-pending booking should be confirmed here — a stray
      // retry/duplicate delivery after cancellation must not resurrect it.
      if (booking && booking.status === "pending") {
        const latestCharge = paymentIntent.latest_charge;
        await supabase
          .from("bookings")
          .update({
            status: "confirmed",
            pending_expires_at: null,
            stripe_charge_id: typeof latestCharge === "string" ? latestCharge : (latestCharge?.id ?? null),
            // Judgment call (see plan): anchored to scheduled_start + 24h
            // rather than -24h, so it also covers a late practitioner
            // cancellation right around the session itself, not just the
            // client's free-cancellation deadline.
            payout_eligible_at: new Date(
              new Date(booking.scheduled_start).getTime() + 24 * 60 * 60 * 1000
            ).toISOString(),
          })
          .eq("id", booking.id);
      }
      break;
    }
    case "payment_intent.payment_failed":
    case "payment_intent.canceled": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      // Free the slot immediately rather than waiting for the (not yet
      // built) expired-pending cron sweep — the exclusion constraint only
      // blocks 'pending'/'confirmed', so this unblocks the slot right away.
      await supabase
        .from("bookings")
        .update({ status: "expired", pending_expires_at: null })
        .eq("stripe_payment_intent_id", paymentIntent.id)
        .eq("status", "pending");
      break;
    }
    case "charge.refunded": {
      // Safety-net reconciliation in case a refund is ever issued directly
      // from the Stripe dashboard rather than through
      // /api/bookings/[id]/cancel — that route already sets
      // cancelled_refunded itself, so this only needs to catch bookings
      // that are still 'confirmed' despite the underlying charge being
      // refunded.
      const charge = event.data.object as Stripe.Charge;
      if (charge.refunded) {
        await supabase
          .from("bookings")
          .update({ status: "cancelled_refunded" })
          .eq("stripe_charge_id", charge.id)
          .eq("status", "confirmed");
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
