import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuroraBackground } from "@/components/layout/AuroraBackground";
import { CheckoutClient } from "@/components/booking/CheckoutClient";

export const dynamic = "force-dynamic";

interface BookingSummary {
  id: string;
  status: string;
  scheduled_start: string;
  price_usd: number;
  services: { title: string } | null;
  practitioner_profiles: { display_name: string | null } | null;
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/checkout/${bookingId}`);

  // RLS scopes this to the booking's own client/practitioner.
  const { data: booking } = await supabase
    .from("bookings")
    .select<string, BookingSummary>(
      "id, status, scheduled_start, price_usd, services(title), practitioner_profiles(display_name)"
    )
    .eq("id", bookingId)
    .single();

  if (!booking) notFound();
  // Already paid (or otherwise resolved) — checkout has nothing left to do.
  if (booking.status !== "pending") redirect(`/booking-confirmation/${bookingId}`);

  const start = new Date(booking.scheduled_start);

  return (
    <div className="relative mx-auto max-w-md px-6 py-12">
      <AuroraBackground intensity="subtle" />
      <h1 className="font-heading text-2xl font-semibold text-foreground">Checkout</h1>

      <div className="mt-6 rounded-xl border border-border p-4">
        <p className="font-medium text-foreground">{booking.services?.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">with {booking.practitioner_profiles?.display_name}</p>
        <p className="mt-3 text-sm text-foreground">
          {start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at{" "}
          {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </p>
        <p className="mt-1 text-sm font-medium text-success">${booking.price_usd}</p>
      </div>

      <div className="mt-6">
        <CheckoutClient bookingId={booking.id} />
      </div>
    </div>
  );
}
