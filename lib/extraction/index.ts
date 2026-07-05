import { z } from "zod";

import { gemini } from "@/lib/gemini";
import { invoiceExtractionSchema, type InvoiceExtraction } from "@/schemas";

const EXTRACTION_MODEL = "gemini-2.5-flash";

const responseJsonSchema = z.toJSONSchema(invoiceExtractionSchema);

export async function extractInvoiceData(
  ocrText: string
): Promise<InvoiceExtraction> {
  const response = await gemini.models.generateContent({
    model: EXTRACTION_MODEL,
    contents: `Extract the invoice fields from this OCR text:\n\n${ocrText}`,
    config: {
      systemInstruction:
        "You extract structured invoice data from OCR text produced by scanning an invoice document. " +
        "If a field is not present in the text, return null for it rather than guessing.",
      responseMimeType: "application/json",
      responseJsonSchema,
    },
  });

  if (!response.text) {
    throw new Error("Gemini did not return structured invoice data");
  }

  return invoiceExtractionSchema.parse(JSON.parse(response.text));
}
