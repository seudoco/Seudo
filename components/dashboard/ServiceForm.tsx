"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FieldValidityIcon, fieldBorderClassName } from "@/components/ui/field-validity-icon";
import { specialtyColor } from "@/lib/specialty-colors";

const DURATIONS = [15, 30, 45, 60, 90] as const;

export interface ServiceFormValues {
  title: string;
  description: string;
  duration_minutes: (typeof DURATIONS)[number];
  price_usd: number;
  specialty_id: number | null;
}

export function ServiceForm({
  initial,
  allSpecialties,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial: ServiceFormValues;
  allSpecialties: { id: number; name: string }[];
  onSubmit: (values: ServiceFormValues) => Promise<string | null>;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleState, setTitleState] = useState<"valid" | "invalid" | null>(null);
  const [priceState, setPriceState] = useState<"valid" | "invalid" | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const err = await onSubmit(values);
    setSaving(false);
    if (err) setError(err);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-border p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="service_title">Title</Label>
        <div className="relative">
          <Input
            id="service_title"
            value={values.title}
            className={fieldBorderClassName(titleState)}
            onChange={(e) => {
              setValues((v) => ({ ...v, title: e.target.value }));
              if (titleState === "invalid" && e.target.value.trim()) setTitleState("valid");
            }}
            onBlur={(e) => setTitleState(e.target.value.trim() ? "valid" : "invalid")}
            placeholder="30-minute Tarot Reading"
            required
          />
          <FieldValidityIcon state={titleState} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Specialty</Label>
        <div className="flex flex-wrap gap-1.5">
          {allSpecialties.map((s) => {
            const color = specialtyColor(s.name);
            const active = values.specialty_id === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setValues((v) => ({ ...v, specialty_id: active ? null : s.id }))}
                className="cursor-pointer"
              >
                <Badge
                  variant="outline"
                  className={`border-transparent transition-transform ${active ? "scale-105 ring-2 ring-offset-1" : "opacity-60 hover:opacity-100"}`}
                  style={{
                    backgroundColor: color.bg,
                    color: color.text,
                    ["--tw-ring-color" as string]: color.text,
                  }}
                >
                  {s.name}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="service_description">Description</Label>
        <Textarea
          id="service_description"
          rows={3}
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="service_duration">Duration</Label>
          <select
            id="service_duration"
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={values.duration_minutes}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                duration_minutes: Number(e.target.value) as ServiceFormValues["duration_minutes"],
              }))
            }
          >
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d} minutes
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="service_price">Price (USD)</Label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
              $
            </span>
            <Input
              id="service_price"
              type="number"
              min={1}
              step="0.01"
              value={values.price_usd}
              className={`pl-5 ${fieldBorderClassName(priceState)}`}
              onChange={(e) => {
                const next = Number(e.target.value);
                setValues((v) => ({ ...v, price_usd: next }));
                if (priceState === "invalid" && next > 0) setPriceState("valid");
              }}
              onBlur={(e) => setPriceState(Number(e.target.value) > 0 ? "valid" : "invalid")}
              required
            />
            <FieldValidityIcon state={priceState} />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving} className="cursor-pointer">
          {saving ? "Saving…" : submitLabel}
        </Button>
        <Button type="button" size="sm" variant="outline" className="cursor-pointer" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
