import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { specialtyColor } from "@/lib/specialty-colors";
import type { ServiceCardData } from "@/lib/practitioners/search";

export function ServiceListingCard({ service }: { service: ServiceCardData }) {
  const practitioner = service.practitioner_profiles;
  const specialtyName = service.specialties?.name;

  return (
    <Link
      href={`/practitioners/${practitioner.profile_id}#service-${service.id}`}
      className="flex flex-col gap-2 rounded-xl border border-border p-4 transition-all hover:-translate-y-0.5 hover:border-foreground hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 break-words font-medium text-foreground">{service.title}</p>
        {specialtyName && (
          <Badge
            variant="outline"
            className="shrink-0 border-transparent"
            style={{ backgroundColor: specialtyColor(specialtyName).bg, color: specialtyColor(specialtyName).text }}
          >
            {specialtyName}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary">
          {practitioner.photo_url ? (
            <Image
              src={practitioner.photo_url}
              alt=""
              width={24}
              height={24}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : null}
        </div>
        <span className="truncate text-xs text-muted-foreground">{practitioner.display_name}</span>
      </div>

      {service.description && (
        <p className="line-clamp-2 text-sm text-muted-foreground">{service.description}</p>
      )}

      <div className="mt-1 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {practitioner.avg_rating ? (
            <>
              <span className="text-accent">★</span> {practitioner.avg_rating.toFixed(1)} (
              {practitioner.review_count})
            </>
          ) : (
            "New"
          )}
        </span>
        <span className="text-muted-foreground">
          {service.duration_minutes} min ·{" "}
          <span className="font-medium text-success">${service.price_usd}</span>
        </span>
      </div>
    </Link>
  );
}
