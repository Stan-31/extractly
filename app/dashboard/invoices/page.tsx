import type { Metadata } from "next";

export const metadata: Metadata = { title: "Invoices" };

export default function InvoicesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Invoices</h1>
      <p className="text-muted-foreground mt-1">Coming soon.</p>
    </div>
  );
}
