import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

const checkoutRequestSchema = z.object({
  plan: z.enum(["PRO", "BUSINESS"]),
});

const PRICE_IDS: Record<"PRO" | "BUSINESS", string> = {
  PRO: process.env.STRIPE_PRO_PRICE_ID!,
  BUSINESS: process.env.STRIPE_BUSINESS_PRICE_ID!,
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = checkoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const existing = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });

  let stripeCustomerId = existing?.stripeCustomerId ?? null;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabaseUserId: user.id },
    });
    stripeCustomerId = customer.id;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: PRICE_IDS[parsed.data.plan], quantity: 1 }],
    success_url: `${appUrl}/dashboard/billing?checkout=success`,
    cancel_url: `${appUrl}/dashboard/billing?checkout=cancelled`,
    metadata: { userId: user.id, plan: parsed.data.plan },
  });

  return NextResponse.json({ url: session.url });
}
