import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

// Shared header for the public-facing surface ("/", "/practitioners",
// "/practitioners/[id]") — separate from dashboard/layout.tsx's header since
// dashboard has its own nav (Profile/Services/Availability) and a practitioner
// is always authenticated there. This one has to work for signed-out
// visitors too: Log in/Sign up when logged out, a way back to the dashboard
// and to log out when logged in.
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Link href="/" className="font-heading text-lg font-semibold tracking-tight">
          Seudo
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/practitioners" className="text-sm text-muted-foreground hover:text-foreground">
            Browse practitioners
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
                Dashboard
              </Link>
              <form action={signOutAction}>
                <Button type="submit" variant="outline" size="sm" className="cursor-pointer">
                  Log out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="outline" size="sm" className="cursor-pointer">
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="cursor-pointer">
                  Sign up
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
