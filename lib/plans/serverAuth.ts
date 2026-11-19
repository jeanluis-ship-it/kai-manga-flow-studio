import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  buildProfileForPlan,
  normalizePlanTier,
  type SubscriptionStatus,
  type UsageSnapshot,
  type UserQuotaProfile,
} from './quotas';

export interface ServerQuotaContext {
  profile: UserQuotaProfile;
  usage: UsageSnapshot;
}

/**
 * Loads the authenticated user's profile and usage from Supabase on the server.
 * Returns null when running in unauthenticated Guest / Demo mode or when Supabase
 * is not configured in environment variables.
 */
export async function getServerQuotaContext(): Promise<ServerQuotaContext | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) return null;

    const [{ data: profileRow }, { data: projects }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('projects').select('id').eq('user_id', user.id),
    ]);

    const projectIds = (projects ?? []).map((p) => p.id);
    let totalPages = 0;
    if (projectIds.length > 0) {
      const { count } = await supabase
        .from('pages')
        .select('id', { count: 'exact', head: true })
        .in('project_id', projectIds);
      totalPages = count ?? 0;
    }

    const tier = normalizePlanTier(profileRow?.plan_tier);
    const profile = buildProfileForPlan(tier, {
      id: user.id,
      email: user.email ?? undefined,
      displayName:
        profileRow?.display_name ||
        (user.user_metadata?.full_name as string | undefined) ||
        user.email?.split('@')[0] ||
        'Mangaka',
      isGuest: false,
      maxProjects: typeof profileRow?.max_projects === 'number' ? profileRow.max_projects : undefined,
      maxPages: typeof profileRow?.max_pages === 'number' ? profileRow.max_pages : undefined,
      trialEndsAt: typeof profileRow?.trial_ends_at === 'string' ? profileRow.trial_ends_at : null,
      hdRenderEnabled:
        typeof profileRow?.hd_render_enabled === 'boolean'
          ? profileRow.hd_render_enabled
          : undefined,
      renderPriority:
        typeof profileRow?.render_priority === 'boolean'
          ? profileRow.render_priority
          : undefined,
      subscriptionStatus: (profileRow?.subscription_status as SubscriptionStatus) || undefined,
    });

    return {
      profile,
      usage: {
        projectCount: projectIds.length,
        totalPages,
      },
    };
  } catch {
    return null;
  }
}
