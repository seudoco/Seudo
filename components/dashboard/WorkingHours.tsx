"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]; // Sunday...Saturday, matches generateSlots' convention

interface TemplateRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

// A practitioner is available every day at all times by default. This
// control writes ONE start/end range applied to all 7 days (rather than the
// old per-day opt-in grid) — narrow it if you don't want to be bookable
// around the clock. Specific exceptions (a day off, a lunch break) are
// handled separately via date/time blocking below this component.
export function WorkingHours({ initialRows }: { initialRows: TemplateRow[] }) {
  const existing = initialRows[0];
  const [startTime, setStartTime] = useState(existing?.start_time.slice(0, 5) ?? "00:00");
  const [endTime, setEndTime] = useState(existing?.end_time.slice(0, 5) ?? "23:59");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function handleSave() {
    if (endTime <= startTime) {
      setMessage({ type: "error", text: "End time must be after start time." });
      return;
    }
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/practitioner/availability/template", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: ALL_DAYS.map((day_of_week) => ({ day_of_week, start_time: startTime, end_time: endTime })),
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setMessage({ type: "error", text: data.error ?? "Couldn't save your working hours" });
      return;
    }
    setMessage({ type: "success", text: "Working hours saved — you're bookable every day in this range." });
  }

  return (
    <div className="mt-6 flex max-w-xl flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        You&apos;re available every day of the week during these hours. Block off specific dates or
        times below for exceptions.
      </p>
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="working_hours_start">From</Label>
          <Input
            id="working_hours_start"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-32"
          />
        </div>
        <span className="mt-6 text-sm text-muted-foreground">to</span>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="working_hours_end">To</Label>
          <Input
            id="working_hours_end"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-32"
          />
        </div>
      </div>

      {message && (
        <p
          className={message.type === "error" ? "text-sm text-destructive" : "text-sm font-medium text-success"}
          role={message.type === "error" ? "alert" : "status"}
        >
          {message.text}
        </p>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-fit cursor-pointer">
        {saving ? "Saving…" : "Save working hours"}
      </Button>
    </div>
  );
}
