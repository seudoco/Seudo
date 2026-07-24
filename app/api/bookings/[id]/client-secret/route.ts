import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/client";

// The checkout page needs the PaymentIntent's client_secret to mount Stripe
// Elements. We don't store it (only the PaymentIntent id) — Stripe's
// retrieve call returns it again, scoped to whoever holds the API key, so
// ownership is enforced here via RLS on the booking read, not by the secret
// itself being sensitive in the same way the PI id is.
export async function GET(_request: Request, ctx: RouteContext<"/api/bookings/[id]/client-secret">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // RLS (bookings_select_own_or_admin) scopes this to the booking's own
  // client/practitioner — a non-owner id here yields 0 rows, not someone
  // else's payment details.
  const { data: booking } = await supabase
    .from("bookings")
    .select("status, stripe_payment_intent_id, pending_expires_at")
    .eq("id", id)
    .single();

  if (!booking || !booking.stripe_payment_intent_id) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.status !== "pending") {
    return NextResponse.json({ error: "This booking is no longer awaiting payment", status: booking.status }, { status: 409 });
  }
  if (booking.pending_expires_at && new Date(booking.pending_expires_at) < new Date()) {
    return NextResponse.json({ error: "This booking hold has expired" }, { status: 409 });
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);

  return NextResponse.json({
    client_secret: paymentIntent.client_secret,
    pending_expires_at: booking.pending_expires_at,
  });
}
