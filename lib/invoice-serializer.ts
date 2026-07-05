import type { Prisma } from "@/lib/generated/prisma/client";
import type { InvoiceDetail, InvoiceLineItemData } from "@/types";

type InvoiceWithUpload = Prisma.InvoiceGetPayload<{
  include: { upload: { select: { fileName: true } } };
}>;

function toNumberOrNull(value: Prisma.Decimal | null): number | null {
  return value === null ? null : value.toNumber();
}

// lineItems is stored as Json — it's only ever written by
// extractInvoiceData's Zod-validated output, so a direct cast is safe.
function toLineItems(value: Prisma.JsonValue | null): InvoiceLineItemData[] {
  return Array.isArray(value) ? (value as unknown as InvoiceLineItemData[]) : [];
}

export function serializeInvoice(invoice: InvoiceWithUpload): InvoiceDetail {
  return {
    id: invoice.id,
    uploadId: invoice.uploadId,
    fileName: invoice.upload.fileName,
    vendorName: invoice.vendorName,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate?.toISOString() ?? null,
    dueDate: invoice.dueDate?.toISOString() ?? null,
    currency: invoice.currency,
    subtotal: toNumberOrNull(invoice.subtotal),
    taxAmount: toNumberOrNull(invoice.taxAmount),
    totalAmount: toNumberOrNull(invoice.totalAmount),
    lineItems: toLineItems(invoice.lineItems),
    createdAt: invoice.createdAt.toISOString(),
  };
}
