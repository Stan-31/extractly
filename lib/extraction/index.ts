import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { anthropic } from "@/lib/anthropic";
import { invoiceExtractionSchema, type InvoiceExtraction } from "@/schemas";

const EXTRACTION_MODEL = "claude-opus-4-8";

export async function extractInvoiceData(
  ocrText: string
): Promise<InvoiceExtraction> {
  const response = await anthropic.messages.parse({
    model: EXTRACTION_MODEL,
    max_tokens: 4096,
    system:
      "You extract structured invoice data from OCR text produced by scanning an invoice document. " +
      "If a field is not present in the text, return null for it rather than guessing.",
    messages: [
      {
        role: "user",
        content: `Extract the invoice fields from this OCR text:\n\n${ocrText}`,
      },
    ],
    output_config: {
      format: zodOutputFormat(invoiceExtractionSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("Claude did not return structured invoice data");
  }

  return response.parsed_output;
}
