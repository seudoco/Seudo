"use client";

interface DayEarning {
  date: string; // "YYYY-MM-DD"
  amount: number;
}

/** A single-series daily earnings bar chart — thin bars, rounded tops,
 * native-title hover for the exact value (lightweight but real per-bar
 * interaction), recessive baseline, no axis clutter. One brand hue
 * (--success) at full value, faded for zero days rather than omitted, so
 * the calendar shape of the month stays legible. */
export function EarningsChart({ days }: { days: DayEarning[] }) {
  const max = Math.max(1, ...days.map((d) => d.amount));

  return (
    <div className="flex h-24 items-end gap-[3px]">
      {days.map((d) => {
        const heightPct = Math.max(4, (d.amount / max) * 100);
        const label = new Date(d.date + "T00:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        return (
          <div
            key={d.date}
            title={`${label}: $${d.amount.toFixed(2)}`}
            className={`flex-1 rounded-t-sm transition-opacity hover:opacity-80 ${
              d.amount > 0 ? "bg-success" : "bg-success/15"
            }`}
            style={{ height: `${heightPct}%` }}
          />
        );
      })}
    </div>
  );
}
