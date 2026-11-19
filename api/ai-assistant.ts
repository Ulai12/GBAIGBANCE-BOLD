import type { IncomingMessage, ServerResponse } from 'node:http';

export interface VercelRequest extends IncomingMessage {
  query: Partial<Record<string, string | string[]>>;
  cookies: Partial<Record<string, string>>;
  body: unknown;
}

export interface VercelResponse extends ServerResponse {
  status: (statusCode: number) => VercelResponse;
  json: (jsonBody: unknown) => VercelResponse;
  send: (body: unknown) => VercelResponse;
}

/**
 * Proxy Vercel plat (même pattern que api/events.ts) vers l'edge Supabase ai-assistant.
 * Évite le 502 "Requested function was not found" des chemins nested api/ai/...
 */

const DEFAULT_SUPABASE_URL = 'https://lwwiolbofrqakvrdvbbj.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3d2lvbGJvZnJxYWt2cmR2YmJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNTIzNjIsImV4cCI6MjEwNDcyODM2Mn0.TCCj8D-K_CmVwlFK1yiE2WL6kQRcjvPR_Bq3QrCLalw';

function readBody(req: VercelRequest): Promise<unknown> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try {
        return Promise.resolve(JSON.parse(req.body));
      } catch {
        return Promise.resolve({});
      }
    }
    return Promise.resolve(req.body);
  }
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function writeSse(res: VercelResponse, payload: Record<string, unknown>) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'authorization, apikey, content-type, x-client-info, x-gemini-api-key, x-request-id',
  );
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  const supabaseUrl = (
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL
  ).replace(/\/+$/, '');
  const anonKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    DEFAULT_SUPABASE_ANON_KEY;
  const body = (await readBody(req)) as {
    messages?: Array<{ role?: string; text?: string; content?: string }>;
    userLocation?: { lat?: number; lng?: number } | null;
    preferences?: unknown;
  };

  const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  const edgeHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: anonKey,
    Authorization: authHeader.startsWith('Bearer ') ? authHeader : `Bearer ${anonKey}`,
  };
  const edgePayload = {
    messages: (body.messages || []).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      text: String(m.text || m.content || '').slice(0, 1000),
      content: String(m.text || m.content || '').slice(0, 1000),
    })),
    userLocation: body.userLocation || null,
    preferences: body.preferences || null,
  };

  try {
    const edgeRes = await fetch(`${supabaseUrl}/functions/v1/ai-assistant`, {
      method: 'POST',
      headers: edgeHeaders,
      body: JSON.stringify(edgePayload),
    });
    const contentType = edgeRes.headers.get('content-type') || '';

    if (contentType.includes('text/event-stream') && edgeRes.body) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      const reader = edgeRes.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      res.end();
      return;
    }
    const data = (await edgeRes.json().catch(() => ({}))) as Record<string, unknown>;

    if (!edgeRes.ok) {
      const message =
        (typeof data.error === 'string' && data.error) ||
        (typeof data.message === 'string' && data.message) ||
        `Erreur assistant IA (${edgeRes.status})`;
      return res.status(edgeRes.status === 429 ? 429 : 502).json({ error: message });
    }
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    const text =
      (typeof data.text === 'string' && data.text) ||
      (typeof data.message === 'string' && data.message) ||
      '';
    const eventIds = Array.isArray(data.event_ids)
      ? data.event_ids
      : Array.isArray(data.verifiedEventIds)
        ? data.verifiedEventIds
        : [];
    if (text) {
      writeSse(res, { text, done: false });
    }
    writeSse(res, { done: true, verifiedEventIds: eventIds, event_ids: eventIds });
    res.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur proxy assistant IA';
    return res.status(502).json({ error: message });
  }
}
