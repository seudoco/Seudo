"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getCroppedImageBlob } from "@/lib/image/cropImage";

export function PhotoCropDialog({
  imageSrc,
  open,
  onCancel,
  onSave,
}: {
  imageSrc: string | null;
  open: boolean;
  onCancel: () => void;
  onSave: (blob: Blob) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  async function handleSave() {
    if (!imageSrc || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      onSave(blob);
    } finally {
      setSaving(false);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust your photo</DialogTitle>
        </DialogHeader>

        <div className="relative h-72 w-full overflow-hidden rounded-lg bg-secondary">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
            />
          )}
        </div>

        <div className="flex items-center gap-3 px-1">
          <span className="text-xs text-muted-foreground">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer accent-foreground"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" className="cursor-pointer" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" className="cursor-pointer" disabled={saving} onClick={handleSave}>
            {saving ? "Saving…" : "Use this photo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
