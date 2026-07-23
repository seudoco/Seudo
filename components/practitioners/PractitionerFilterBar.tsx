"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { specialtyColor } from "@/lib/specialty-colors";

const DURATIONS = [15, 30, 45, 60, 90] as const;

export function PractitionerFilterBar({
  specialtyNames,
  view,
}: {
  specialtyNames: string[];
  view: "practitioners" | "services";
}) {
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
      <div className="flex gap-1 rounded-lg border border-border p-1 w-fit">
        {(["practitioners", "services"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setParams({ view: v === "practitioners" ? null : v })}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === v ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {v === "practitioners" ? "Practitioners" : "Services"}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={view === "practitioners" ? "Search practitioners…" : "Search services…"}
          className="max-w-xs"
        />

        <select
          value={sort ?? ""}
          onChange={(e) => setParams({ sort: e.target.value || null })}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm cursor-pointer"
        >
          {view === "practitioners" ? (
            <>
              <option value="">Top rated</option>
              <option value="newest">Newest</option>
            </>
          ) : (
            <>
              <option value="">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="newest">Newest</option>
            </>
          )}
        </select>

        {view === "services" && (
          <>
            <select
              value={searchParams.get("duration") ?? ""}
              onChange={(e) => setParams({ duration: e.target.value || null })}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm cursor-pointer"
            >
              <option value="">Any duration</option>
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d} min
                </option>
              ))}
            </select>
            <Input
              key={`min-${searchParams.get("price_min")}`}
              type="number"
              min={0}
              placeholder="Min $"
              defaultValue={searchParams.get("price_min") ?? ""}
              onBlur={(e) => setParams({ price_min: e.target.value || null })}
              className="w-24"
            />
            <Input
              key={`max-${searchParams.get("price_max")}`}
              type="number"
              min={0}
              placeholder="Max $"
              defaultValue={searchParams.get("price_max") ?? ""}
              onBlur={(e) => setParams({ price_max: e.target.value || null })}
              className="w-24"
            />
          </>
        )}
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
