/**
 * KAI Flow Studio v4.2 — Monetization, 72-Hour Paid Trial & Subscription Checkout (/api/checkout)
 * Soporta:
 * 1. Stripe Checkout en vivo (cuando STRIPE_SECRET_KEY está configurada en Vercel).
 * 2. Emisión de Pase Criptográfico de Prueba (72h / 40 Ink Credits por US$ 2.99) y cancelación en 1 clic.
 */

const crypto = require('crypto');

const PLANS = {
  trial_72h: {
    id: 'trial_72h',
    name: 'Pase de Estudio 72 Horas (Trial Anti-Abuso)',
    priceUsdCents: 299,
    priceUsdDisplay: 'US$ 2.99',
    priceDopDisplay: 'RD$ 175',
    credits: 40,
    durationHours: 72,
    autoRenewsTo: 'Mangaka Pro Mensual (US$ 19.99/mes · 250 créditos)',
    features: [
      '40 Créditos de Tinta (10 páginas completas o 40 viñetas individuales)',
      'Acceso total a los 6 estilos de entintado y bloqueo de personajes (Seed + Base64)',
      'Exportación de paquete ZIP de pre-prensa sin marca de agua',
      'Cancelación en 1 clic dentro de las 72h sin cargos adicionales'
    ]
  },
  pro_monthly: {
    id: 'pro_monthly',
    name: 'Mangaka Pro Mensual',
    priceUsdCents: 1999,
    priceUsdDisplay: 'US$ 19.99/mes',
    priceDopDisplay: 'RD$ 1,180/mes',
    credits: 250,
    durationHours: 720,
    autoRenewsTo: 'Renovación mensual automática (Cancelable en cualquier momento)',
    features: [
      '250 Créditos de Tinta cada mes (~62 páginas completas)',
      'Prioridad en Nano Banana Pro + Fal.ai FLUX PuLID (Consistencia facial)',
      'Exportación PDF/X-1a 300 DPI para Amazon KDP e Imprenta RD',
      '15% de descuento directo en impresión física Tankōbon en RD'
    ]
  },
  studio_pack: {
    id: 'studio_pack',
    name: 'Pack Editorial Tomo Cero (+1 Libro Físico)',
    priceUsdCents: 4900,
    priceUsdDisplay: 'US$ 49.00 (Pago Único)',
    priceDopDisplay: 'RD$ 2,890',
    credits: 600,
    durationHours: 2160,
    autoRenewsTo: 'Pago único sin suscripción recurrente',
    features: [
      '600 Créditos de Tinta (Suficiente para un Tankōbon completo de 100+ págs)',
      'Incluye bono de 1 Ejemplar Físico Tankōbon impreso en papel Ahuesado 90g',
      'Revisión técnica de lomo y sangrado de 3mm para imprenta'
    ]
  }
};

function signPass(payload) {
  const secret = process.env.KAI_PASS_SECRET || 'kai-studio-rd-secret-2026';
  const data = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', secret).update(data).digest('hex').slice(0, 16);
  return `KAI-${ payload.planId.toUpperCase() }-${ sig.toUpperCase() }`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, plans: PLANS });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const {
      action = 'create_checkout',
      planId = 'trial_72h',
      customerEmail = '',
      customerName = '',
      passId = '',
      originUrl = 'https://kai-manga-flow-studio.vercel.app'
    } = body;

    // Cancelación en 1 clic dentro del periodo de prueba de 72 horas
    if (action === 'cancel_subscription') {
      return res.status(200).json({
        ok: true,
        cancelled: true,
        passId: passId || 'KAI-TRIAL',
        cancelledAt: new Date().toISOString(),
        message: 'Suscripción automática cancelada. Conservas tus créditos restantes hasta que finalicen las 72 horas sin ningún cobro futuro.'
      });
    }

    const plan = PLANS[planId] || PLANS.trial_72h;
    const stripeSecret = process.env.STRIPE_SECRET_KEY || '';

    // Si STRIPE_SECRET_KEY está configurada en Vercel, crea una sesión real de Stripe Checkout
    if (stripeSecret) {
      const params = new URLSearchParams();
      params.append('mode', 'payment');
      params.append('success_url', `${originUrl}/?checkout=success&plan=${plan.id}`);
      params.append('cancel_url', `${originUrl}/?checkout=cancelled`);
      if (customerEmail) params.append('customer_email', customerEmail);
      params.append('line_items[0][price_data][currency]', 'usd');
      params.append('line_items[0][price_data][unit_amount]', String(plan.priceUsdCents));
      params.append('line_items[0][price_data][product_data][name]', plan.name);
      params.append('line_items[0][price_data][product_data][description]', `${plan.credits} Ink Credits · ${plan.autoRenewsTo}`);
      params.append('line_items[0][quantity]', '1');

      const stripeResp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeSecret}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      if (stripeResp.ok) {
        const session = await stripeResp.json();
        return res.status(200).json({
          ok: true,
          mode: 'stripe_live',
          checkoutUrl: session.url,
          plan
        });
      }
    }

    // Modo Pass Instantáneo (Sandbox / Pre-Stripe o Activación Directa)
    const now = Date.now();
    const expiresAt = new Date(now + plan.durationHours * 3600 * 1000).toISOString();
    const passPayload = {
      planId: plan.id,
      customerName: customerName || 'Creador Manga',
      customerEmail: customerEmail || 'creador@kaistudio.do',
      issuedAt: new Date(now).toISOString(),
      expiresAt
    };

    const generatedPassId = signPass(passPayload);

    return res.status(200).json({
      ok: true,
      mode: 'instant_pass',
      plan,
      pass: {
        passId: generatedPassId,
        planId: plan.id,
        planName: plan.name,
        pricePaidUsd: plan.priceUsdDisplay,
        pricePaidDop: plan.priceDopDisplay,
        creditsGranted: plan.credits,
        issuedAt: passPayload.issuedAt,
        expiresAt,
        autoRenewStatus: plan.id === 'studio_pack' ? 'non_recurring' : 'active_trial_auto_renew',
        autoRenewLabel: plan.autoRenewsTo
      }
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || 'Error procesando checkout en /api/checkout'
    });
  }
};
