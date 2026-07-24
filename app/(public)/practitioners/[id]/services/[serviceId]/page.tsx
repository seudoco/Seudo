import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { AuroraBackground } from "@/components/layout/AuroraBackground";
import { SlotPicker } from "@/components/booking/SlotPicker";
import { specialtyColor } from "@/lib/specialty-colors";

export const dynamic = "force-dynamic";

interface ServiceDetail {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  price_usd: number;
  is_active: boolean;
  specialties: { name: string } | null;
  practitioner_profiles: {
    profile_id: string;
    display_name: string | null;
    photo_url: string | null;
    is_published: boolean;
    stripe_connect_onboarded: boolean;
    avg_rating: number | null;
    review_count: number;
  } | null;
}

async function fetchService(id: string, serviceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: service } = await supabase
    .from("services")
    .select<string, ServiceDetail>(
      "id, title, description, duration_minutes, price_usd, is_active, specialties(name), practitioner_profiles!inner(profile_id, display_name, photo_url, is_published, stripe_connect_onboarded, avg_rating, review_count)"
    )
    .eq("id", serviceId)
    .eq("practitioner_id", id)
    .maybeSingle();

  return { service, user, supabase };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; serviceId: string }>;
}): Promise<Metadata> {
  const { id, serviceId } = await params;
  const { service } = await fetchService(id, serviceId);
  if (!service || !service.practitioner_profiles?.is_published) return { title: "Service — Seudo" };

  const title = `${service.title} by ${service.practitioner_profiles.display_name} | Seudo`;
  const description = service.description?.slice(0, 155) ?? `Book ${service.title} on Seudo.`;
  return { title, description };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string; serviceId: string }>;
}) {
  const { id, serviceId } = await params;
  const { service, user } = await fetchService(id, serviceId);

  if (!service || !service.practitioner_profiles) notFound();

  const practitioner = service.practitioner_profiles;
  const isOwnerPreview = user?.id === practitioner.profile_id && !practitioner.is_published;
  if (!practitioner.is_published && !isOwnerPreview) notFound();
  if (!service.is_active && !isOwnerPreview) notFound();

  const color = service.specialties?.name ? specialtyColor(service.specialties.name) : null;

  return (
    <div className="relative mx-auto max-w-2xl px-6 py-12">
      <AuroraBackground intensity="subtle" />

      {isOwnerPreview && (
        <div className="mb-6 rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground">
          This is a preview — your listing isn&apos;t public yet. Publish it from your dashboard to go live.
        </div>
      )}

      <Link
        href={`/practitioners/${practitioner.profile_id}`}
        className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        ← Back to {practitioner.display_name}&apos;s profile
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <h1 className="min-w-0 break-words font-heading text-2xl font-semibold text-foreground">
          {service.title}
        </h1>
        {color && (
          <Badge
            variant="outline"
            className="shrink-0 border-transparent"
            style={{ backgroundColor: color.bg, color: color.text }}
          >
            {service.specialties!.name}
          </Badge>
        )}
      </div>

      <p className="mt-1 text-sm text-muted-foreground">
        {service.duration_minutes} min · <span className="font-medium text-success">${service.price_usd}</span>
      </p>

      {service.description && (
        <p className="mt-6 leading-relaxed text-foreground break-words">{service.description}</p>
      )}

      <Link
        href={`/practitioners/${practitioner.profile_id}`}
        className="mt-10 flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:border-foreground"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary">
          {practitioner.photo_url ? (
            <Image
              src={practitioner.photo_url}
              alt=""
              width={48}
              height={48}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <span className="text-xs text-muted-foreground">No photo</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{practitioner.display_name}</p>
          <p className="text-sm text-muted-foreground">
            {practitioner.avg_rating ? (
              <>
                <span className="text-accent">★</span> {practitioner.avg_rating.toFixed(1)} (
                {practitioner.review_count} reviews)
              </>
            ) : (
              "New practitioner"
            )}
          </p>
        </div>
      </Link>

      {user?.id === practitioner.profile_id ? null : practitioner.stripe_connect_onboarded ? (
        <div className="mt-10">
          <h2 className="font-heading text-xl font-semibold text-foreground">Choose a time</h2>
          <div className="mt-4">
            <SlotPicker
              practitionerId={practitioner.profile_id}
              serviceId={service.id}
              isLoggedIn={Boolean(user)}
            />
          </div>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          Booking opens once this practitioner finishes setting up payouts — check back soon.
        </p>
      )}
    </div>
  );
}
