import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
