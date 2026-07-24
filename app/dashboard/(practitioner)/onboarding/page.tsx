import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PublishButton } from "./PublishButton";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { count: specialtyCount }, { count: serviceCount }, { count: templateCount }] =
    await Promise.all([
      supabase
        .from("practitioner_profiles")
        .select("display_name, bio, is_published, stripe_connect_onboarded")
        .eq("profile_id", user.id)
        .single(),
      supabase.from("practitioner_specialties").select("*", { count: "exact", head: true }).eq("practitioner_id", user.id),
      supabase
        .from("services")
        .select("*", { count: "exact", head: true })
        .eq("practitioner_id", user.id)
        .eq("is_active", true),
      supabase.from("availability_templates").select("*", { count: "exact", head: true }).eq("practitioner_id", user.id),
    ]);

  const profileDone = !!profile?.display_name && !!profile?.bio && !!specialtyCount;
  const servicesDone = !!serviceCount;
  const availabilityDone = !!templateCount;
  const allDone = profileDone && servicesDone && availabilityDone;

  return (
    <div className="max-w-xl">
      <h1 className="font-heading text-2xl font-semibold text-foreground">Get your listing live</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Four steps to start taking bookings. You can come back and edit any of this later.
      </p>

      <ol className="mt-8 flex flex-col gap-4">
        <Step done={profileDone} href="/dashboard/profile" title="Complete your profile">
          Photo, bio, and at least one specialty.
        </Step>
        <Step done={servicesDone} href="/dashboard/services" title="Add a service">
          What you offer, how long it takes, and what it costs.
        </Step>
        <Step done={availabilityDone} href="/dashboard/availability" title="Set your availability">
          At least one open window in your weekly schedule.
        </Step>
        <Step done={profile?.stripe_connect_onboarded ?? false} href="/dashboard/payouts" title="Set up your payouts">
          Add your payout details so you can get paid — you can publish before this step.
        </Step>
      </ol>

      <div className="mt-8">
        <PublishButton initiallyPublished={profile?.is_published ?? false} canPublish={allDone} />
        {!allDone && (
          <p className="mt-2 text-sm text-muted-foreground">
            Finish profile, services, and availability to publish your listing.
          </p>
        )}
      </div>
    </div>
  );
}

function Step({
  done,
  href,
  title,
  children,
  disabled,
}: {
  done: boolean;
  href: string;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const content = (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${
        disabled
          ? "border-border opacity-60"
          : done
            ? "border-success/30 bg-success/5 hover:border-success/50"
            : "border-border hover:border-foreground"
      }`}
    >
      <div
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs transition-colors ${
          done ? "bg-success text-success-foreground" : "border border-border text-muted-foreground"
        }`}
      >
        {done ? "✓" : ""}
      </div>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  );

  if (disabled) return <li>{content}</li>;
  return (
    <li>
      <Link href={href}>{content}</Link>
    </li>
  );
}
