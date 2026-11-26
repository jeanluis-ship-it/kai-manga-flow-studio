import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const base = process.cwd();
const load = (p) => readFileSync(join(base, p), 'utf8');

test('Sprint 4: SQL migration 002 defines handle_new_user trigger and plan columns', () => {
  const sqlPath = 'supabase/migrations/002_auth_profiles_plans.sql';
  assert.ok(existsSync(join(base, sqlPath)));
  const sql = load(sqlPath);
  assert.match(sql, /trial_ends_at/);
  assert.match(sql, /hd_render_enabled/);
  assert.match(sql, /render_priority/);
  assert.match(sql, /on_auth_user_created/);
  assert.match(sql, /handle_new_user/);
});

test('Sprint 4: Supabase SSR auth routes, proxy.ts, and /login exist without blocking guests', () => {
  assert.ok(existsSync(join(base, 'lib/supabase/browser.ts')));
  assert.ok(existsSync(join(base, 'lib/supabase/server.ts')));
  assert.ok(existsSync(join(base, 'proxy.ts')));
  assert.ok(existsSync(join(base, 'app/auth/callback/route.ts')));
  assert.ok(existsSync(join(base, 'app/login/page.tsx')));

  const callback = load('app/auth/callback/route.ts');
  assert.match(callback, /exchangeCodeForSession/);
  const login = load('app/login/page.tsx');
  assert.match(login, /signInWithOAuth/);
  assert.match(login, /Continuar con Google/);
});

test('Sprint 4: PLAN_CATALOG, 402 QUOTA_EXCEEDED server guards, QuotaMeter, and checkout modal exist', () => {
  const quotas = load('lib/plans/quotas.ts');
  assert.match(quotas, /maxPages:\s*10/);
  assert.match(quotas, /maxPages:\s*50/);
  assert.match(quotas, /maxPages:\s*100/);
  assert.match(quotas, /maxPages:\s*200/);
  assert.match(quotas, /\$0\.00/);
  assert.match(quotas, /\$2\.49/);
  assert.match(quotas, /\$3\.49/);
  assert.match(quotas, /\$4\.49/);
  assert.match(quotas, /Motor Nano Banana 2 HD/);
  assert.match(quotas, /Nano Banana 2 HD \+ Prioridad de Render/);
  assert.match(quotas, /Empaque completo e ISBN/);
  assert.match(quotas, /export function checkQuota/);

  assert.ok(existsSync(join(base, 'components/studio/QuotaMeter.tsx')));
  const quotaMeter = load('components/studio/QuotaMeter.tsx');
  assert.match(quotaMeter, /Páginas:\s*\{usedPages\}\s*\/\s*\{limitPages\}/);
  assert.match(quotaMeter, /--genko-/);

  const kaiApi = load('app/api/kai/script/route.ts');
  assert.match(kaiApi, /QUOTA_EXCEEDED/);
  assert.match(kaiApi, /status:\s*402/);

  const imgApi = load('app/api/flux/generate/route.ts');
  assert.match(imgApi, /QUOTA_EXCEEDED/);
  assert.match(imgApi, /status:\s*402/);

  assert.ok(existsSync(join(base, 'components/studio/PricingUpgradeModal.tsx')));
  assert.ok(existsSync(join(base, 'app/api/billing/checkout/route.ts')));
});
