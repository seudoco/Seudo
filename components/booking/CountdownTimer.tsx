"use client";

import { useEffect, useState } from "react";

/** Shows the soft-lock (pending_expires_at) countdown on the checkout page —
 * calls onExpire once, when it crosses zero, so the page can react (e.g.
 * show an "expired, pick another time" message). */
export function CountdownTimer({ expiresAt, onExpire }: { expiresAt: string; onExpire: () => void }) {
  const [remainingMs, setRemainingMs] = useState(() => new Date(expiresAt).getTime() - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const next = new Date(expiresAt).getTime() - Date.now();
      setRemainingMs(next);
      if (next <= 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <p className={`text-sm ${totalSeconds < 60 ? "text-destructive" : "text-muted-foreground"}`}>
      Slot held for {minutes}:{String(seconds).padStart(2, "0")}
    </p>
  );
}
