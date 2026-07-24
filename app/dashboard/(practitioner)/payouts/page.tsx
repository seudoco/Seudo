import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PayoutsPanel } from "@/components/dashboard/PayoutsPanel";
import { EarningsChart } from "@/components/dashboard/EarningsChart";

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

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
  const onboarded = profile?.stripe_connect_onboarded ?? false;

  if (!onboarded) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Earnings</h1>
        <PayoutsPanel initiallyOnboarded={false} />
      </div>
    );
  }

  const now = new Date();
  const monthStart = startOfMonth(now);

  const { data: earnedBookings } = await supabase
    .from("bookings")
    .select("scheduled_start, practitioner_payout_usd, status")
    .eq("practitioner_id", user.id)
    .in("status", ["confirmed", "completed"]);

  const rows = earnedBookings ?? [];
  const lifetimeTotal = rows.reduce((sum, b) => sum + b.practitioner_payout_usd, 0);
  const thisMonthRows = rows.filter((b) => new Date(b.scheduled_start) >= monthStart);
  const thisMonthTotal = thisMonthRows.reduce((sum, b) => sum + b.practitioner_payout_usd, 0);
  const upcomingSessions = rows.filter((b) => b.status === "confirmed" && new Date(b.scheduled_start) > now).length;

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const byDate = new Map<string, number>();
  for (const b of thisMonthRows) {
    const key = new Date(b.scheduled_start).toISOString().slice(0, 10);
    byDate.set(key, (byDate.get(key) ?? 0) + b.practitioner_payout_usd);
  }
  const chartDays = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth(), i + 1).toISOString().slice(0, 10);
    return { date, amount: byDate.get(date) ?? 0 };
  });

  const monthLabel = now.toLocaleDateString("en-US", { month: "long" });

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-foreground">Earnings</h1>

      <div className="mt-6 rounded-2xl border border-border p-6">
        <p className="text-sm text-muted-foreground">{monthLabel} earnings</p>
        <p className="mt-1 font-heading text-4xl font-semibold text-success">${thisMonthTotal.toFixed(2)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {thisMonthRows.length} {thisMonthRows.length === 1 ? "session" : "sessions"} this month
        </p>
        <div className="mt-6">
          <EarningsChart days={chartDays} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Lifetime earnings</p>
          <p className="mt-1 font-heading text-2xl font-semibold text-foreground">${lifetimeTotal.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Upcoming sessions</p>
          <p className="mt-1 font-heading text-2xl font-semibold text-foreground">{upcomingSessions}</p>
        </div>
      </div>

      <PayoutsPanel initiallyOnboarded={onboarded} />
    </div>
  );
}
