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
      <p className="mt-8 text-sm text-muted-foreground">
        <span className="font-medium text-success">Payouts connected.</span> You&apos;re all set to get paid for
        your sessions.
      </p>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-border p-8 text-center">
      <p className="text-lg font-medium text-foreground">Get paid for your sessions</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Add your payout details so clients can book you and money lands straight in your account after each
        session.
      </p>
      <div className="mt-6">
        <StripeConnectOnboardingWidget onOnboarded={refreshStatus} />
      </div>
      {checking && <p className="mt-2 text-sm text-muted-foreground">Checking status…</p>}
    </div>
  );
}
