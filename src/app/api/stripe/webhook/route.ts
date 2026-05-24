import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const meta = session.metadata || {};
  const totalAmount = parseInt(meta.total_amount || "0", 10);
  const tierName = meta.tier_name || "";
  const message = meta.message || "";
  const supporterName = meta.supporter_name || "";
  const supporterEmail = meta.supporter_email || session.customer_details?.email || "";
  const isAnonymous = meta.is_anonymous === "true";
  const projectId = meta.project_id ? parseInt(meta.project_id, 10) : null;

  console.log(`handleCheckoutCompleted( totalAmount: ${totalAmount}, tierName: '${tierName}', projectId: ${projectId} )`);

  const insertPayload = {
    name: isAnonymous ? "匿名" : supporterName,
    email: supporterEmail,
    tier: tierName,
    status: "approved",
    total_amount: totalAmount,
    message: message,
    project_id: projectId,
    is_anonymous: isAnonymous,
  };

  console.log("挿入:", JSON.stringify(insertPayload));

  const { error } = await supabase.from("supporters").insert([insertPayload]);
  if (error) {
    console.error("Supabase insert error:", JSON.stringify(error));
  } else {
    console.log("Supabase insert success!");
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "no secret" }, { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature") || "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Signature error:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
  }

  return NextResponse.json({ received: true });
}
