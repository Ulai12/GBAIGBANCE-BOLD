import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Webhook paiement Mobile Money / PSP.
 * Verifie HMAC (PAYMENT_WEBHOOK_SECRET) si present.
 * Confirme via confirm_ticket_payment — billets emis uniquement si succeeded.
 */

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-gba-signature',
};

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'POST only' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rawBody = await req.text();
  const secret = Deno.env.get('PAYMENT_WEBHOOK_SECRET') || '';

  if (!secret) {
    console.error('[payment-webhook] PAYMENT_WEBHOOK_SECRET non configure');
    return new Response(JSON.stringify({ success: false, error: 'Webhook signature verification is unavailable' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const provided = req.headers.get('x-gba-signature') || '';
  const expected = await hmacHex(secret, rawBody);
  if (!provided || !timingSafeEqual(provided.toLowerCase(), expected.toLowerCase())) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid signature' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: {
    payment_id?: string;
    provider_ref?: string;
    provider?: string;
    status?: string;
  };
  try {
    body = JSON.parse(rawBody || '{}');
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const paymentId = body.payment_id;
  if (!paymentId || !/^[0-9a-f-]{36}$/i.test(paymentId)) {
    return new Response(JSON.stringify({ success: false, error: 'payment_id uuid requis' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const status = (body.status || 'succeeded').toLowerCase();

  if (status === 'failed' || status === 'cancelled') {
    const { error } = await supabase
      .from('payments')
      .update({
        status: status === 'cancelled' ? 'cancelled' : 'failed',
        provider_ref: body.provider_ref ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId)
      .in('status', ['pending', 'initiated']);

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ success: true, status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (status !== 'succeeded') {
    return new Response(JSON.stringify({ success: false, error: 'status non supporte' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await supabase.rpc('confirm_ticket_payment', {
    p_payment_id: paymentId,
    p_provider_ref: body.provider_ref ?? null,
    p_provider: body.provider ?? null,
  });

  if (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(data ?? { success: false }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
