import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="font-semibold">Extractly</span>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/dashboard/invoices" className="hover:text-foreground">
              Invoices
            </Link>
            <Link href="/dashboard/billing" className="hover:text-foreground">
              Billing
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {user?.email && (
            <span className="text-sm text-muted-foreground">{user.email}</span>
          )}
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
