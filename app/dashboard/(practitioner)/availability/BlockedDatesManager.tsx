"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface Block {
  id: string;
  blocked_date: string;
  start_time: string | null;
  end_time: string | null;
}

export function BlockedDatesManager({ initialBlocks }: { initialBlocks: Block[] }) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [newDate, setNewDate] = useState("");
  const [wholeDay, setWholeDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [error, setError] = useState<string | null>(null);

  async function addBlock() {
    if (!newDate) return;
    setError(null);
    const res = await fetch("/api/practitioner/availability/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blocked_date: newDate,
        start_time: wholeDay ? null : startTime,
        end_time: wholeDay ? null : endTime,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Couldn't add that block");
      return;
    }
    setBlocks((b) =>
      [...b, data].sort(
        (x, y) => x.blocked_date.localeCompare(y.blocked_date) || (x.start_time ?? "").localeCompare(y.start_time ?? "")
      )
    );
    setNewDate("");
  }

  async function removeBlock(id: string) {
    const res = await fetch("/api/practitioner/availability/blocks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setBlocks((b) => b.filter((x) => x.id !== id));
  }

  return (
    <div className="mt-4 flex max-w-xl flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="block_date" className="text-xs text-muted-foreground">
            Date
          </label>
          <Input id="block_date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-40" />
        </div>

        {!wholeDay && (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="block_start" className="text-xs text-muted-foreground">
                From
              </label>
              <Input
                id="block_start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-28"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="block_end" className="text-xs text-muted-foreground">
                To
              </label>
              <Input
                id="block_end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-28"
              />
            </div>
          </>
        )}

        <Button size="sm" variant="outline" className="cursor-pointer" onClick={addBlock}>
          Add block
        </Button>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <Checkbox checked={wholeDay} onCheckedChange={(checked) => setWholeDay(checked === true)} />
        Block the whole day
      </label>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {blocks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No blocked dates or times.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {blocks.map((b) => (
            <li key={b.id} className="flex items-center justify-between text-sm">
              <span className="text-foreground">
                {b.blocked_date}
                {b.start_time && b.end_time
                  ? ` · ${b.start_time.slice(0, 5)}–${b.end_time.slice(0, 5)}`
                  : " · whole day"}
              </span>
              <button
                type="button"
                onClick={() => removeBlock(b.id)}
                className="cursor-pointer text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
