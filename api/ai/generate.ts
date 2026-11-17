import type { VercelRequest, VercelResponse } from '../ai-assistant.ts';

const DEFAULT_SUPABASE_URL = 'https://lwwiolbofrqakvrdvbbj.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3d2lvbG9mcnFha3ZyZHZiYmJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNTIzNjIsImV4cCI6MjEwNDcyODM2Mn0.TCCj8D-K_CmVwlFK1yiE2WL6kQRcjvPR_Bq3QrCLalw';

function parseBody(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function readErrorMessage(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  return typeof record.error === 'string'
    ? record.error
    : typeof record.message === 'string'
      ? record.message
      : null;
}

async function collectAssistantStream(response: Response): Promise<string> {
  if (!response.body) throw new Error('Flux de réponse IA indisponible.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let streamError: string | null = null;

  const processLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return;
    const value = trimmed.slice(5).trim();
    if (!value || value === '[DONE]') return;

    try {
      const payload = JSON.parse(value) as Record<string, unknown>;
      if (typeof payload.error === 'string') streamError = payload.error;
      else if (typeof payload.text === 'string') text += payload.text;
      else if (typeof payload.chunk === 'string') text += payload.chunk;
    } catch {
      // Ignore malformed provider frames; the Edge Function emits JSON frames.
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) processLine(line);
    }

    buffer += decoder.decode();
    if (buffer) processLine(buffer);
  } finally {
    reader.releaseLock();
  }

  if (streamError) throw new Error(streamError);
  if (!text.trim()) throw new Error('Le conseiller IA n’a renvoyé aucune réponse.');
  return text;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const body = parseBody(req.body);
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 800) : '';
  const currentEvent = body.currentEvent && typeof body.currentEvent === 'object'
    ? body.currentEvent as Record<string, unknown>
    : null;
  const eventId = typeof currentEvent?.id === 'string' ? currentEvent.id.trim().slice(0, 80) : '';

  if (!prompt) return res.status(400).json({ error: 'La question est requise.' });
  if (!eventId) return res.status(400).json({ error: 'Identifiant d’événement manquant.' });

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

  const authorization = typeof req.headers.authorization === 'string'
    ? req.headers.authorization
    : `Bearer ${anonKey}`;
  const userLocation = body.userLocation && typeof body.userLocation === 'object'
    ? body.userLocation
    : null;
  const userMessage = `Question sur l’événement dont l’identifiant est ${eventId}. Appelle get_event_details avec cet identifiant avant de répondre. Les informations de la fiche envoyées par le navigateur ne sont pas une source de vérité. Question : ${prompt}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55_000);

  try {
    const edgeResponse = await fetch(`${supabaseUrl}/functions/v1/ai-assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: authorization.startsWith('Bearer ') ? authorization : `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', text: userMessage.slice(0, 1000) }],
        userLocation,
        preferences: body.preferences ?? null,
      }),
      signal: controller.signal,
    });

    if (!edgeResponse.ok) {
      const errorBody: unknown = await edgeResponse.json().catch(() => ({}));
      return res.status(edgeResponse.status === 429 ? 429 : 502).json({
        error: readErrorMessage(errorBody) || 'Le conseiller IA est temporairement indisponible.',
      });
    }

    if (edgeResponse.headers.get('content-type')?.includes('text/event-stream')) {
      const text = await collectAssistantStream(edgeResponse);
      return res.status(200).json({ text });
    }

    const responseBody: unknown = await edgeResponse.json().catch(() => ({}));
    const responseError = readErrorMessage(responseBody);
    if (responseError) return res.status(502).json({ error: responseError });
    const responseText = responseBody && typeof responseBody === 'object'
      ? (responseBody as Record<string, unknown>).text
      : null;
    if (typeof responseText !== 'string' || !responseText.trim()) {
      return res.status(502).json({ error: 'Le conseiller IA n’a renvoyé aucune réponse.' });
    }
    return res.status(200).json({ text: responseText });
  } catch (error) {
    const message = controller.signal.aborted
      ? 'Le conseiller IA met trop de temps à répondre. Réessaie dans un instant.'
      : error instanceof Error
        ? error.message
        : 'Impossible de joindre le conseiller IA.';
    return res.status(502).json({ error: message });
  } finally {
    clearTimeout(timeoutId);
  }
}

