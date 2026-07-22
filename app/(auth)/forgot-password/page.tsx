"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction, type ActionState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    requestPasswordResetAction,
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold text-foreground">Reset your password</h1>
      <p className="text-sm text-muted-foreground">
        Enter the email you signed up with and we&apos;ll send you a reset link.
      </p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      {state && "error" in state && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state && "success" in state && (
        <p className="text-sm text-foreground" role="status">
          {state.success}
        </p>
      )}

      <Button type="submit" disabled={pending} className="mt-2 cursor-pointer">
        {pending ? "Sending…" : "Send reset link"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Back to log in
        </Link>
      </p>
    </form>
  );
}
