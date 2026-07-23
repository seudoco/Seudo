import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { specialtyColor } from "@/lib/specialty-colors";

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
  const topColor = practitioner.specialtyNames[0] ? specialtyColor(practitioner.specialtyNames[0]) : null;

  return (
    <Link
      href={`/practitioners/${practitioner.profile_id}`}
      className="group flex flex-col gap-3 rounded-xl border border-border p-4 transition-all hover:-translate-y-0.5 hover:border-foreground hover:shadow-lg"
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary ring-2 ring-offset-2 ring-offset-background transition-transform group-hover:scale-105"
          style={{ ["--tw-ring-color" as string]: topColor?.text ?? "var(--border)" }}
        >
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
          {practitioner.specialtyNames.slice(0, 3).map((name) => {
            const color = specialtyColor(name);
            return (
              <Badge
                key={name}
                variant="outline"
                className="border-transparent"
                style={{ backgroundColor: color.bg, color: color.text }}
              >
                {name}
              </Badge>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
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
        {practitioner.startingPrice !== null && (
          <span className="font-medium text-success">from ${practitioner.startingPrice}</span>
        )}
      </div>
    </Link>
  );
}
