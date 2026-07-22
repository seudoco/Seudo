"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function PublishButton({
  initiallyPublished,
  canPublish,
}: {
  initiallyPublished: boolean;
  canPublish: boolean;
}) {
  const [published, setPublished] = useState(initiallyPublished);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/practitioner/publish", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: !published }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't update your listing");
      return;
    }
    setPublished(data.is_published);
  }

  return (
    <div>
      <Button
        onClick={toggle}
        disabled={saving || (!published && !canPublish)}
        className="cursor-pointer"
      >
        {saving ? "Saving…" : published ? "Unpublish listing" : "Publish listing"}
      </Button>
      {published && (
        <p className="mt-2 text-sm text-foreground" role="status">
          Your listing is live — clients can find and book you.
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
