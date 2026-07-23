"use client";

import { useState } from "react";
import { StripeConnectOnboardingWidget } from "./StripeConnectOnboardingWidget";

export function PayoutsPanel({ initiallyOnboarded }: { initiallyOnboarded: boolean }) {
  const [onboarded, setOnboarded] = useState(initiallyOnboarded);
  const [checking, setChecking] = useState(false);

  async function refreshStatus() {
    setChecking(true);
    try {
      const res = await fetch("/api/stripe/connect/status");
      const data = await res.json();
      setOnboarded(Boolean(data.onboarded));
    } finally {
      setChecking(false);
    }
  }

  if (onboarded) {
    return (
      <div className="mt-6 rounded-xl border border-success/30 bg-success/5 p-4">
        <p className="text-sm font-medium text-success">Payouts are set up — you can now receive bookings.</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <StripeConnectOnboardingWidget onOnboarded={refreshStatus} />
      {checking && <p className="mt-2 text-sm text-muted-foreground">Checking status…</p>}
    </div>
  );
}
