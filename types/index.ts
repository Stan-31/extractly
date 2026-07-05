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

// Serialized shape of an Invoice row — Decimal fields become numbers and Date
// fields become ISO strings, since neither survives a Prisma Decimal/Date ->
// JSON round trip (or a Server Component -> Client Component prop) as-is.
export type InvoiceLineItemData = {
  description: string | null;
  quantity: number | null;
  unitPrice: number | null;
  amount: number | null;
};

export type InvoiceListItem = {
  id: string;
  uploadId: string;
  fileName: string;
  vendorName: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  currency: string | null;
  totalAmount: number | null;
  createdAt: string;
};

export type InvoiceDetail = InvoiceListItem & {
  dueDate: string | null;
  subtotal: number | null;
  taxAmount: number | null;
  lineItems: InvoiceLineItemData[];
};
