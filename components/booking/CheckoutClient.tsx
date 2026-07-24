"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { CheckoutForm } from "./CheckoutForm";
import { CountdownTimer } from "./CountdownTimer";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function CheckoutClient({ bookingId }: { bookingId: string }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    fetch(`/api/bookings/${bookingId}/client-secret`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Couldn't load checkout");
        setClientSecret(data.client_secret);
        setExpiresAt(data.pending_expires_at);
      })
      .catch((err) => setError(err.message));
  }, [bookingId]);

  if (expired) {
    return (
      <p className="text-sm text-destructive" role="alert">
        This hold on your slot has expired. Go back and pick a time again.
      </p>
    );
  }
  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }
  if (!clientSecret) {
    return <p className="text-sm text-muted-foreground">Loading checkout…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {expiresAt && <CountdownTimer expiresAt={expiresAt} onExpire={() => setExpired(true)} />}
      <Elements stripe={stripePromise} options={{ clientSecret, locale: "en", appearance: { theme: "stripe" } }}>
        <CheckoutForm bookingId={bookingId} />
      </Elements>
    </div>
  );
}
