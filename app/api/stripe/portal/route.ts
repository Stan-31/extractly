import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });

  if (!subscription?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing account yet — subscribe to a plan first" },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${appUrl}/dashboard/billing`,
  });

  return NextResponse.json({ url: session.url });
}
