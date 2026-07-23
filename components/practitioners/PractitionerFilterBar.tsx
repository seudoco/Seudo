"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { specialtyColor } from "@/lib/specialty-colors";

export function PractitionerFilterBar({ specialtyNames }: { specialtyNames: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setParams = useCallback(
    (updates: Record<string, string | null>, resetPage = true) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      if (resetPage) next.delete("page");
      router.push(`${pathname}?${next.toString()}`);
    },
    [router, pathname, searchParams]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (q !== (searchParams.get("q") ?? "")) setParams({ q: q || null });
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const activeSpecialty = searchParams.get("specialty");
  const sort = searchParams.get("sort");

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, location, or specialty…"
          className="max-w-xs"
        />

        <select
          value={sort ?? ""}
          onChange={(e) => setParams({ sort: e.target.value || null })}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm cursor-pointer"
        >
          <option value="">Top rated</option>
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {specialtyNames.map((name) => {
          const color = specialtyColor(name);
          const active = activeSpecialty === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => setParams({ specialty: active ? null : name })}
              className="cursor-pointer"
            >
              <Badge
                variant="outline"
                className={`border-transparent transition-transform ${active ? "scale-105 ring-2 ring-offset-1" : "opacity-70 hover:opacity-100"}`}
                style={{
                  backgroundColor: color.bg,
                  color: color.text,
                  ["--tw-ring-color" as string]: color.text,
                }}
              >
                {name}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
}
