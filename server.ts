import express from 'express';
import type { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import type { LiveServerMessage } from '@google/genai';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import {
  catalogDateWindow,
  clampLimit,
  clampRadiusKm,
  formatEventPrice,
  normalizeCategory,
  sanitizeSearchTerm,
  ticketStatusLabel,
  withinRadius,
  VISIBLE_TICKET_STATUSES,
} from './src/server/aiCatalog.ts';
import {
  initServerRustCore,
  serverVerifyQr,
  execRustServer,
  serverNearbyEvents,
} from './src/server/rustServerCore.ts';
import {
  getAIAnswerStyleInstruction,
  normalizeAIAssistantPreferences,
} from './src/constants/aiPreferences.ts';
import { AI_SYSTEM_INSTRUCTION as SHARED_AI_SYSTEM_INSTRUCTION } from './src/constants/aiSystemPrompt.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialisation officielle du SDK Google GenAI côté serveur
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

function getRequestGeminiClient(req: Request): GoogleGenAI | null {
  const apiKey = req.header('x-gemini-api-key')?.trim() || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (apiKey === process.env.GEMINI_API_KEY) return ai;
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

const DEFAULT_SUPABASE_URL = 'https://lwwiolbofrqakvrdvbbj.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3d2lvbGJvZnJxYWt2cmR2YmJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNTIzNjIsImV4cCI6MjEwNDcyODM2Mn0.TCCj8D-K_CmVwlFK1yiE2WL6kQRcjvPR_Bq3QrCLalw';

const supabaseUrl = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

const supabaseServer = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

type DbClient = SupabaseClient;

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  const raw = Array.isArray(header) ? header[0] : header;
  const match = raw?.match(/^Bearer\s+(\S+)/i);
  return match?.[1] ?? null;
}

/** L'identité vient uniquement du JWT Supabase, jamais du corps de la requête. */
async function resolveRequestActor(req: Request): Promise<{ userId: string | null; client: DbClient }> {
  const token = bearerToken(req);
  if (!token) return { userId: null, client: supabaseServer };

  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data.user) return { userId: null, client: supabaseServer };

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return { userId: data.user.id, client: userClient };
}

async function checkAiQuota(
  actor: { userId: string | null },
  req: Request
): Promise<{ allowed: boolean; message?: string; reason?: string }> {
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return { allowed: true };

  try {
    const rawIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const ipDigest = crypto.createHash('sha256').update(rawIp).digest('hex');
    const isAuthenticated = Boolean(actor.userId);
    const identifier = isAuthenticated ? `user_${actor.userId}` : `ip_${ipDigest}`;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data, error } = await adminClient.rpc('check_and_increment_ai_quota', {
      p_identifier: identifier,
      p_is_authenticated: isAuthenticated,
    });

    if (error || !data) {
      console.warn('[server.ts] Quota check warning:', error?.message || 'null data');
      return { allowed: true };
    }

    if (data.allowed === false) {
      return {
        allowed: false,
        message: data.message || 'Quota de requêtes concierge dépassé. Veuillez patienter.',
        reason: data.reason,
      };
    }

    return { allowed: true };
  } catch (err) {
    console.warn('[server.ts] Quota check exception:', err);
    return { allowed: true };
  }
}

const AI_SYSTEM_INSTRUCTION = SHARED_AI_SYSTEM_INSTRUCTION;

