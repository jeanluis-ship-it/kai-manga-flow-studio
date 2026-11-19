import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PLAN_CATALOG, type PlanTier } from '@/lib/plans/quotas';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const CheckoutSchema = z.object({
  targetPlan: z.enum(['starter', 'pro', 'master']),
});

const STRIPE_PRICE_ENV: Record<'starter' | 'pro' | 'master', string> = {
  starter: 'STRIPE_PRICE_STARTER',
  pro: 'STRIPE_PRICE_PRO',
  master: 'STRIPE_PRICE_MASTER',
};

export async function POST(req: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido.' }, { status: 400 });
  }

  const parsed = CheckoutSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Plan objetivo inválido. Selecciona Starter, Pro o Master.' },
      { status: 400 },
    );
  }

  const targetPlan = parsed.data.targetPlan as PlanTier;
  const plan = PLAN_CATALOG[targetPlan];
  const origin = req.nextUrl.origin;

  // 1. Real Stripe Checkout Session when STRIPE_SECRET_KEY + Price ID are configured
  const stripeKey = (process.env.STRIPE_SECRET_KEY || '').trim();
  const stripePriceId = (process.env[STRIPE_PRICE_ENV[parsed.data.targetPlan]] || '').trim();

  if (stripeKey && stripePriceId) {
    try {
      const supabase = await createSupabaseServerClient();
      const user = supabase ? (await supabase.auth.getUser()).data.user : null;

      const form = new URLSearchParams();
      form.set('mode', 'subscription');
      form.set('line_items[0][price]', stripePriceId);
      form.set('line_items[0][quantity]', '1');
      form.set('success_url', `${origin}/studio?billing=success&plan=${targetPlan}`);
      form.set('cancel_url', `${origin}/studio?billing=canceled`);
      form.set('metadata[targetPlan]', targetPlan);
      if (user?.id) form.set('client_reference_id', user.id);
      if (user?.email) form.set('customer_email', user.email);

      const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
        signal: AbortSignal.timeout(12_000),
      });

      const data = (await resp.json()) as { url?: string; error?: { message?: string } };
      if (resp.ok && data.url) {
        return NextResponse.json({
          mode: 'stripe',
          targetPlan,
          checkoutUrl: data.url,
        });
      }
      return NextResponse.json(
        { error: data.error?.message || 'No se pudo iniciar la sesión de Stripe.' },
        { status: 502 },
      );
    } catch {
      return NextResponse.json(
        { error: 'Error de red al conectar con Stripe Checkout.' },
        { status: 502 },
      );
    }
  }

  // 2. External Founder Checkout Link if provided
  const founderUrl = (process.env.NEXT_PUBLIC_FOUNDER_CHECKOUT_URL || '').trim();
  if (founderUrl) {
    const separator = founderUrl.includes('?') ? '&' : '?';
    return NextResponse.json({
      mode: 'external_url',
      targetPlan,
      checkoutUrl: `${founderUrl}${separator}plan=${targetPlan}`,
    });
  }

  // 3. Founder Pre-Registration / Manual Activation + dev plan simulation flag
  const canSimulate =
    process.env.NODE_ENV !== 'production' ||
    process.env.NEXT_PUBLIC_ALLOW_PLAN_SIMULATION === 'true';

  return NextResponse.json({
    mode: 'founder_preregister',
    targetPlan,
    canSimulate,
    planName: plan.name,
    priceLabel: `${plan.priceLabel} ${plan.periodLabel}`,
    message: `Pre-registro Fundador registrado para el Plan ${plan.name} (${plan.priceLabel} ${plan.periodLabel}). Aún no hay pasarela Stripe conectada en este entorno; puedes solicitar activación manual o simular el plan para probar las cuotas.`,
  });
}
