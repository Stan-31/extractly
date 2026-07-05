// OCR abstraction layer — Mistral primary, Google Vision fallback (not yet implemented)
import { mistral } from "@/lib/mistral";

const OCR_MODEL = "mistral-ocr-latest";

export async function runOcr(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<string> {
  const dataUrl = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;

  const document =
    mimeType === "application/pdf"
      ? {
          type: "document_url" as const,
          documentUrl: dataUrl,
          documentName: fileName,
        }
      : { type: "image_url" as const, imageUrl: dataUrl };

  const response = await mistral.ocr.process({
    model: OCR_MODEL,
    document,
  });

  return response.pages.map((page) => page.markdown).join("\n\n");
}