const GEMINI_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'search_events',
        description: 'Recherche des événements publics actifs par mot-clé, catégorie, gratuité ou période.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING, description: 'Terme de recherche (titre, lieu, artiste, etc.)' },
            category: {
              type: Type.STRING,
              description: 'Catégorie de l’événement (concert, festival, conference, formation, exposition, spectacle, cultural, private)',
            },
            free_only: { type: Type.BOOLEAN, description: 'Si vrai, renvoie uniquement les événements gratuits' },
            date_range: {
              type: Type.STRING,
              description: 'Filtre temporel (today, this_weekend, this_week, this_month, upcoming)',
            },
            limit: { type: Type.INTEGER, description: 'Nombre maximum de résultats (1 à 8)' },
          },
        },
      },
      {
        name: 'get_event_details',
        description: 'Obtient les détails complets d’un événement via son ID.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            event_id: { type: Type.STRING, description: 'Identifiant UUID de l’événement' },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'get_nearby_events',
        description: 'Trouve les événements proches d’une position GPS géographique.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER, description: 'Latitude' },
            lng: { type: Type.NUMBER, description: 'Longitude' },
            radius_km: { type: Type.NUMBER, description: 'Rayon de recherche en km (max 25 km)' },
            limit: { type: Type.INTEGER, description: 'Nombre maximum de résultats (1 à 8)' },
          },
          required: ['lat', 'lng'],
        },
      },
      {
        name: 'get_my_tickets',
        description: 'Récupère les billets et réservations actives de l’utilisateur connecté.',
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: 'get_my_favorites',
        description: 'Récupère les événements mis en favoris par l’utilisateur.',
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: 'get_my_profile_lite',
        description: 'Récupère les informations publiques de base du profil utilisateur.',
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: 'get_my_follows',
        description: 'Récupère les artistes, organisateurs et profils suivis par l’utilisateur connecté.',
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
    ],
  },
];

