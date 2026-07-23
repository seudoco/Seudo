"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AsyncSearchableSelect, SearchableSelect } from "@/components/ui/searchable-select";
import { MultiSearchableSelect } from "@/components/ui/multi-searchable-select";
import { PhotoCropDialog } from "@/components/dashboard/PhotoCropDialog";
import { FieldValidityIcon, fieldBorderClassName } from "@/components/ui/field-validity-icon";

interface ProfileFormValues {
  display_name: string;
  bio: string;
  city: string;
  country: string;
  languages: string[];
  years_experience: number | null;
  timezone: string;
  photo_url: string | null;
  specialty_ids: number[];
}

export function ProfileForm({
  initial,
  allSpecialties,
  countryOptions,
  languageOptions,
  timezoneOptions,
}: {
  initial: ProfileFormValues;
  allSpecialties: { id: number; name: string }[];
  countryOptions: string[];
  languageOptions: string[];
  timezoneOptions: string[];
}) {
  const [values, setValues] = useState(initial);
  const [photoUrl, setPhotoUrl] = useState(initial.photo_url);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);
  const [displayNameState, setDisplayNameState] = useState<"valid" | "invalid" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const countryRef = useRef(values.country);

  countryRef.current = values.country;

  const fetchCities = useCallback(async (query: string) => {
    const country = countryRef.current;
    if (!country) return [];

    const params = new URLSearchParams({ country, q: query });
    const res = await fetch(`/api/geo/cities?${params.toString()}`);
    if (!res.ok) return [];

    const data = (await res.json()) as { cities?: string[] };
    return data.cities ?? [];
  }, []);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Don't upload yet — open the crop dialog first so a practitioner can
    // resize/reposition (e.g. fit a logo into the circular preview) before
    // anything hits storage. The actual upload happens in handleCropSave.
    const reader = new FileReader();
    reader.onload = () => setPendingImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleCropCancel() {
    setPendingImageSrc(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleCropSave(blob: Blob) {
    setPendingImageSrc(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploadingPhoto(true);
    setMessage(null);
    const formData = new FormData();
    formData.append("file", new File([blob], "photo.jpg", { type: "image/jpeg" }));
    const res = await fetch("/api/practitioner/profile/photo", { method: "POST", body: formData });
    const data = await res.json();
    setUploadingPhoto(false);
    if (!res.ok) {
      setMessage({ type: "error", text: data.error ?? "Photo upload failed" });
      return;
    }
    setPhotoUrl(data.photo_url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/practitioner/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setMessage({ type: "error", text: data.error ?? "Couldn't save your profile" });
      return;
    }
    setMessage({ type: "success", text: "Profile saved." });
  }

  function toggleSpecialty(id: number) {
    setValues((v) => ({
      ...v,
      specialty_ids: v.specialty_ids.includes(id)
        ? v.specialty_ids.filter((s) => s !== id)
        : [...v.specialty_ids, id],
    }));
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex max-w-xl flex-col gap-6">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-secondary">
          {photoUrl ? (
            <Image src={photoUrl} alt="" width={80} height={80} className="h-full w-full object-cover" unoptimized />
          ) : (
            <span className="text-xs text-muted-foreground">No photo</span>
          )}
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            disabled={uploadingPhoto}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadingPhoto ? "Uploading…" : "Change photo"}
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">JPEG, PNG, or WebP. Up to 5MB.</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="display_name">Display name</Label>
        <div className="relative">
          <Input
            id="display_name"
            value={values.display_name}
            className={fieldBorderClassName(displayNameState)}
            onChange={(e) => {
              setValues((v) => ({ ...v, display_name: e.target.value }));
              if (displayNameState === "invalid" && e.target.value.trim()) setDisplayNameState("valid");
            }}
            onBlur={(e) => setDisplayNameState(e.target.value.trim() ? "valid" : "invalid")}
            required
          />
          <FieldValidityIcon state={displayNameState} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          rows={5}
          value={values.bio}
          onChange={(e) => setValues((v) => ({ ...v, bio: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="country">Country</Label>
          <SearchableSelect
            id="country"
            value={values.country}
            onValueChange={(country) =>
              setValues((v) => ({
                ...v,
                country,
                city: country === v.country ? v.city : "",
              }))
            }
            items={countryOptions}
            placeholder="Search countries…"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">City</Label>
          <AsyncSearchableSelect
            id="city"
            value={values.city}
            onValueChange={(city) => setValues((v) => ({ ...v, city }))}
            fetchItems={fetchCities}
            disabled={!values.country}
            placeholder="Search cities…"
            emptyMessage="No cities found"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="languages">Languages</Label>
        <MultiSearchableSelect
          id="languages"
          value={values.languages}
          onValueChange={(languages) => setValues((v) => ({ ...v, languages }))}
          items={languageOptions}
          placeholder="Search languages…"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="years_experience">Years of experience</Label>
          <Input
            id="years_experience"
            type="number"
            min={0}
            max={80}
            value={values.years_experience ?? ""}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                years_experience: e.target.value === "" ? null : Number(e.target.value),
              }))
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="timezone">Timezone</Label>
          <SearchableSelect
            id="timezone"
            value={values.timezone}
            onValueChange={(timezone) => setValues((v) => ({ ...v, timezone }))}
            items={timezoneOptions}
            placeholder="Search timezones…"
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-foreground">Specialties</legend>
        <div className="grid grid-cols-2 gap-2">
          {allSpecialties.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={values.specialty_ids.includes(s.id)}
                onCheckedChange={() => toggleSpecialty(s.id)}
              />
              {s.name}
            </label>
          ))}
        </div>
      </fieldset>

      {message && (
        <p
          className={message.type === "error" ? "text-sm text-destructive" : "text-sm font-medium text-success"}
          role={message.type === "error" ? "alert" : "status"}
        >
          {message.text}
        </p>
      )}

      <Button type="submit" disabled={saving} className="w-fit cursor-pointer">
        {saving ? "Saving…" : "Save profile"}
      </Button>

      <PhotoCropDialog
        imageSrc={pendingImageSrc}
        open={pendingImageSrc !== null}
        onCancel={handleCropCancel}
        onSave={handleCropSave}
      />
    </form>
  );
}
