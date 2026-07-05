import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { buildInvoiceWorkbook } from "@/lib/excel";
import { serializeInvoice } from "@/lib/invoice-serializer";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoiceId = request.nextUrl.searchParams.get("invoiceId");
  if (!invoiceId) {
    return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { upload: { select: { fileName: true } } },
  });

  if (!invoice || invoice.userId !== user.id) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const buffer = await buildInvoiceWorkbook(serializeInvoice(invoice));
  const baseName = (invoice.invoiceNumber ?? invoice.upload.fileName).replace(
    /[^a-zA-Z0-9-_]+/g,
    "_"
  );

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="invoice-${baseName}.xlsx"`,
    },
  });
}
