import { prisma } from "@/lib/prisma";
import { runOcr } from "@/lib/ocr";
import { extractInvoiceData } from "@/lib/extraction";

function toDateOrNull(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Runs OCR + Claude extraction for an already-uploaded file and records the
// result on the matching Upload/Invoice rows. Callers own fetching the file
// bytes (either straight from the multipart upload, or downloaded from
// storage for a retry) since that differs by call site.
export async function processUpload(params: {
  uploadId: string;
  userId: string;
  fileBuffer: Buffer;
  mimeType: string;
  fileName: string;
}): Promise<void> {
  const { uploadId, userId, fileBuffer, mimeType, fileName } = params;

  await prisma.upload.update({
    where: { id: uploadId },
    data: { status: "PROCESSING", errorMessage: null },
  });

  try {
    const ocrText = await runOcr(fileBuffer, mimeType, fileName);
    const extracted = await extractInvoiceData(ocrText);

    await prisma.invoice.upsert({
      where: { uploadId },
      create: {
        uploadId,
        userId,
        vendorName: extracted.vendorName,
        invoiceNumber: extracted.invoiceNumber,
        invoiceDate: toDateOrNull(extracted.invoiceDate),
        dueDate: toDateOrNull(extracted.dueDate),
        currency: extracted.currency,
        subtotal: extracted.subtotal,
        taxAmount: extracted.taxAmount,
        totalAmount: extracted.totalAmount,
        lineItems: extracted.lineItems,
        rawExtraction: extracted,
      },
      update: {
        vendorName: extracted.vendorName,
        invoiceNumber: extracted.invoiceNumber,
        invoiceDate: toDateOrNull(extracted.invoiceDate),
        dueDate: toDateOrNull(extracted.dueDate),
        currency: extracted.currency,
        subtotal: extracted.subtotal,
        taxAmount: extracted.taxAmount,
        totalAmount: extracted.totalAmount,
        lineItems: extracted.lineItems,
        rawExtraction: extracted,
      },
    });

    await prisma.upload.update({
      where: { id: uploadId },
      data: { status: "COMPLETED" },
    });
  } catch (error) {
    await prisma.upload.update({
      where: { id: uploadId },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Extraction failed",
      },
    });
  }
}
