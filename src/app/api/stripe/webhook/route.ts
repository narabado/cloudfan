import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe, getSupabaseAdmin } from '@/lib';

export const runtime = 'nodejs';

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid') return;

  const metadata = session.metadata || {};
  const totalAmount = parseInt(metadata.total_amount || '0', 10);
  const tierName = metadata.tier_name || '';
  const message = metadata.message || '';
  const supporterName = metadata.supporter_name || '';
  const supporterEmail = metadata.supporter_email || '';
  const isAnonymous = metadata.is_anonymous === 'true';
  const projectId = parseInt(metadata.project_id || '0', 10);
  const projectTitle = metadata.project_title || '';

  console.log('handleCheckoutCompleted called', { totalAmount, tierName, projectId });

  if (!totalAmount) {
    console.error('totalAmount is missing');
    return;
  }

  const supabase = getSupabaseAdmin();

  const insertPayload = {
    '名前': isAnonymous ? '匿名' : supporterName,
    'メール': supporterEmail,
    '階層': tierName,
    '状況': 'approved',
    total_amount: totalAmount,
    'メッセージ': message,
    project_id: projectId || null,
    project_title: projectTitle,
    is_anonymous: isAnonymous,
  };

  console.log('Inserting into supporters:', insertPayload);

  const { error } = await supabase.from('supporters').insert(insertPayload);
  if (error) {
    console.error('Supabase insert error:', error);
  } else {
    console.log('Supabase insert success!');
  }
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature error:', message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  console.log('Stripe event received:', event.type);

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
  }

  return NextResponse.json({ received: true });
}
