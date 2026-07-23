import Image from "next/image";
import Link from "next/link";
import type { ServiceListRow } from "@/lib/practitioners/search";

export function ServiceListingCard({ service }: { service: ServiceListRow }) {
  const practitioner = service.practitioner_profiles;

  return (
    <Link
      href={`/practitioners/${service.practitioner_id}`}
      className="flex items-center gap-4 rounded-xl border border-border p-4 transition-all hover:-translate-y-0.5 hover:border-foreground hover:shadow-lg"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary">
        {practitioner?.photo_url ? (
          <Image
            src={practitioner.photo_url}
            alt=""
            width={48}
            height={48}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : (
          <span className="text-[10px] text-muted-foreground">No photo</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{service.title}</p>
        <p className="truncate text-sm text-muted-foreground">by {practitioner?.display_name}</p>
      </div>
      <div className="shrink-0 text-right text-sm">
        <p className="font-medium text-success">${service.price_usd}</p>
        <p className="text-muted-foreground">{service.duration_minutes} min</p>
      </div>
    </Link>
  );
}
