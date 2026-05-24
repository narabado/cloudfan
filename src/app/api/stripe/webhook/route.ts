import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid') return;

  const meta = session.metadata || {};
  const totalAmount = Number(meta.total_amount || 0);
  const tierName = String(meta.tier_name || '');
  const message = String(meta.message || '');
  const supporterName = String(meta.supporter_name || '');
  const supporterEmail = String(meta.supporter_email || '');
  const isAnonymous = String(meta.is_anonymous || 'false') === 'true';

  if (!totalAmount) return;

  const supabaseAdmin = getSupabaseAdmin();

  const insertPayload: Record<string, any> = {
    status: 'approved',
    total_amount: totalAmount,
    message,
    name: isAnonymous ? '匿名' : supporterName,
    email: supporterEmail,
    plan: tierName,
    is_anonymous: isAnonymous,
  };

  const { error } = await supabaseAdmin
    .from('supporters')
    .insert(insertPayload);

  if (error) {
    console.error('Supabase insert error:', error.message);
    throw new Error(error.message);
  }
  
  console.log('Supporter inserted successfully:', supporterName);
}

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET is not set' }, { status: 500 });
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Stripe-Signature header is missing' }, { status: 400 });
    }

    const body = await req.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid webhook signature';
      console.error('Webhook signature error:', message);
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.log('Webhook event received:', event.type);

    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Stripe webhook handling failed';
    console.error('Webhook error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}