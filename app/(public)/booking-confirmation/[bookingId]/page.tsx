import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuroraBackground } from "@/components/layout/AuroraBackground";

export const dynamic = "force-dynamic";

interface BookingDetail {
  id: string;
  status: string;
  scheduled_start: string;
  scheduled_end: string;
  price_usd: number;
  services: { title: string } | null;
  practitioner_profiles: { display_name: string | null } | null;
}

export default async function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/booking-confirmation/${bookingId}`);

  // RLS (bookings_select_own_or_admin) already scopes this to the client or
  // practitioner on the booking — a stranger's id here just yields 0 rows.
  const { data: booking } = await supabase
    .from("bookings")
    .select<string, BookingDetail>(
      "id, status, scheduled_start, scheduled_end, price_usd, services(title), practitioner_profiles(display_name)"
    )
    .eq("id", bookingId)
    .single();

  if (!booking) notFound();

  const start = new Date(booking.scheduled_start);

  return (
    <div className="relative mx-auto max-w-md px-6 py-12 text-center">
      <AuroraBackground intensity="subtle" />

      {booking.status === "pending" ? (
        <>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Awaiting payment</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This slot is held for you temporarily.{" "}
            <Link href={`/checkout/${booking.id}`} className="font-medium text-foreground underline underline-offset-4">
              Finish checkout
            </Link>{" "}
            to confirm it.
          </p>
        </>
      ) : (
        <>
          <h1 className="font-heading text-2xl font-semibold text-success">Booking confirmed</h1>
          <p className="mt-2 text-sm text-muted-foreground">You&apos;re all set.</p>
        </>
      )}

      <div className="mt-8 rounded-xl border border-border p-4 text-left">
        <p className="font-medium text-foreground">{booking.services?.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">with {booking.practitioner_profiles?.display_name}</p>
        <p className="mt-3 text-sm text-foreground">
          {start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at{" "}
          {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </p>
        <p className="mt-1 text-sm font-medium text-success">${booking.price_usd}</p>
      </div>

      <Link
        href="/dashboard"
        className="mt-6 inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
