import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const client = await createSupabaseServerClient();
  const user = client ? (await client.auth.getUser()).data.user : null;
  return Response.json({ signedIn: Boolean(user) }, {
    headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
  });
}
