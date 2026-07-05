// Zod schemas — single source of truth for validation and type inference
// Schemas are added feature by feature
import { z } from "zod";

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

// Matches the `uploads` Supabase Storage bucket's file_size_limit — see
// prisma/migrations/20260705080355_add_uploads_storage_bucket.
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

export const uploadFileSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.enum(ALLOWED_UPLOAD_MIME_TYPES),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(MAX_UPLOAD_SIZE_BYTES, "File exceeds the 10 MB limit"),
});

export type UploadFileInput = z.infer<typeof uploadFileSchema>;
