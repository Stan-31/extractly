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

export const extractRequestSchema = z.object({
  uploadId: z.string().uuid(),
});

export type ExtractRequestInput = z.infer<typeof extractRequestSchema>;

// Structured shape Claude extracts from OCR text — mirrors the Invoice model's
// extractable fields. Dates come back as ISO date strings (not Date objects)
// since structured-output JSON has no native date type.
export const invoiceLineItemSchema = z.object({
  description: z.string().nullable(),
  quantity: z.number().nullable(),
  unitPrice: z.number().nullable(),
  amount: z.number().nullable(),
});

export const invoiceExtractionSchema = z.object({
  vendorName: z.string().nullable(),
  invoiceNumber: z.string().nullable(),
  invoiceDate: z
    .string()
    .nullable()
    .describe("ISO 8601 date (YYYY-MM-DD), or null if not present"),
  dueDate: z
    .string()
    .nullable()
    .describe("ISO 8601 date (YYYY-MM-DD), or null if not present"),
  currency: z
    .string()
    .nullable()
    .describe("ISO 4217 currency code, e.g. USD, EUR"),
  subtotal: z.number().nullable(),
  taxAmount: z.number().nullable(),
  totalAmount: z.number().nullable(),
  lineItems: z.array(invoiceLineItemSchema),
});

export type InvoiceExtraction = z.infer<typeof invoiceExtractionSchema>;
