import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid') return;

  const meta = session.metadata || {};
  const projectId = Number(meta.project_id || 0);
  const totalAmount = Number(meta.total_amount || 0);
  const tierName = String(meta.tier_name || '');
  const message = String(meta.message || '');
  const supporterName = String(meta.supporter_name || '');
  const isAnonymous = String(meta.is_anonymous || 'false') === 'true';

  if (!projectId || !totalAmount) return;

  const supabaseAdmin = getSupabaseAdmin();

  const insertPayload: Record<string, any> = {
    project_id: projectId,
    status: '承認',
    total_amount: totalAmount,
    message,
    name: isAnonymous ? '匿名' : supporterName,
    ['階層']: tierName,
  };

  const { error } = await supabaseAdmin
    .from('supporters')
    .insert(insertPayload);

  if (error) {
    throw new Error(error.message);
  }
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
      return NextResponse.json({ error: message }, { status: 400 });
    }

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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}