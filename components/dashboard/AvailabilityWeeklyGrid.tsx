"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

// 0=Sunday...6=Saturday — matches lib/availability/generateSlots.ts and the
// day_of_week check constraint in supabase/migrations/0001_init.sql.
const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface TemplateRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface DayState {
  enabled: boolean;
  start_time: string;
  end_time: string;
}

function buildInitialState(rows: TemplateRow[]): DayState[] {
  return DAY_LABELS.map((_, day) => {
    // UI supports one window per day (covers the common case) even though
    // the schema/API allow more — if multiple rows exist for a day, this
    // just shows the first and saving will collapse to it.
    const row = rows.find((r) => r.day_of_week === day);
    return row
      ? { enabled: true, start_time: row.start_time.slice(0, 5), end_time: row.end_time.slice(0, 5) }
      : { enabled: false, start_time: "09:00", end_time: "17:00" };
  });
}

export function AvailabilityWeeklyGrid({ initialRows }: { initialRows: TemplateRow[] }) {
  const [days, setDays] = useState<DayState[]>(() => buildInitialState(initialRows));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  function updateDay(index: number, patch: Partial<DayState>) {
    setDays((d) => d.map((day, i) => (i === index ? { ...day, ...patch } : day)));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    const rows = days
      .map((d, day_of_week) => ({ ...d, day_of_week }))
      .filter((d) => d.enabled);

    const invalid = rows.find((r) => r.end_time <= r.start_time);
    if (invalid) {
      setSaving(false);
      setMessage({ type: "error", text: `${DAY_LABELS[invalid.day_of_week]}: end time must be after start time.` });
      return;
    }

    const res = await fetch("/api/practitioner/availability/template", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: rows.map(({ day_of_week, start_time, end_time }) => ({ day_of_week, start_time, end_time })),
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setMessage({ type: "error", text: data.error ?? "Couldn't save availability" });
      return;
    }
    setMessage({ type: "success", text: "Availability saved." });
  }

  return (
    <div className="mt-6 flex max-w-xl flex-col gap-3">
      {days.map((day, index) => (
        <div key={index} className="flex items-center gap-4">
          <label className="flex w-32 shrink-0 items-center gap-2 text-sm text-foreground">
            <Checkbox
              checked={day.enabled}
              onCheckedChange={(checked) => updateDay(index, { enabled: checked === true })}
            />
            {DAY_LABELS[index]}
          </label>
          {day.enabled ? (
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={day.start_time}
                onChange={(e) => updateDay(index, { start_time: e.target.value })}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="time"
                value={day.end_time}
                onChange={(e) => updateDay(index, { end_time: e.target.value })}
                className="w-32"
              />
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Unavailable</span>
          )}
        </div>
      ))}

      {message && (
        <p
          className={message.type === "error" ? "text-sm text-destructive" : "text-sm text-foreground"}
          role={message.type === "error" ? "alert" : "status"}
        >
          {message.text}
        </p>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-fit cursor-pointer">
        {saving ? "Saving…" : "Save weekly hours"}
      </Button>
    </div>
  );
}
