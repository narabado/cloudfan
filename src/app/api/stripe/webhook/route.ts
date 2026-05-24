import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, getSupabaseAdmin } from "@/lib";

export const runtime = "nodejs";

const COL_NAME   = "\u540d\u524d";
const COL_EMAIL  = "\u30e1\u30fc\u30eb";
const COL_TIER   = "\u968e\u5c64";
const COL_STATUS = "\u72b6\u6cc1";
const COL_MSG    = "\u30e1\u30c3\u30bb\u30fc\u30b8";
const VAL_ANON   = "\u533f\u540d";

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return;

  const metadata = session.metadata || {};
  const totalAmount = parseInt(metadata.total_amount || "0", 10);
  const tierName = metadata.tier_name || "";
  const message = metadata.message || "";
  const supporterName = metadata.supporter_name || "";
  const supporterEmail = metadata.supporter_email || "";
  const isAnonymous = metadata.is_anonymous === "true";
  const projectId = parseInt(metadata.project_id || "0", 10);

  console.log("handleCheckoutCompleted", { totalAmount, tierName, projectId });

  if (!totalAmount) {
    console.error("totalAmount is missing");
    return;
  }

  const supabase = getSupabaseAdmin();

  const insertPayload: Record<string, unknown> = {};
  insertPayload[COL_NAME]       = isAnonymous ? VAL_ANON : supporterName;
  insertPayload[COL_EMAIL]      = supporterEmail;
  insertPayload[COL_TIER]       = tierName;
  insertPayload[COL_STATUS]     = "approved";
  insertPayload["total_amount"] = totalAmount;
  insertPayload[COL_MSG]        = message;
  insertPayload["project_id"]   = projectId || null;
  insertPayload["is_anonymous"] = isAnonymous;

  console.log("Inserting:", JSON.stringify(insertPayload));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("supporters").insert(insertPayload);
  if (error) {
    console.error("Supabase insert error:", JSON.stringify(error));
  } else {
    console.log("Supabase insert success!");
  }
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature error:", msg);
    return NextResponse.json({ error: "Webhook Error: " + msg }, { status: 400 });
  }

  console.log("Stripe event received:", event.type);

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
  }

  return NextResponse.json({ received: true });
}