// Shared TypeScript types
// Types are derived from Zod schemas in /schemas — see schemas/index.ts
export type { UploadStatus } from "@/lib/generated/prisma/enums";

// Serialized shape of an Upload row as returned by /api/upload and /api/uploads
// (Dates arrive as ISO strings over JSON, unlike the Prisma model's Date fields).
export type UploadListItem = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  status: import("@/lib/generated/prisma/enums").UploadStatus;
  errorMessage: string | null;
  createdAt: string;
};
