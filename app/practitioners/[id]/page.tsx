import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";

// Explicit shape for this joined query — the hand-written types/database.ts
// (see its top comment) has no FK "Relationships" metadata, so nested
// selects like practitioner_specialties(specialties(name)) can't be
// auto-inferred the way a real `supabase gen types` output would. Overriding
// via .select<string, T>() rather than trying to hand-model every FK graph.
interface PractitionerDetail {
  profile_id: string;
  display_name: string | null;
  bio: string | null;
  photo_url: string | null;
  city: string | null;
  country: string | null;
  languages: string[];
  years_experience: number | null;
  is_published: boolean;
  avg_rating: number | null;
  review_count: number;
  practitioner_specialties: { specialties: { name: string } | null }[];
  services: {
    id: string;
    title: string;
    description: string | null;
    duration_minutes: number;
    price_usd: number;
    is_active: boolean;
  }[];
}

export default async function PractitionerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS (0001_init.sql) only returns this row if is_published=true or the
  // viewer owns it — a non-owner hitting an unpublished/nonexistent id
  // simply gets zero rows here, which we treat as a clean 404.
  const { data: practitioner } = await supabase
    .from("practitioner_profiles")
    .select<string, PractitionerDetail>(
      "profile_id, display_name, bio, photo_url, city, country, languages, years_experience, is_published, avg_rating, review_count, practitioner_specialties(specialties(name)), services(id, title, description, duration_minutes, price_usd, is_active)"
    )
    .eq("profile_id", id)
    .single();

  if (!practitioner) notFound();

  const isOwnerPreview = user?.id === practitioner.profile_id && !practitioner.is_published;
  const specialtyNames = (practitioner.practitioner_specialties ?? [])
    .map((ps) => ps.specialties?.name)
    .filter((n): n is string => Boolean(n));
  const activeServices = (practitioner.services ?? []).filter((s) => s.is_active);

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      {isOwnerPreview && (
        <div className="mb-6 rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground">
          This is a preview — your listing isn&apos;t public yet. Publish it from your dashboard to go live.
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary">
          {practitioner.photo_url ? (
            <Image
              src={practitioner.photo_url}
              alt=""
              width={96}
              height={96}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <span className="text-xs text-muted-foreground">No photo</span>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-semibold text-foreground break-words">
            {practitioner.display_name}
          </h1>
          {(practitioner.city || practitioner.country) && (
            <p className="text-sm text-muted-foreground">
              {[practitioner.city, practitioner.country].filter(Boolean).join(", ")}
            </p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {practitioner.avg_rating
              ? `★ ${practitioner.avg_rating.toFixed(1)} (${practitioner.review_count} reviews)`
              : "New practitioner"}
          </p>
        </div>
      </div>

      {specialtyNames.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {specialtyNames.map((name) => (
            <Badge key={name} variant="secondary">
              {name}
            </Badge>
          ))}
        </div>
      )}

      {practitioner.bio && (
        <p className="mt-6 leading-relaxed text-foreground break-words">{practitioner.bio}</p>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
        {practitioner.years_experience !== null && (
          <div>
            <dt className="text-muted-foreground">Experience</dt>
            <dd className="text-foreground">{practitioner.years_experience} years</dd>
          </div>
        )}
        {practitioner.languages?.length > 0 && (
          <div>
            <dt className="text-muted-foreground">Languages</dt>
            <dd className="text-foreground">{practitioner.languages.join(", ")}</dd>
          </div>
        )}
      </dl>

      <h2 className="mt-10 font-heading text-xl font-semibold text-foreground">Services</h2>
      {activeServices.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No services listed yet.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {activeServices.map((s) => (
            <li key={s.id} className="rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-4">
                <p className="min-w-0 break-words font-medium text-foreground">{s.title}</p>
                <p className="shrink-0 text-sm text-muted-foreground">
                  {s.duration_minutes} min ·{" "}
                  <span className="font-medium text-success">${s.price_usd}</span>
                </p>
              </div>
              {s.description && (
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground break-words">
                  {s.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-sm text-muted-foreground">
        Booking opens once payments are live — check back soon.
      </p>
    </div>
  );
}
