import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js 16 Proxy (replaces deprecated middleware.ts):
 * Refreshes Supabase Auth session cookies when Supabase is configured,
 * without ever blocking public landing `/` or Guest/Demo mode on `/studio`.
 */
export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    // Triggers session refresh if an auth cookie exists; never redirects guests.
    await supabase.auth.getUser();
  } catch {
    // Degrade gracefully without blocking guest access.
  }

  return response;
}

export const config = {
  matcher: ['/studio/:path*', '/login', '/auth/:path*', '/api/:path*'],
};
