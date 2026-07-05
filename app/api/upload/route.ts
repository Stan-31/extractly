import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { processUpload } from "@/lib/invoice-processing";
import { uploadFileSchema } from "@/schemas";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const parsed = uploadFileSchema.safeParse({
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid file" },
      { status: 400 }
    );
  }

  const uploadId = crypto.randomUUID();
  const extension = file.name.split(".").pop() ?? "bin";
  const storagePath = `${user.id}/${uploadId}.${extension}`;

  const { error: storageError } = await supabase.storage
    .from("uploads")
    .upload(storagePath, file, { contentType: file.type });

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 });
  }

  const upload = await prisma.upload.create({
    data: {
      id: uploadId,
      userId: user.id,
      fileName: file.name,
      storagePath,
      mimeType: file.type,
      fileSize: file.size,
    },
  });

  // Synchronous for now — no queue infra exists yet. Revisit if OCR +
  // extraction latency makes this endpoint too slow.
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await processUpload({
    uploadId: upload.id,
    userId: user.id,
    fileBuffer,
    mimeType: file.type,
    fileName: file.name,
  });

  const finalUpload = await prisma.upload.findUniqueOrThrow({
    where: { id: upload.id },
  });

  return NextResponse.json({ upload: finalUpload }, { status: 201 });
}
