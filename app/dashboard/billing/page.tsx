import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  PLAN_UPLOAD_LIMITS,
  countUploadsThisMonth,
  getUserPlan,
} from "@/lib/subscription";
import {
  ManageSubscriptionButton,
  UpgradeButton,
} from "@/components/dashboard/billing-actions";

export const metadata: Metadata = { title: "Billing" };

const PLAN_LABELS = { FREE: "Free", PRO: "Pro", BUSINESS: "Business" } as const;

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [plan, subscription, uploadsThisMonth] = await Promise.all([
    getUserPlan(user.id),
    prisma.subscription.findUnique({ where: { userId: user.id } }),
    countUploadsThisMonth(user.id),
  ]);

  const limit = PLAN_UPLOAD_LIMITS[plan];
  const hasBillingAccount = Boolean(subscription?.stripeCustomerId);

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold">Billing</h1>
      <p className="mt-1 text-muted-foreground">
        Manage your plan and view usage.
      </p>

      {checkout === "success" && (
        <p className="mt-4 rounded-lg border border-green-600/30 bg-green-600/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          Subscription updated — it may take a few seconds to reflect below.
        </p>
      )}
      {checkout === "cancelled" && (
        <p className="mt-4 rounded-lg border px-4 py-3 text-sm text-muted-foreground">
          Checkout was cancelled — no changes were made.
        </p>
      )}

      <div className="mt-6 rounded-xl border p-5">
        <p className="text-sm text-muted-foreground">Current plan</p>
        <p className="text-xl font-semibold">{PLAN_LABELS[plan]}</p>

        <p className="mt-4 text-sm text-muted-foreground">
          {limit === null
            ? `${uploadsThisMonth} uploads this month · unlimited`
            : `${uploadsThisMonth} / ${limit} uploads this month`}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          {plan !== "PRO" && <UpgradeButton plan="PRO" />}
          {plan !== "BUSINESS" && <UpgradeButton plan="BUSINESS" />}
          {hasBillingAccount && <ManageSubscriptionButton />}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <PlanCard name="Free" price="$0" features={["5 invoices / month"]} />
        <PlanCard name="Pro" price="$9/mo" features={["Unlimited invoices"]} />
        <PlanCard
          name="Business"
          price="$29/mo"
          features={["Unlimited invoices"]}
        />
      </div>
    </div>
  );
}

function PlanCard({
  name,
  price,
  features,
}: {
  name: string;
  price: string;
  features: string[];
}) {
  return (
    <div className="rounded-xl border p-4">
      <p className="font-medium">{name}</p>
      <p className="text-lg font-semibold">{price}</p>
      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
        {features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
    </div>
  );
}
