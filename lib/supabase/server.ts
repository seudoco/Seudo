import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Session-bound server client — RLS applies as the calling user. Use in
 * Server Components, Route Handlers, and Server Actions.
 *
 * `setAll` is wrapped in try/catch because Server Components can only read
 * cookies, not write them — that's expected and safe here, since proxy.ts
 * (see app/proxy.ts) is what actually refreshes the session cookie on every
 * request. A write attempted from a Server Component is a no-op, not a bug.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — session refresh happens in
            // proxy.ts instead.
          }
        },
      },
    }
  );
}
