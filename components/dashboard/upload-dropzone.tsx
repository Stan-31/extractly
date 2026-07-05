"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";

import { cn } from "@/lib/utils";
import { ALLOWED_UPLOAD_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES } from "@/schemas";

export function UploadDropzone() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setError(null);
      setIsUploading(true);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error ?? "Upload failed");
        }

        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [router]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isUploading,
    maxSize: MAX_UPLOAD_SIZE_BYTES,
    maxFiles: 1,
    accept: Object.fromEntries(
      ALLOWED_UPLOAD_MIME_TYPES.map((type) => [type, []])
    ),
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input p-8 text-center transition-colors",
          isDragActive && "border-primary bg-primary/5",
          isUploading && "pointer-events-none opacity-60"
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">
          {isUploading
            ? "Uploading..."
            : isDragActive
              ? "Drop the invoice here"
              : "Drag & drop an invoice, or click to browse"}
        </p>
        <p className="text-xs text-muted-foreground">
          PDF, PNG, JPEG or WEBP — up to 10 MB
        </p>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