async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  context: {
    userId: string | null;
    client: DbClient;
    userLocation?: { lat: number; lng: number } | null;
    turnEventIds: Set<string>;
  }
): Promise<unknown> {
  const { turnEventIds, userId, client } = context;

  switch (name) {
    case 'search_events': {
      const query = sanitizeSearchTerm(args.query);
      const category = normalizeCategory(args.category);
      const freeOnly = Boolean(args.free_only);
      const limit = clampLimit(args.limit);
      const window = catalogDateWindow(args.date_range);

      let dbQuery = supabaseServer
        .from('events')
        .select('id, title, category, starts_at, location_name, city, price_min, currency')
        .eq('status', 'published')
        .gte('starts_at', window.from)
        .order('starts_at', { ascending: true })
        .limit(limit);

      if (window.to) dbQuery = dbQuery.lte('starts_at', window.to);
      if (query) {
        const pattern = `%${query}%`;
        dbQuery = dbQuery.or(
          `title.ilike."${pattern}",description.ilike."${pattern}",location_name.ilike."${pattern}",city.ilike."${pattern}"`
        );
      }
      if (category) dbQuery = dbQuery.eq('category', category);
      if (freeOnly) dbQuery = dbQuery.eq('price_min', 0);

      const { data, error } = await dbQuery;
      if (error || !data) return { count: 0, events: [] };

      const eventsList = data.map((ev) => {
        turnEventIds.add(ev.id);
        return {
          id: ev.id,
          title: ev.title,
          category: ev.category,
          starts_at: ev.starts_at,
          location: `${ev.location_name || ''}, ${ev.city || 'Lomé'}`.replace(/^, /, ''),
          price: formatEventPrice(ev.price_min, ev.currency),
        };
      });

      return { count: eventsList.length, events: eventsList };
    }

    case 'get_event_details': {
      const eventId = String(args.event_id || '').trim();
      if (!/^[0-9a-f-]{36}$/i.test(eventId)) return { error: 'Identifiant d’événement manquant.' };

      const { data, error } = await supabaseServer
        .from('events')
        .select('id, title, description, category, starts_at, ends_at, location_name, location_address, city, country, price_min, price_max, currency, capacity')
        .eq('id', eventId)
        .eq('status', 'published')
        .maybeSingle();

      if (error || !data) return { error: 'Événement introuvable ou non publié.' };

      turnEventIds.add(data.id);
      return {
        id: data.id,
        title: data.title,
        category: data.category,
        starts_at: data.starts_at,
        ends_at: data.ends_at,
        location_name: data.location_name,
        location_address: data.location_address,
        city: data.city,
        price_range:
          data.price_min === 0 && !data.price_max
            ? 'Gratuit'
            : `${data.price_min || 0} - ${data.price_max || data.price_min || 0} ${data.currency || 'FCFA'}`,
        description: (data.description || '').slice(0, 350),
      };
    }

    case 'get_nearby_events': {
      const lat = Number(args.lat ?? context.userLocation?.lat);
      const lng = Number(args.lng ?? context.userLocation?.lng);
      const radiusKm = clampRadiusKm(args.radius_km);
      const limit = clampLimit(args.limit);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { error: 'Coordonnées GPS invalides.' };

      const { data, error } = await supabaseServer.rpc('get_nearby_events_rpc', {
        p_lat: lat,
        p_lng: lng,
        p_radius_km: radiusKm,
        p_limit: limit,
      });

      if (!error && Array.isArray(data)) {
        const eventsList = data.map((ev) => {
          turnEventIds.add(ev.id);
          return {
            id: ev.id,
            title: ev.title,
            category: ev.category,
            starts_at: ev.starts_at,
            location: `${ev.location_name || ''}, ${ev.city || 'Lomé'}`.replace(/^, /, ''),
            price: formatEventPrice(ev.price_min, ev.currency),
            distance: `${ev.distance_km} km`,
          };
        });
        return { count: eventsList.length, events: eventsList, radius_km: radiusKm };
      }

      const { data: fallback } = await supabaseServer
        .from('events')
        .select('id, title, category, starts_at, location_name, city, price_min, currency, latitude, longitude')
        .eq('status', 'published')
        .gte('starts_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
        .limit(80);

      let nearby = await serverNearbyEvents(lat, lng, radiusKm, limit, fallback || []);
      if (!nearby || nearby.length === 0) {
        nearby = withinRadius(fallback || [], lat, lng, radiusKm, limit);
      }
      const eventsList = nearby.map((ev) => {
        turnEventIds.add(ev.id);
        return {
          id: ev.id,
          title: ev.title,
          category: ev.category,
          starts_at: ev.starts_at,
          location: `${ev.location_name || ''}, ${ev.city || 'Lomé'}`.replace(/^, /, ''),
          price: formatEventPrice(ev.price_min, ev.currency),
          distance: `${ev.distance_km} km`,
        };
      });
      return { count: eventsList.length, events: eventsList, radius_km: radiusKm };
    }

    case 'get_my_tickets': {
      if (!userId) return { authenticated: false, message: 'Connectez-vous pour consulter vos billets.' };

      const { data, error } = await client
        .from('tickets')
        .select('ticket_type, quantity, price_paid, currency, status, events(id, title, starts_at, location_name, city)')
        .eq('user_id', userId)
        .in('status', [...VISIBLE_TICKET_STATUSES])
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) return { count: 0, tickets: [], error: 'Impossible de récupérer les billets.' };

      const tickets = (data || []).map((ticket) => {
        const event = firstRelation(ticket.events);
        if (event?.id) turnEventIds.add(event.id);
        return {
          event_title: event?.title || 'Événement',
          ticket_type: ticket.ticket_type,
          quantity: ticket.quantity || 1,
          status: ticketStatusLabel(ticket.status),
          starts_at: event?.starts_at || 'Date à confirmer',
          location: event ? `${event.location_name || ''}, ${event.city || 'Lomé'}`.replace(/^, /, '') : 'Lomé',
          price_paid: `${ticket.price_paid} ${ticket.currency || 'FCFA'}`,
        };
      });
      return { count: tickets.length, tickets };
    }

    case 'get_my_favorites': {
      if (!userId) return { authenticated: false, message: 'Connectez-vous pour accéder à vos favoris.' };

      const { data, error } = await client
        .from('event_likes')
        .select('event_id, events(id, title, category, starts_at, location_name, city, price_min, currency)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) return { count: 0, favorites: [], error: 'Impossible de récupérer les favoris.' };

      const favorites = (data || []).flatMap((row) => {
        const ev = firstRelation(row.events);
        if (!ev?.id) return [];
        turnEventIds.add(ev.id);
        return [{
          id: ev.id,
          title: ev.title,
          category: ev.category,
          starts_at: ev.starts_at,
          location: `${ev.location_name || ''}, ${ev.city || 'Lomé'}`.replace(/^, /, ''),
          price: formatEventPrice(ev.price_min, ev.currency),
        }];
      });
      return { count: favorites.length, favorites };
    }

    case 'get_my_profile_lite': {
      if (!userId) return { authenticated: false, message: 'L’utilisateur n’est pas connecté (mode invité).' };

      const { data, error } = await client
        .from('profiles')
        .select('name, city, country, role, bio')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) {
        return { authenticated: true, first_name: 'Participant', role: 'participant', city: 'Lomé' };
      }

      const firstName = data.name ? String(data.name).trim().split(/\s+/)[0] : 'Participant';
      return {
        authenticated: true,
        first_name: firstName,
        role: data.role || 'participant',
        city: data.city || 'Lomé',
        country: data.country || 'TG',
        preferences: data.bio ? String(data.bio).slice(0, 150) : null,
      };
    }

    case 'get_my_follows': {
      if (!userId) return { authenticated: false, message: 'Connectez-vous pour consulter vos abonnements.' };

      const [artistFollows, organizationFollows, userFollows] = await Promise.all([
        client.from('artist_follows').select('artist_id').eq('user_id', userId).limit(10),
        client.from('organization_follows').select('organization_id').eq('user_id', userId).limit(10),
        client.from('user_follows').select('following_id').eq('follower_id', userId).limit(10),
      ]);
      const followError = artistFollows.error || organizationFollows.error || userFollows.error;
      if (followError) return { error: 'Impossible de récupérer les abonnements de votre compte.' };

      const artistIds = (artistFollows.data || []).map((row) => row.artist_id);
      const organizationIds = (organizationFollows.data || []).map((row) => row.organization_id);
      const followedUserIds = (userFollows.data || []).map((row) => row.following_id);
      const [artists, organizations, profiles] = await Promise.all([
        artistIds.length
          ? client.from('artists').select('id, name, genres').in('id', artistIds)
          : Promise.resolve({ data: [], error: null }),
        organizationIds.length
          ? client.from('organizations').select('id, name, city, country').in('id', organizationIds)
          : Promise.resolve({ data: [], error: null }),
        followedUserIds.length
          ? client.from('public_profiles').select('id, name, role, city, country').in('id', followedUserIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      const detailsError = artists.error || organizations.error || profiles.error;
      if (detailsError) return { error: 'Impossible de récupérer les détails de vos abonnements.' };

      return {
        artists: artists.data || [],
        organizations: organizations.data || [],
        people: profiles.data || [],
      };
    }

    default:
      return { error: `Outil ${name} non reconnu.` };
  }
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

const app = express();
const httpServer = createServer(app);

app.use(express.json({ limit: '10mb' }));

// Neutralisation sécurisée des scripts télémétrie Vercel résiduels
app.use('/_vercel', (_req: Request, res: Response) => {
  res.type('application/javascript').send('/* noop */');
});

// Health / Status endpoint
app.get('/api/ai/status', (_req: Request, res: Response) => {
  res.json({
    active: Boolean(process.env.GEMINI_API_KEY),
    model: 'gemini-2.5-flash',
    provider: 'GoogleGenAI',
  });
});

// Endpoint de streaming conversationnel (SSE)
app.post('/api/ai/assistant/stream', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const { messages = [], userLocation } = req.body ?? {};
  const preferences = normalizeAIAssistantPreferences(req.body?.preferences);
  const systemInstruction = `${AI_SYSTEM_INSTRUCTION}\n\n${getAIAnswerStyleInstruction(preferences.answerStyle)}`;
  const actor = await resolveRequestActor(req);
  const quota = await checkAiQuota(actor, req);
  if (!quota.allowed) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: quota.message, reason: quota.reason })}\n\n`);
    res.end();
    return;
  }
  const turnEventIds = new Set<string>();

  try {
    const requestAi = getRequestGeminiClient(req);
    if (!requestAi) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: 'Aucune clé Gemini personnelle ou serveur n’est configurée.' })}\n\n`);
      res.end();
      return;
    }

    // Construction de l'historique Gemini
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text?: string; functionCall?: unknown; functionResponse?: unknown }> }> = [];

    // Contexte initial si fourni
    if (userLocation?.lat && userLocation?.lng) {
      contents.push({
        role: 'user',
        parts: [{ text: `[Contexte GPS : lat=${userLocation.lat}, lng=${userLocation.lng}]` }],
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'Bien noté, je prends en compte votre localisation pour vos sorties.' }],
      });
    }

    for (const msg of messages) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.text || '' }],
      });
    }

    // Boucle de dialogue avec résolution des Function Calls
    let finalAnswer = '';
    const maxIterations = 5;

    for (let iteration = 1; iteration <= maxIterations; iteration++) {
      const responseStream = await requestAi.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction,
          tools: GEMINI_TOOLS,
          temperature: preferences.temperature,
          maxOutputTokens: preferences.maxOutputTokens,
        },
      });

      const functionCalls = new Map<string, { name: string; args: Record<string, unknown> }>();
      let responseText = '';

      for await (const chunk of responseStream) {
        if (chunk.text) {
          responseText += chunk.text;
        }

        for (const fc of chunk.functionCalls || []) {
          if (!fc.name) throw new Error('Gemini a demandé un outil sans nom.');
          const args = (fc.args as Record<string, unknown>) || {};
          functionCalls.set(`${fc.name}:${JSON.stringify(args)}`, { name: fc.name, args });
        }
      }

      if (functionCalls.size > 0) {
        if (iteration === maxIterations) {
          throw new Error('La recherche a nécessité trop d’étapes. Simplifiez votre demande et réessayez.');
        }
        const calls = Array.from(functionCalls.values());
        contents.push({
          role: 'model',
          parts: calls.map(({ name, args }) => ({ functionCall: { name, args } })),
        });
        contents.push({
          role: 'user',
          parts: await Promise.all(calls.map(async ({ name, args }) => {
            const response = await executeToolCall(name, args, {
              userId: actor.userId,
              client: actor.client,
              userLocation,
              turnEventIds,
            });
            return { functionResponse: { name, response } };
          })),
        });
        continue;
      }

      finalAnswer = responseText.trim();
      break;
    }

    if (!finalAnswer) {
      throw new Error('Gemini n’a renvoyé aucun texte. Reformulez votre question ou réessayez.');
    }

    const answerParts = Array.from(finalAnswer);
    for (let offset = 0; offset < answerParts.length; offset += 96) {
      res.write(`event: chunk\ndata: ${JSON.stringify({ text: answerParts.slice(offset, offset + 96).join('') })}\n\n`);
    }

    // Événement final avec les IDs vérifiés
    res.write(`event: done\ndata: ${JSON.stringify({ verifiedEventIds: Array.from(turnEventIds) })}\n\n`);
    res.end();
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erreur lors de la génération avec Gemini';
    console.error('[Gemini Stream Error]:', err);
    res.write(`event: error\ndata: ${JSON.stringify({ error: errorMsg })}\n\n`);
    res.end();
  }
});

