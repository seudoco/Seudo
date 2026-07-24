"use client";

import { useState } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";

export function CheckoutForm({ bookingId }: { bookingId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/booking-confirmation/${bookingId}`,
      },
    });

    // Only reachable if confirmation fails immediately (e.g. declined card)
    // or doesn't require a redirect — a successful redirect-based method
    // navigates away before this line runs.
    if (confirmError) {
      setError(confirmError.message ?? "Payment failed — try a different card.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PaymentElement />
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={!stripe || submitting} className="cursor-pointer">
        {submitting ? "Processing…" : "Pay now"}
      </Button>
    </form>
  );
}
