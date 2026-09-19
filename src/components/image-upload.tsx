"use client";

import Image from "next/image";
import { useState } from "react";

export function ImageUpload({
  kind,
  label,
  initialUrl,
  onUploaded,
}: {
  kind: "proof" | "qr";
  label: string;
  initialUrl?: string | null;
  onUploaded: (url: string) => void;
}) {
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);

    const res = await fetch("/api/upload", { method: "POST", body: form });
    setUploading(false);

    if (!res.ok) {
      setError("Upload thất bại, thử lại nhé");
      return;
    }
    const data = await res.json();
    setPreview(data.url);
    onUploaded(data.url);
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-muted">{label}</label>
      {preview && (
        <Image
          src={preview}
          alt={label}
          width={200}
          height={200}
          className="max-h-48 w-fit rounded-lg border border-border object-contain"
          unoptimized
        />
      )}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleChange}
        disabled={uploading}
        className="text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-xs file:text-foreground"
      />
      {uploading && <span className="text-xs text-muted">Đang tải lên...</span>}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