// Endpoint synchrone non-streaming
app.post('/api/ai/generate', async (req: Request, res: Response) => {
  const { prompt, currentEvent, userLocation } = req.body ?? {};
  const preferences = normalizeAIAssistantPreferences(req.body?.preferences);
  const systemInstruction = `${AI_SYSTEM_INSTRUCTION}\n\n${getAIAnswerStyleInstruction(preferences.answerStyle)}`;
  const actor = await resolveRequestActor(req);
  const quota = await checkAiQuota(actor, req);
  if (!quota.allowed) {
    res.status(429).json({ error: quota.message, reason: quota.reason });
    return;
  }
  const turnEventIds = new Set<string>();

  try {
    const requestAi = getRequestGeminiClient(req);
    if (!requestAi) {
      res.status(503).json({ error: 'Aucune clé Gemini personnelle ou serveur n’est configurée.' });
      return;
    }

    let fullPrompt = prompt || '';
    if (currentEvent) {
      fullPrompt = `À propos de l'événement "${currentEvent.title}" (${currentEvent.location_name || ''}, ${currentEvent.city || 'Lomé'}) : ${prompt}`;
    }

    const contents: Array<{ role: 'user' | 'model'; parts: Array<Record<string, unknown>> }> = [
      { role: 'user', parts: [{ text: fullPrompt }] },
    ];
    let text = '';
    const maxIterations = 5;

    for (let iteration = 1; iteration <= maxIterations; iteration++) {
      const response = await requestAi.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction,
          tools: GEMINI_TOOLS,
          temperature: preferences.temperature,
          maxOutputTokens: preferences.maxOutputTokens,
        },
      });

      const functionCalls = response.functionCalls || [];
      if (functionCalls.length === 0) {
        text = response.text || '';
        break;
      }
      if (iteration === maxIterations) {
        throw new Error('La recherche a nécessité trop d’étapes. Simplifiez votre demande et réessayez.');
      }

      const calls = functionCalls.map((fc) => {
        if (!fc.name) throw new Error('Gemini a demandé un outil sans nom.');
        return { name: fc.name, args: (fc.args as Record<string, unknown>) || {} };
      });
      contents.push({
        role: 'model',
        parts: calls.map(({ name, args }) => ({ functionCall: { name, args } })),
      });
      const responses = await Promise.all(calls.map(async ({ name, args }) => {
        const response = await executeToolCall(name, args, {
          userId: actor.userId,
          client: actor.client,
          userLocation,
          turnEventIds,
        });
        return { functionResponse: { name, response } };
      }));
      contents.push({ role: 'user', parts: responses });
    }

    if (!text.trim()) {
      throw new Error('Gemini n’a renvoyé aucun texte. Reformulez votre question ou réessayez.');
    }

    res.json({
      text,
      verifiedEventIds: Array.from(turnEventIds),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erreur serveur';
    console.error('[Gemini Generate Error]:', err);
    res.status(500).json({ error: errorMsg });
  }
});

