export type PlanTier = 'trial' | 'starter' | 'pro' | 'master';

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled';

export interface PlanConfig {
  id: PlanTier;
  name: string;
  priceLabel: string;
  periodLabel: string;
  maxProjects: number;
  maxPages: number;
  hdModelEnabled: boolean; // Motor Nano Banana 2 HD (Gemini 3.1 Flash Image HD)
  renderPriority: boolean;
  highlighted?: boolean;
  badgeLabel?: string;
  features: string[];
}

export const PLAN_CATALOG: Record<PlanTier, PlanConfig> = {
  trial: {
    id: 'trial',
    name: 'Trial',
    priceLabel: '$0.00',
    periodLabel: '3 días',
    maxProjects: 1,
    maxPages: 10,
    hdModelEnabled: false,
    renderPriority: false,
    features: [
      '1 proyecto activo',
      'Hasta 10 páginas totales',
      'KAI estándar',
      'Guías Genkō y Koma-wari',
    ],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    priceLabel: '$2.49',
    periodLabel: '/ mes',
    maxProjects: 5,
    maxPages: 50,
    hdModelEnabled: false,
    renderPriority: false,
    features: [
      '5 proyectos activos',
      'Hasta 50 páginas totales',
      'Nube Supabase',
      'ZIP pre-prensa',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceLabel: '$3.49',
    periodLabel: '/ mes',
    maxProjects: 10,
    maxPages: 100,
    hdModelEnabled: true,
    renderPriority: false,
    highlighted: true,
    badgeLabel: 'Más Popular',
    features: [
      '10 proyectos activos',
      'Hasta 100 páginas totales',
      'Motor Nano Banana 2 HD',
      'Tankōbon B6 y Canva B4',
    ],
  },
  master: {
    id: 'master',
    name: 'Master',
    priceLabel: '$4.49',
    periodLabel: '/ mes',
    maxProjects: 20,
    maxPages: 200,
    hdModelEnabled: true,
    renderPriority: true,
    features: [
      '20 proyectos activos',
      'Hasta 200 páginas totales',
      'Nano Banana 2 HD + Prioridad de Render',
      'Empaque completo e ISBN',
    ],
  },
};

export const PLAN_ORDER: PlanTier[] = ['trial', 'starter', 'pro', 'master'];

export interface UserQuotaProfile {
  id?: string;
  email?: string;
  displayName?: string;
  isGuest: boolean;
  planTier: PlanTier;
  maxProjects: number;
  maxPages: number;
  trialEndsAt: string | null;
  hdRenderEnabled: boolean;
  renderPriority: boolean;
  subscriptionStatus: SubscriptionStatus;
}

export interface UsageSnapshot {
  projectCount: number;
  totalPages: number;
}

export type QuotaAction =
  | 'CREATE_PROJECT'
  | 'ADD_PAGE'
  | 'USE_HD_MODEL'
  | 'USE_RENDER_PRIORITY'
  | 'TRIAL_EXPIRED';

export interface QuotaCheckResult {
  allowed: boolean;
  code?: 'QUOTA_EXCEEDED' | 'TRIAL_EXPIRED';
  requiredPlan?: PlanTier;
  reason?: string;
}

export function normalizePlanTier(raw?: string | null): PlanTier {
  if (raw === 'starter' || raw === 'pro' || raw === 'master' || raw === 'trial') {
    return raw;
  }
  return 'trial';
}

export function buildProfileForPlan(
  tier: PlanTier,
  overrides: Partial<UserQuotaProfile> = {},
): UserQuotaProfile {
  const cfg = PLAN_CATALOG[tier];
  return {
    isGuest: overrides.isGuest ?? true,
    id: overrides.id,
    email: overrides.email,
    displayName: overrides.displayName ?? (overrides.isGuest === false ? 'Mangaka' : 'Invitado'),
    planTier: tier,
    maxProjects: overrides.maxProjects ?? cfg.maxProjects,
    maxPages: overrides.maxPages ?? cfg.maxPages,
    trialEndsAt:
      overrides.trialEndsAt !== undefined
        ? overrides.trialEndsAt
        : tier === 'trial'
        ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        : null,
    hdRenderEnabled: overrides.hdRenderEnabled ?? cfg.hdModelEnabled,
    renderPriority: overrides.renderPriority ?? cfg.renderPriority,
    subscriptionStatus:
      overrides.subscriptionStatus ?? (tier === 'trial' ? 'trialing' : 'active'),
  };
}

export function createGuestQuotaProfile(simulatedPlan?: PlanTier): UserQuotaProfile {
  return buildProfileForPlan(simulatedPlan ?? 'trial', {
    isGuest: true,
    displayName: 'Invitado',
  });
}

function nextTierForLimit(current: PlanTier): PlanTier {
  if (current === 'trial') return 'starter';
  if (current === 'starter') return 'pro';
  return 'master';
}

export function isTrialExpired(profile: UserQuotaProfile, now = Date.now()): boolean {
  if (profile.planTier !== 'trial') return false;
  if (!profile.trialEndsAt) return false;
  const endsMs = Date.parse(profile.trialEndsAt);
  if (!Number.isFinite(endsMs)) return false;
  return now > endsMs;
}

/**
 * Shared frontend/backend quota gate engine.
 * Validates Trial expiration, project limits, page limits (including batch KAI inserts),
 * Nano Banana 2 HD access, and Render Priority access.
 */
export function checkQuota(
  profile: UserQuotaProfile,
  usage: UsageSnapshot,
  action: QuotaAction,
  delta = 1,
): QuotaCheckResult {
  const plan = PLAN_CATALOG[normalizePlanTier(profile.planTier)];
  const maxProjects = Math.max(1, profile.maxProjects || plan.maxProjects);
  const maxPages = Math.max(1, profile.maxPages || plan.maxPages);
  const hdEnabled = Boolean(profile.hdRenderEnabled || plan.hdModelEnabled);
  const priorityEnabled = Boolean(profile.renderPriority || plan.renderPriority);

  if (isTrialExpired(profile)) {
    return {
      allowed: false,
      code: 'TRIAL_EXPIRED',
      requiredPlan: 'starter',
      reason:
        'Tu período de prueba Trial de 3 días finalizó. Sube a Starter, Pro o Master para seguir creando y exportando.',
    };
  }

  if (action === 'TRIAL_EXPIRED') {
    return { allowed: true };
  }

  if (action === 'CREATE_PROJECT') {
    if (usage.projectCount + delta > maxProjects) {
      const req = nextTierForLimit(plan.id);
      return {
        allowed: false,
        code: 'QUOTA_EXCEEDED',
        requiredPlan: req,
        reason: `Alcanzaste el límite de ${maxProjects} ${maxProjects === 1 ? 'proyecto' : 'proyectos'} del Plan ${plan.name}. Sube a ${PLAN_CATALOG[req].name} para crear más obras.`,
      };
    }
    return { allowed: true };
  }

  if (action === 'ADD_PAGE') {
    if (usage.totalPages + delta > maxPages) {
      const req = nextTierForLimit(plan.id);
      const extraLabel =
        delta > 1
          ? ` (intentaste insertar ${delta} páginas con KAI)`
          : '';
      return {
        allowed: false,
        code: 'QUOTA_EXCEEDED',
        requiredPlan: req,
        reason: `Alcanzaste el límite de ${maxPages} páginas del Plan ${plan.name}${extraLabel}. Sube a ${PLAN_CATALOG[req].name} o Pro para continuar tu capítulo.`,
      };
    }
    return { allowed: true };
  }

  if (action === 'USE_HD_MODEL') {
    if (!hdEnabled) {
      return {
        allowed: false,
        code: 'QUOTA_EXCEEDED',
        requiredPlan: 'pro',
        reason: `El Motor Nano Banana 2 HD requiere Plan Pro ($3.49/mes) o Master. Tu plan actual es ${plan.name}.`,
      };
    }
    return { allowed: true };
  }

  if (action === 'USE_RENDER_PRIORITY') {
    if (!priorityEnabled) {
      return {
        allowed: false,
        code: 'QUOTA_EXCEEDED',
        requiredPlan: 'master',
        reason: `La cola de Prioridad de Render es exclusiva del Plan Master ($4.49/mes). Tu plan actual es ${plan.name}.`,
      };
    }
    return { allowed: true };
  }

  return { allowed: true };
}
