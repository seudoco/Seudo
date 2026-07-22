import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        Seudo
      </h1>
      <p className="mt-4 max-w-md text-balance text-muted-foreground">
        The home for spiritual practitioners online. Book live sessions with vetted tarot
        readers, astrologers, healers, and coaches.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/signup?role=client">
          <Button className="cursor-pointer">Find a practitioner</Button>
        </Link>
        <Link href="/signup?role=practitioner">
          <Button variant="outline" className="cursor-pointer">
            List your services
          </Button>
        </Link>
      </div>
    </main>
  );
}
