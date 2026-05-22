import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';

function getBaseUrl(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }

  const origin = req.headers.get('origin');
  if (origin) return origin.replace(/\/$/, '');

  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host =
    req.headers.get('x-forwarded-host') ||
    req.headers.get('host');

  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    const body = await req.json();

    const projectId = String(body.projectId ?? '');
    const projectTitle = String(body.projectTitle ?? '');
    const supporterName = String(body.supporterName ?? '');
    const supporterEmail = String(body.supporterEmail ?? '');
    const tierName = String(body.tierName ?? '');
    const quantity = Number(body.quantity ?? 1);
    const totalAmount = Number(body.totalAmount ?? 0);
    const message = String(body.message ?? '');
    const isAnonymous = Boolean(body.isAnonymous ?? false);

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }
    if (!supporterName.trim()) {
      return NextResponse.json({ error: 'supporterName is required' }, { status: 400 });
    }
    if (!supporterEmail.trim()) {
      return NextResponse.json({ error: 'supporterEmail is required' }, { status: 400 });
    }
    if (!tierName.trim()) {
      return NextResponse.json({ error: 'tierName is required' }, { status: 400 });
    }
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return NextResponse.json({ error: 'totalAmount must be greater than 0' }, { status: 400 });
    }

    const baseUrl = getBaseUrl(req);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      locale: 'ja',
      customer_email: supporterEmail,
      client_reference_id: projectId,
      submit_type: 'donate',
      success_url: `${baseUrl}/projects/${projectId}/support/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/projects/${projectId}/support/cancel`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'jpy',
            unit_amount: totalAmount,
            product_data: {
              name: `${projectTitle} への支援`,
              description: `${tierName} / ${quantity}口`,
            },
          },
        },
      ],
      metadata: {
        project_id: projectId,
        project_title: projectTitle,
        supporter_name: supporterName,
        supporter_email: supporterEmail,
        tier_name: tierName,
        quantity: String(quantity),
        total_amount: String(totalAmount),
        message,
        is_anonymous: isAnonymous ? 'true' : 'false',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Stripe checkout session creation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}