// ====================================================================
// ENDPOINTS HAUTE PERFORMANCE DU CŒUR RUST / WEBASSEMBLY
// ====================================================================

app.post('/api/tickets/verify-qr', async (req: Request, res: Response) => {
  const { payload, eventId } = req.body ?? {};
  if (!payload) {
    res.status(400).json({ valid: false, reason: 'Payload QR code manquant' });
    return;
  }
  const result = await serverVerifyQr(String(payload), eventId ? String(eventId) : undefined);
  res.json(result);
});

app.post('/api/finance/calculate-fees', async (req: Request, res: Response) => {
  const { pricePaid, quantity, paymentMethod } = req.body ?? {};
  const result = await execRustServer({
    op: 'financial_fees',
    price_paid: Number(pricePaid) || 0,
    quantity: Number(quantity) || 1,
    payment_method: paymentMethod || 'mobile_money',
  });
  res.json(result || { error: 'Calcul de commissions indisponible' });
});

app.get('/api/health/rust', async (_req: Request, res: Response) => {
  const wasm = await initServerRustCore();
  res.json({
    status: 'ok',
    engine: wasm ? 'rust-wasm' : 'fallback-js',
    timestamp: Date.now(),
  });
});


// WebSocket Live API pour streaming voix temps réel
const wss = new WebSocketServer({ server: httpServer, path: '/live' });

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('[Live API] Client connected');
  let session: Awaited<ReturnType<typeof ai.live.connect>> | null = null;

  try {
    session = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction: AI_SYSTEM_INSTRUCTION + "\nTu es le concierge vocal en direct de Gbaigbance. Réponds de façon concise et vivante en français !",
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          for (const part of message.serverContent?.modelTurn?.parts ?? []) {
            if (part.inlineData?.data) {
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
              }
            }
          }
          if (message.serverContent?.interrupted) {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          }
        },
        onerror: (err) => {
          console.error('[Live API Error]:', err);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ error: err.message || 'Erreur session vocale Live' }));
          }
        },
        onclose: () => {
          console.log('[Live API] Session closed by Gemini');
        },
      },
    });

    clientWs.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.audio && session) {
          session.sendRealtimeInput({
            audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        }
      } catch (err) {
        console.error('[Live API parse error]:', err);
      }
    });

    clientWs.on('close', () => {
      console.log('[Live API] Client disconnected');
      try {
        session?.close();
      } catch {
        // Ignorer
      }
    });
  } catch (err: unknown) {
    console.error('[Live API Connection Failed]:', err);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ error: 'Impossible de connecter la session vocale Live.' }));
      clientWs.close();
    }
  }
});

// Montage de Vite en mode middleware pour le dev ou distribution statique en production
async function startServer() {
  await initServerRustCore();
  const distDir = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(path.resolve(distDir, 'index.html'));
  const isProd = process.env.NODE_ENV === 'production' || hasDist;

  if (isProd && hasDist) {
    app.use(express.static(distDir));
    app.use((_req: Request, res: Response) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[Gbaigbance Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Start Error]:', err);
  process.exit(1);
});

