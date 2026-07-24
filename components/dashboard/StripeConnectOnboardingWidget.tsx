"use client";

import { useEffect, useState } from "react";
import { loadConnectAndInitialize, type StripeConnectInstance } from "@stripe/connect-js";
import { ConnectComponentsProvider, ConnectAccountOnboarding } from "@stripe/react-connect-js";

async function fetchClientSecret(): Promise<string> {
  const res = await fetch("/api/stripe/connect/onboarding-link", { method: "POST" });
  if (!res.ok) throw new Error("Couldn't start payout setup");
  const data = await res.json();
  return data.client_secret;
}

// Embedded on seudo.co itself (never a redirect to a Stripe-hosted page) —
// this is the Stripe Connect "embedded components" pattern, replacing the
// older hosted Account Link onboarding flow.
export function StripeConnectOnboardingWidget({ onOnboarded }: { onOnboarded: () => void }) {
  const [instance, setInstance] = useState<StripeConnectInstance | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const connectInstance = loadConnectAndInitialize({
        publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
        fetchClientSecret,
        locale: "en",
        appearance: {
          variables: {
            colorPrimary: "#171717",
            fontFamily: "Inter, sans-serif",
            borderRadius: "12px",
          },
        },
      });
      setInstance(connectInstance);
    } catch {
      setError("Couldn't load payout setup. Try refreshing the page.");
    }
  }, []);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!instance) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <ConnectComponentsProvider connectInstance={instance}>
      <ConnectAccountOnboarding onExit={onOnboarded} />
    </ConnectComponentsProvider>
  );
}
