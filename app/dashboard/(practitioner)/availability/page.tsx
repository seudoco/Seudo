import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkingHours } from "@/components/dashboard/WorkingHours";
import { BlockedDatesManager } from "./BlockedDatesManager";

export default async function AvailabilityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: template }, { data: blocks }] = await Promise.all([
    supabase
      .from("availability_templates")
      .select("id, day_of_week, start_time, end_time")
      .eq("practitioner_id", user.id)
      .order("day_of_week"),
    supabase
      .from("availability_blocks")
      .select("id, blocked_date, start_time, end_time")
      .eq("practitioner_id", user.id)
      .order("blocked_date"),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Availability</h1>
        <WorkingHours initialRows={template ?? []} />
      </div>
      <div>
        <h2 className="font-heading text-xl font-semibold text-foreground">Blocked dates &amp; times</h2>
        <BlockedDatesManager initialBlocks={blocks ?? []} />
      </div>
    </div>
  );
}
