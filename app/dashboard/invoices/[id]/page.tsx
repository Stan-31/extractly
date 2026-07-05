import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { serializeInvoice } from "@/lib/invoice-serializer";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Invoice" };

function formatCurrency(amount: number | null, currency: string | null) {
  if (amount === null) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency ?? "USD",
    }).format(amount);
  } catch {
    return amount.toFixed(2);
  }
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const invoiceRow = await prisma.invoice.findUnique({
    where: { id },
    include: { upload: { select: { fileName: true } } },
  });

  if (!invoiceRow || invoiceRow.userId !== user.id) notFound();

  const invoice = serializeInvoice(invoiceRow);

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/invoices"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Invoices
          </Link>
          <h1 className="mt-1 text-2xl font-bold">
            {invoice.vendorName ?? invoice.fileName}
          </h1>
          <p className="text-sm text-muted-foreground">{invoice.fileName}</p>
        </div>
        <a
          href={`/api/export?invoiceId=${invoice.id}`}
          className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
        >
          <Download />
          Export
        </a>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-xl border p-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Invoice Number</dt>
          <dd className="font-medium">{invoice.invoiceNumber ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Currency</dt>
          <dd className="font-medium">{invoice.currency ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Invoice Date</dt>
          <dd className="font-medium">
            {invoice.invoiceDate
              ? new Date(invoice.invoiceDate).toLocaleDateString()
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Due Date</dt>
          <dd className="font-medium">
            {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="font-medium">
            {formatCurrency(invoice.subtotal, invoice.currency)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Tax</dt>
          <dd className="font-medium">
            {formatCurrency(invoice.taxAmount, invoice.currency)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Total</dt>
          <dd className="font-medium">
            {formatCurrency(invoice.totalAmount, invoice.currency)}
          </dd>
        </div>
      </dl>

      <h2 className="mt-8 text-lg font-semibold">Line Items</h2>
      {invoice.lineItems.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No line items extracted.</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Unit Price</th>
                <th className="px-4 py-3 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoice.lineItems.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-3">{item.description ?? "—"}</td>
                  <td className="px-4 py-3">{item.quantity ?? "—"}</td>
                  <td className="px-4 py-3">
                    {formatCurrency(item.unitPrice, invoice.currency)}
                  </td>
                  <td className="px-4 py-3">
                    {formatCurrency(item.amount, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
