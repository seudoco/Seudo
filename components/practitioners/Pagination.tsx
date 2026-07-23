import Link from "next/link";

/** Server-renderable — builds plain hrefs rather than a client router push,
 * since page navigation here doesn't need to preserve any local UI state. */
export function Pagination({
  page,
  pageSize,
  total,
  searchParams,
}: {
  page: number;
  pageSize: number;
  total: number;
  searchParams: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  function hrefFor(targetPage: number) {
    const params = new URLSearchParams(
      Object.entries(searchParams).filter((entry): entry is [string, string] => Boolean(entry[1]))
    );
    if (targetPage <= 1) params.delete("page");
    else params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/practitioners?${qs}` : "/practitioners";
  }

  return (
    <nav className="mt-10 flex items-center justify-center gap-2 text-sm">
      <Link
        href={hrefFor(page - 1)}
        aria-disabled={page <= 1}
        className={`rounded-lg border border-border px-3 py-1.5 ${
          page <= 1 ? "pointer-events-none opacity-40" : "hover:border-foreground"
        }`}
      >
        Previous
      </Link>
      <span className="text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Link
        href={hrefFor(page + 1)}
        aria-disabled={page >= totalPages}
        className={`rounded-lg border border-border px-3 py-1.5 ${
          page >= totalPages ? "pointer-events-none opacity-40" : "hover:border-foreground"
        }`}
      >
        Next
      </Link>
    </nav>
  );
}
