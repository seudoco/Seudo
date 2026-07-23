import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { specialtyColor } from "@/lib/specialty-colors";

const FEATURED_SPECIALTIES = ["Tarot", "Astrology", "Reiki", "Spiritual Coaching"];

// Logged-in visitors skip the marketing pitch entirely and land on the
// browse page — clicking the logo should feel like "go look around the
// site", not "see the pitch you already signed up from".
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/practitioners");

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">
      {/* Soft multi-hue wash behind the hero — the "more exciting, still premium"
          fix: a faint aurora of the same jewel tones used for specialty badges,
          not a flat monochrome background. Purely decorative, aria-hidden. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.16]"
        style={{
          background:
            "radial-gradient(38rem 24rem at 18% 15%, #6D28D9, transparent 60%)," +
            "radial-gradient(34rem 22rem at 85% 20%, #0369A1, transparent 60%)," +
            "radial-gradient(40rem 26rem at 50% 95%, #B45309, transparent 60%)",
        }}
      />

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="font-heading text-5xl font-semibold tracking-tight text-foreground sm:text-7xl">
          Seudo
        </h1>
        <p className="mx-auto mt-4 max-w-md text-balance text-lg text-muted-foreground">
          The home for spiritual practitioners online. Book live sessions with vetted tarot
          readers, astrologers, healers, and coaches.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/login">
            <Button className="cursor-pointer">Log in</Button>
          </Link>
          <Link href="/signup">
            <Button variant="outline" className="cursor-pointer">
              Sign up
            </Button>
          </Link>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {FEATURED_SPECIALTIES.map((name) => {
            const color = specialtyColor(name);
            return (
              <Link key={name} href="/practitioners">
                <Badge
                  variant="outline"
                  className="cursor-pointer border-transparent px-3 py-1 text-sm transition-transform hover:scale-105"
                  style={{ backgroundColor: color.bg, color: color.text }}
                >
                  {name}
                </Badge>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
