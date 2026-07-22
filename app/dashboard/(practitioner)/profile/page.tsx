import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: specialtyLinks }, { data: allSpecialties }] = await Promise.all([
    supabase.from("practitioner_profiles").select("*").eq("profile_id", user.id).single(),
    supabase.from("practitioner_specialties").select("specialty_id").eq("practitioner_id", user.id),
    supabase.from("specialties").select("id, name").order("id"),
  ]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-foreground">Your profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        This is what clients see on your public listing.
      </p>
      <ProfileForm
        initial={{
          display_name: profile?.display_name ?? "",
          bio: profile?.bio ?? "",
          city: profile?.city ?? "",
          country: profile?.country ?? "",
          languages: profile?.languages ?? [],
          years_experience: profile?.years_experience ?? null,
          timezone: profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
          photo_url: profile?.photo_url ?? null,
          specialty_ids: (specialtyLinks ?? []).map((s) => s.specialty_id),
        }}
        allSpecialties={allSpecialties ?? []}
      />
    </div>
  );
}
