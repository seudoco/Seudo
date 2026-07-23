import { CheckIcon, XIcon } from "lucide-react";

/** Small trailing check/x shown inside a field once it's been touched — the
 * "ticker" glance-feedback the design asked for, so you don't have to submit
 * the form to find out a field is wrong. */
export function FieldValidityIcon({ state }: { state: "valid" | "invalid" | null }) {
  if (!state) return null;
  return (
    <span
      className={
        "pointer-events-none absolute inset-y-0 right-2.5 flex items-center " +
        (state === "valid" ? "text-success" : "text-destructive")
      }
    >
      {state === "valid" ? <CheckIcon className="size-4" /> : <XIcon className="size-4" />}
    </span>
  );
}

export function fieldBorderClassName(state: "valid" | "invalid" | null): string {
  if (state === "valid") return "border-success focus-visible:border-success focus-visible:ring-success/30 pr-8";
  if (state === "invalid")
    return "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30 pr-8";
  return "";
}
