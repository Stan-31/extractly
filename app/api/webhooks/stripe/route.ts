import { NextResponse } from "next/server";
import Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import type {
  SubscriptionPlan,
  SubscriptionStatus,
} from "@/lib/generated/prisma/enums";

const PRICE_TO_PLAN: Record<string, SubscriptionPlan> = {
  [process.env.STRIPE_PRO_PRICE_ID!]: "PRO",
  [process.env.STRIPE_BUSINESS_PRICE_ID!]: "BUSINESS",
};

const STRIPE_STATUS_TO_LOCAL: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
  active: "ACTIVE",
  trialing: "TRIALING",
  past_due: "PAST_DUE",
  canceled: "CANCELED",
  unpaid: "CANCELED",
  incomplete: "PAST_DUE",
  incomplete_expired: "CANCELED",
  paused: "CANCELED",
};

function planFromSubscription(subscription: Stripe.Subscription): SubscriptionPlan {
  const priceId = subscription.items.data[0]?.price.id;
  return (priceId && PRICE_TO_PLAN[priceId]) || "FREE";
}

function fieldsFromSubscription(subscription: Stripe.Subscription) {
  return {
    stripeSubscriptionId: subscription.id,
    plan: planFromSubscription(subscription),
    status: STRIPE_STATUS_TO_LOCAL[subscription.status] ?? ("PAST_DUE" as SubscriptionStatus),
    currentPeriodEnd: new Date(subscription.items.data[0].current_period_end * 1000),
  };
}

// Called from checkout.session.completed, where userId is guaranteed (we set
// it as Checkout Session metadata) — creates the Subscription row if needed.
async function createOrUpdateFromCheckout(
  userId: string,
  stripeCustomerId: string,
  subscription: Stripe.Subscription
) {
  const fields = fieldsFromSubscription(subscription);
  await prisma.subscription.upsert({
    where: { stripeCustomerId },
    create: { userId, stripeCustomerId, ...fields },
    update: fields,
  });
}

// Called from customer.subscription.updated — the row should already exist
// from checkout.session.completed, so this only ever updates, never creates.
async function syncSubscriptionUpdate(
  stripeCustomerId: string,
  subscription: Stripe.Subscription
) {
  await prisma.subscription.updateMany({
    where: { stripeCustomerId },
    data: fieldsFromSubscription(subscription),
  });
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const stripeCustomerId = session.customer as string;
      const stripeSubscriptionId = session.subscription as string;

      if (userId && stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        await createOrUpdateFromCheckout(userId, stripeCustomerId, subscription);
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await syncSubscriptionUpdate(subscription.customer as string, subscription);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await prisma.subscription.updateMany({
        where: { stripeCustomerId: subscription.customer as string },
        data: { plan: "FREE", status: "CANCELED" },
      });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
