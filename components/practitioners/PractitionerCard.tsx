import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export interface PractitionerCardData {
  profile_id: string;
  display_name: string | null;
  photo_url: string | null;
  city: string | null;
  country: string | null;
  avg_rating: number | null;
  review_count: number;
  specialtyNames: string[];
  startingPrice: number | null;
}

export function PractitionerCard({ practitioner }: { practitioner: PractitionerCardData }) {
  return (
    <Link
      href={`/practitioners/${practitioner.profile_id}`}
      className="flex flex-col gap-3 rounded-xl border border-border p-4 transition-all hover:-translate-y-0.5 hover:border-foreground hover:shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary">
          {practitioner.photo_url ? (
            <Image
              src={practitioner.photo_url}
              alt=""
              width={56}
              height={56}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <span className="text-xs text-muted-foreground">No photo</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{practitioner.display_name}</p>
          {(practitioner.city || practitioner.country) && (
            <p className="truncate text-sm text-muted-foreground">
              {[practitioner.city, practitioner.country].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      </div>

      {practitioner.specialtyNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {practitioner.specialtyNames.slice(0, 3).map((name) => (
            <Badge key={name} variant="secondary">
              {name}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {practitioner.avg_rating
            ? `★ ${practitioner.avg_rating.toFixed(1)} (${practitioner.review_count})`
            : "New"}
        </span>
        {practitioner.startingPrice !== null && (
          <span className="font-medium text-success">from ${practitioner.startingPrice}</span>
        )}
      </div>
    </Link>
  );
}
