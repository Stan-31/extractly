import { prisma } from "@/lib/prisma";
import type { SubscriptionPlan } from "@/lib/generated/prisma/enums";

// Upload cap per calendar month by plan. PRO/BUSINESS are unlimited (v1 —
// they're differentiated by price only for now, not by feature).
export const PLAN_UPLOAD_LIMITS: Record<SubscriptionPlan, number | null> = {
  FREE: 5,
  PRO: null,
  BUSINESS: null,
};

export async function getUserPlan(userId: string): Promise<SubscriptionPlan> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) return "FREE";
  // Only an ACTIVE or TRIALING subscription grants the paid plan's limits —
  // PAST_DUE/CANCELED fall back to FREE until payment is sorted out.
  if (subscription.status !== "ACTIVE" && subscription.status !== "TRIALING") {
    return "FREE";
  }
  return subscription.plan;
}

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function countUploadsThisMonth(userId: string): Promise<number> {
  return prisma.upload.count({
    where: { userId, createdAt: { gte: startOfCurrentMonth() } },
  });
}

export async function checkUploadAllowance(
  userId: string
): Promise<{ allowed: boolean; plan: SubscriptionPlan; limit: number | null; used: number }> {
  const plan = await getUserPlan(userId);
  const limit = PLAN_UPLOAD_LIMITS[plan];

  if (limit === null) {
    return { allowed: true, plan, limit, used: 0 };
  }

  const used = await countUploadsThisMonth(userId);
  return { allowed: used < limit, plan, limit, used };
}
