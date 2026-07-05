import type { Metadata } from "next";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { serializeInvoice } from "@/lib/invoice-serializer";

export const metadata: Metadata = { title: "Invoices" };

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

export default async function InvoicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const invoices = user
    ? (
        await prisma.invoice.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          include: { upload: { select: { fileName: true } } },
        })
      ).map(serializeInvoice)
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold">Invoices</h1>
      <p className="mt-1 text-muted-foreground">
        Extracted data from your processed invoices.
      </p>

      {invoices.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No extracted invoices yet — upload one from the dashboard.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Invoice #</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{invoice.vendorName ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{invoice.fileName}</div>
                  </td>
                  <td className="px-4 py-3">{invoice.invoiceNumber ?? "—"}</td>
                  <td className="px-4 py-3">
                    {invoice.invoiceDate
                      ? new Date(invoice.invoiceDate).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {formatCurrency(invoice.totalAmount, invoice.currency)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/invoices/${invoice.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      View
                    </Link>
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
