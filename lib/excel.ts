import ExcelJS from "exceljs";

import type { InvoiceDetail } from "@/types";

// Excel export for a single extracted invoice: a summary sheet with the
// header fields, and a line-items sheet mirroring Invoice.lineItems.
export async function buildInvoiceWorkbook(
  invoice: InvoiceDetail
): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();

  // invoiceDate/dueDate are full ISO timestamps (midnight UTC) — the time
  // portion is never meaningful for an invoice date, so trim it for display.
  const toDateOnly = (isoString: string | null) =>
    isoString ? isoString.slice(0, 10) : "";

  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Field", key: "field", width: 22 },
    { header: "Value", key: "value", width: 36 },
  ];
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.addRows([
    { field: "Vendor", value: invoice.vendorName ?? "" },
    { field: "Invoice Number", value: invoice.invoiceNumber ?? "" },
    { field: "Invoice Date", value: toDateOnly(invoice.invoiceDate) },
    { field: "Due Date", value: toDateOnly(invoice.dueDate) },
    { field: "Currency", value: invoice.currency ?? "" },
    { field: "Subtotal", value: invoice.subtotal ?? "" },
    { field: "Tax Amount", value: invoice.taxAmount ?? "" },
    { field: "Total Amount", value: invoice.totalAmount ?? "" },
  ]);

  const lineItemsSheet = workbook.addWorksheet("Line Items");
  lineItemsSheet.columns = [
    { header: "Description", key: "description", width: 44 },
    { header: "Quantity", key: "quantity", width: 12 },
    { header: "Unit Price", key: "unitPrice", width: 14 },
    { header: "Amount", key: "amount", width: 14 },
  ];
  lineItemsSheet.getRow(1).font = { bold: true };
  for (const item of invoice.lineItems) {
    lineItemsSheet.addRow({
      description: item.description ?? "",
      quantity: item.quantity ?? "",
      unitPrice: item.unitPrice ?? "",
      amount: item.amount ?? "",
    });
  }

  return workbook.xlsx.writeBuffer();
}
