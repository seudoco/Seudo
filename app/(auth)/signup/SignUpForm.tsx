"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAction, type ActionState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserRole } from "@/types/database";

export function SignUpForm({ role }: { role: UserRole }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    signUpAction,
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="role" value={role} />

      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {role === "client" ? "Create your client account" : "Create your practitioner account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <Link href="/signup" className="underline underline-offset-4">
            Not {role === "client" ? "a client" : "a practitioner"}?
          </Link>
        </p>
      </div>

      <Field label="Full name" name="full_name" type="text" autoComplete="name" required />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        helperText="At least 8 characters."
      />
      <Field
        label="Phone"
        name="phone"
        type="tel"
        autoComplete="tel"
        helperText="Not shared publicly. Used for booking reminders in a future update."
      />
      <Field
        label="Date of birth"
        name="date_of_birth"
        type="date"
        autoComplete="bday"
        required
        helperText="Used to personalise your experience. You must be 18 or older."
      />
      <Field label="Country" name="country" type="text" autoComplete="country-name" required />

      <div className="flex items-start gap-2 pt-2">
        <input
          id="consent_accepted"
          name="consent_accepted"
          type="checkbox"
          required
          className="mt-0.5 h-4 w-4 rounded border-border"
        />
        <Label htmlFor="consent_accepted" className="text-sm font-normal text-muted-foreground">
          I agree to Seudo&apos;s{" "}
          <Link href="/legal/terms" className="underline underline-offset-4" target="_blank">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="underline underline-offset-4" target="_blank">
            Privacy Policy
          </Link>
          .
        </Label>
      </div>

      {state && "error" in state && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="mt-2 cursor-pointer">
        {pending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Log in
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
  required,
  helperText,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete?: string;
  required?: boolean;
  helperText?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
      />
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
}
