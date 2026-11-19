import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseBrowserClient, isSupabaseConfigured } from './browser';

export { isSupabaseConfigured };

/**
 * Returns the shared @supabase/ssr browser client when public env vars are set,
 * or null in guest/demo mode so callers degrade cleanly to localStorage.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  return createSupabaseBrowserClient();
}
