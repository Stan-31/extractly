import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { UploadDropzone } from "@/components/dashboard/upload-dropzone";
import { UploadsList } from "@/components/dashboard/uploads-list";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const uploads = user
    ? await prisma.upload.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          fileSize: true,
          status: true,
          errorMessage: true,
          createdAt: true,
        },
      })
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">
        Upload an invoice to extract structured data from it.
      </p>
      <div className="mt-6 max-w-xl">
        <UploadDropzone />
        <UploadsList
          uploads={uploads.map((upload) => ({
            ...upload,
            createdAt: upload.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
