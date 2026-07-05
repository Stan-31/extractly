import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { processUpload } from "@/lib/invoice-processing";
import { extractRequestSchema } from "@/schemas";

// Manual (re)trigger for OCR + extraction on an existing Upload — e.g.
// retrying a FAILED upload, or processing one left at PENDING.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = extractRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const upload = await prisma.upload.findUnique({
    where: { id: parsed.data.uploadId },
  });

  if (!upload || upload.userId !== user.id) {
    return NextResponse.json({ error: "Upload not found" }, { status: 404 });
  }

  if (upload.status === "PROCESSING") {
    return NextResponse.json(
      { error: "Upload is already processing" },
      { status: 409 }
    );
  }

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from("uploads")
    .download(upload.storagePath);

  if (downloadError || !fileBlob) {
    return NextResponse.json(
      { error: downloadError?.message ?? "Failed to download file" },
      { status: 500 }
    );
  }

  const fileBuffer = Buffer.from(await fileBlob.arrayBuffer());
  await processUpload({
    uploadId: upload.id,
    userId: user.id,
    fileBuffer,
    mimeType: upload.mimeType,
    fileName: upload.fileName,
  });

  const finalUpload = await prisma.upload.findUniqueOrThrow({
    where: { id: upload.id },
  });

  return NextResponse.json({ upload: finalUpload });
}
