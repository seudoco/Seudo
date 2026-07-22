"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Block {
  id: string;
  blocked_date: string;
}

export function BlockedDatesManager({ initialBlocks }: { initialBlocks: Block[] }) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [newDate, setNewDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function addBlock() {
    if (!newDate) return;
    setError(null);
    const res = await fetch("/api/practitioner/availability/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocked_date: newDate }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Couldn't block that date");
      return;
    }
    setBlocks((b) => [...b, data].sort((x, y) => x.blocked_date.localeCompare(y.blocked_date)));
    setNewDate("");
  }

  async function removeBlock(blocked_date: string) {
    const res = await fetch("/api/practitioner/availability/blocks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocked_date }),
    });
    if (res.ok) setBlocks((b) => b.filter((x) => x.blocked_date !== blocked_date));
  }

  return (
    <div className="mt-4 flex max-w-xl flex-col gap-3">
      <div className="flex items-center gap-2">
        <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-48" />
        <Button size="sm" variant="outline" className="cursor-pointer" onClick={addBlock}>
          Block date
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {blocks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No blocked dates.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {blocks.map((b) => (
            <li key={b.id} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{b.blocked_date}</span>
              <button
                type="button"
                onClick={() => removeBlock(b.blocked_date)}
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
