import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = req.headers.get('Authorization') ?? '';
  const [scheme, token] = authorization.split(' ', 2);
  if (scheme !== 'Bearer' || !token) {
    return json({ error: 'Authentification requise' }, 401);
  }

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) throw new Error('Supabase server credentials are unavailable');

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Valider le JWT auprès de Supabase Auth, ne jamais faire confiance au profil
    // ou au rôle transmis dans le body / les métadonnées modifiables du client.
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) {
      return json({ error: 'Session invalide ou expirée' }, 401);
    }

    // Le rôle stocké dans profiles est la source d'autorisation utilisée par la DB.
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (profile?.role !== 'admin') {
      return json({ error: 'Accès réservé aux administrateurs' }, 403);
    }

    const { data, error } = await admin.rpc('get_platform_stats');
    if (error) throw error;
    if (!data || data.isAvailable !== true) throw new Error('Invalid analytics RPC response');

    return json(data);
  } catch (error) {
    console.error('[platform-stats] SQL aggregation failed', error);
    return json({ error: 'Unable to load platform statistics' }, 500);
  }
});
