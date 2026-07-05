"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

async function goTo(url: string) {
  window.location.href = url;
}

export function UpgradeButton({ plan }: { plan: "PRO" | "BUSINESS" }) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to start checkout");
      await goTo(body.url);
    } catch (err) {
      setIsLoading(false);
      alert(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Button onClick={handleClick} disabled={isLoading}>
      {isLoading ? "Redirecting..." : `Upgrade to ${plan === "PRO" ? "Pro" : "Business"}`}
    </Button>
  );
}

export function ManageSubscriptionButton() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to open billing portal");
      await goTo(body.url);
    } catch (err) {
      setIsLoading(false);
      alert(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={isLoading}>
      {isLoading ? "Redirecting..." : "Manage subscription"}
    </Button>
  );
}
