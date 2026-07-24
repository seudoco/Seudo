"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Slot {
  start: string;
  end: string;
}

// Explicit "en-US" rather than the viewer's system locale — the rest of the
// UI is English-only, so a Danish/German/etc. system locale silently
// switching just this one label reads as a bug, not a nicety.
function dayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function timeLabel(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function SlotPicker({
  practitionerId,
  serviceId,
  isLoggedIn,
}: {
  practitionerId: string;
  serviceId: string;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    fetch(`/api/practitioners/${practitionerId}/slots?serviceId=${serviceId}`)
      .then((res) => res.json())
      .then((data) => setSlots(data.slots ?? []))
      .catch(() => setSlots([]));
  }, [practitionerId, serviceId]);

  const byDay = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const slot of slots ?? []) {
      const key = new Date(slot.start).toDateString();
      const list = map.get(key) ?? [];
      list.push(slot);
      map.set(key, list);
    }
    return map;
  }, [slots]);

  const days = [...byDay.keys()];

  async function handleBook() {
    if (!selectedSlot) return;
    setBooking(true);
    setMessage(null);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        practitioner_id: practitionerId,
        service_id: serviceId,
        scheduled_start: selectedSlot.start,
      }),
    });
    const data = await res.json();
    setBooking(false);
    if (!res.ok) {
      setMessage({ type: "error", text: data.error ?? "Couldn't book that slot" });
      // A 409 means someone else just took it — refresh the slot list so
      // it's not still shown as available.
      if (res.status === 409) {
        fetch(`/api/practitioners/${practitionerId}/slots?serviceId=${serviceId}`)
          .then((r) => r.json())
          .then((d) => setSlots(d.slots ?? []));
        setSelectedSlot(null);
      }
      return;
    }
    router.push(`/checkout/${data.booking_id}`);
  }

  if (slots === null) {
    return <p className="mt-2 text-sm text-muted-foreground">Loading availability…</p>;
  }
  if (slots.length === 0) {
    return <p className="mt-2 text-sm text-muted-foreground">No open times in the next 8 weeks.</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {days.map((day) => {
          const active = day === selectedDay;
          return (
            <button
              key={day}
              type="button"
              onClick={() => {
                setSelectedDay(day);
                setSelectedSlot(null);
              }}
              className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                active ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:border-foreground"
              }`}
            >
              {dayLabel(new Date(day))}
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {byDay.get(selectedDay)!.map((slot) => {
            const active = selectedSlot?.start === slot.start;
            return (
              <button
                key={slot.start}
                type="button"
                onClick={() => setSelectedSlot(slot)}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  active ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:border-foreground"
                }`}
              >
                {timeLabel(new Date(slot.start))}
              </button>
            );
          })}
        </div>
      )}

      {selectedSlot &&
        (isLoggedIn ? (
          <Button onClick={handleBook} disabled={booking} className="mt-4 cursor-pointer">
            {booking ? "Booking…" : `Request ${dayLabel(new Date(selectedSlot.start))} at ${timeLabel(new Date(selectedSlot.start))}`}
          </Button>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            <a href="/login" className="font-medium text-foreground underline underline-offset-4">
              Log in
            </a>{" "}
            to book this session.
          </p>
        ))}

      {message && (
        <p
          className={`mt-3 text-sm ${message.type === "error" ? "text-destructive" : "text-success"}`}
          role={message.type === "error" ? "alert" : "status"}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
