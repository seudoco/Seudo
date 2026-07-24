import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";

const CLIENT_FREE_CANCEL_HOURS = 24;

export async function POST(request: Request, ctx: RouteContext<"/api/bookings/[id]/cancel">) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.slice(0, 1000) : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // RLS scopes the read to the booking's own client/practitioner (or
  // admin) — a stranger's id yields 0 rows here.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, client_id, practitioner_id, status, scheduled_start, stripe_payment_intent_id, stripe_charge_id")
    .eq("id", id)
    .single();
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  let actor: "client" | "practitioner";
  if (booking.client_id === user.id) actor = "client";
  else if (booking.practitioner_id === user.id) actor = "practitioner";
  else return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (booking.status !== "pending" && booking.status !== "confirmed") {
    return NextResponse.json({ error: "This booking can't be cancelled" }, { status: 409 });
  }

  const admin = createAdminClient();
  const now = new Date();

  // Never charged yet — nothing to refund, just release the hold.
  if (booking.status === "pending") {
    if (booking.stripe_payment_intent_id) {
      await stripe.paymentIntents.cancel(booking.stripe_payment_intent_id).catch(() => {
        // Already canceled/succeeded elsewhere — not fatal, the booking
        // update below is the source of truth either way.
      });
    }
    const { error } = await admin
      .from("bookings")
      .update({
        status: "cancelled_no_refund",
        pending_expires_at: null,
        cancelled_by: actor,
        cancelled_at: now.toISOString(),
        cancellation_reason: reason,
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ status: "cancelled_no_refund" });
  }

  // Confirmed (paid) — practitioner cancelling always refunds in full;
  // client cancelling refunds only outside the free-cancellation window.
  const hoursUntilSession = (new Date(booking.scheduled_start).getTime() - now.getTime()) / (1000 * 60 * 60);
  const refund = actor === "practitioner" || hoursUntilSession >= CLIENT_FREE_CANCEL_HOURS;

  if (refund && booking.stripe_payment_intent_id) {
    try {
      await stripe.refunds.create({
        payment_intent: booking.stripe_payment_intent_id,
        // Seudo eats the original Stripe processing fee on a refunded
        // session, but doesn't keep its own commission on one that didn't
        // happen — see plan §7. Since this is a destination charge, the
        // funds already moved in two directions (application fee to the
        // platform, transfer to the practitioner) — Stripe requires
        // reverse_transfer alongside refund_application_fee, or it rejects
        // the refund outright, since it can't claw back the fee without
        // also clawing back the transfer it came from.
        refund_application_fee: true,
        reverse_transfer: true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't process the refund";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const newStatus = refund ? "cancelled_refunded" : "cancelled_no_refund";
  const { error } = await admin
    .from("bookings")
    .update({
      status: newStatus,
      cancelled_by: actor,
      cancelled_at: now.toISOString(),
      cancellation_reason: reason,
    })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ status: newStatus });
}
