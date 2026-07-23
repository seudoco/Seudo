import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

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
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        Seudo
      </h1>
      <p className="mt-4 max-w-md text-balance text-muted-foreground">
        The home for spiritual practitioners online. Book live sessions with vetted tarot
        readers, astrologers, healers, and coaches.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/login">
          <Button className="cursor-pointer">Log in</Button>
        </Link>
        <Link href="/signup">
          <Button variant="outline" className="cursor-pointer">
            Sign up
          </Button>
        </Link>
      </div>
    </div>
  );
}
