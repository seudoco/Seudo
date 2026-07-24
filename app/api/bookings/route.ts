import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import { createBookingSchema } from "@/lib/validation/booking";

const MINIMUM_NOTICE_HOURS = 2;
const PLATFORM_FEE_RATE = 0.15;
const PENDING_TTL_MINUTES = 15;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { practitioner_id, service_id, scheduled_start, guest_info } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  let clientId: string;

  if (sessionUser) {
    clientId = sessionUser.id;
  } else {
    if (!guest_info) {
      return NextResponse.json(
        { error: "Log in, or provide guest_info to book without an account" },
        { status: 400 }
      );
    }
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: guest_info.email,
      password: guest_info.password,
      email_confirm: true, // guest checkout must be usable immediately, not blocked on a confirmation email
      user_metadata: {
        role: "client",
        full_name: guest_info.full_name,
        phone: guest_info.phone ?? "",
        date_of_birth: guest_info.date_of_birth,
        country: guest_info.country,
      },
    });
    if (createErr) {
      const message = createErr.message.toLowerCase().includes("already")
        ? "An account with that email already exists — log in instead."
        : createErr.message;
      return NextResponse.json({ error: message }, { status: 400 });
    }
    clientId = created.user.id;

    // Establish a real session for the new account on this same response,
    // so the guest is genuinely logged in by the time checkout finishes —
    // not just "an account exists somewhere they haven't accessed yet".
    await supabase.auth.signInWithPassword({ email: guest_info.email, password: guest_info.password });
  }

  const { data: service } = await admin
    .from("services")
    .select("id, title, price_usd, duration_minutes, is_active, practitioner_id")
    .eq("id", service_id)
    .eq("practitioner_id", practitioner_id)
    .single();
  if (!service || !service.is_active) {
    return NextResponse.json({ error: "This service isn't available" }, { status: 404 });
  }

  const { data: practitionerProfile } = await admin
    .from("practitioner_profiles")
    .select("is_published, stripe_connect_account_id, stripe_connect_onboarded")
    .eq("profile_id", practitioner_id)
    .single();
  if (
    !practitionerProfile ||
    !practitionerProfile.is_published ||
    !practitionerProfile.stripe_connect_onboarded ||
    !practitionerProfile.stripe_connect_account_id
  ) {
    return NextResponse.json({ error: "This practitioner isn't bookable right now" }, { status: 409 });
  }

  const start = new Date(scheduled_start);
  const earliestBookable = new Date(Date.now() + MINIMUM_NOTICE_HOURS * 60 * 60 * 1000);
  if (start < earliestBookable) {
    return NextResponse.json(
      { error: `Bookings need at least ${MINIMUM_NOTICE_HOURS} hours' notice` },
      { status: 400 }
    );
  }
  const end = new Date(start.getTime() + service.duration_minutes * 60 * 1000);

  // Snapshot price/fee/payout at booking time — later changes to the
  // service's price must not retroactively change an existing booking.
  const priceUsd = service.price_usd;
  const platformFeeUsd = Math.round(priceUsd * PLATFORM_FEE_RATE * 100) / 100;
  const practitionerPayoutUsd = Math.round((priceUsd - platformFeeUsd) * 100) / 100;

  const { data: booking, error: bookingErr } = await admin
    .from("bookings")
    .insert({
      client_id: clientId,
      practitioner_id,
      service_id,
      status: "pending",
      scheduled_start: start.toISOString(),
      scheduled_end: end.toISOString(),
      price_usd: priceUsd,
      platform_fee_usd: platformFeeUsd,
      practitioner_payout_usd: practitionerPayoutUsd,
      pending_expires_at: new Date(Date.now() + PENDING_TTL_MINUTES * 60 * 1000).toISOString(),
      stripe_payment_intent_id: null,
      stripe_charge_id: null,
      stripe_transfer_id: null,
      payout_eligible_at: null,
      payout_released_at: null,
      daily_room_name: null,
      daily_room_url: null,
      cancelled_by: null,
      cancelled_at: null,
      cancellation_reason: null,
      completed_at: null,
    })
    .select("id")
    .single();

  if (bookingErr) {
    // 23P01 = Postgres exclusion_violation — the no_overlapping_bookings
    // constraint (0001_init.sql) is what actually caught the double-book,
    // not application logic. Translate to a clean, expected client error.
    if (bookingErr.code === "23P01") {
      return NextResponse.json({ error: "That slot was just booked — pick another time" }, { status: 409 });
    }
    return NextResponse.json({ error: bookingErr.message }, { status: 500 });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(priceUsd * 100),
      currency: "usd",
      application_fee_amount: Math.round(platformFeeUsd * 100),
      transfer_data: { destination: practitionerProfile.stripe_connect_account_id },
      metadata: { booking_id: booking.id },
      automatic_payment_methods: { enabled: true },
    });

    await admin.from("bookings").update({ stripe_payment_intent_id: paymentIntent.id }).eq("id", booking.id);

    return NextResponse.json({ booking_id: booking.id, client_secret: paymentIntent.client_secret });
  } catch (err) {
    // Payment setup failed after the booking row (and its slot-holding
    // exclusion constraint) was created — release the slot immediately
    // rather than leaving a dead pending booking blocking it for 15 minutes.
    await admin.from("bookings").update({ status: "expired", pending_expires_at: null }).eq("id", booking.id);
    const message = err instanceof Error ? err.message : "Couldn't set up payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
