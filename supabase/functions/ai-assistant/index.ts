import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import {
  catalogDateWindow,
  clampLimit,
  formatEventPrice,
  normalizeCategory,
  sanitizeSearchTerm,
  ticketStatusLabel,
  VISIBLE_TICKET_STATUSES,
} from '../_shared/aiCatalog.ts';
import { AI_SYSTEM_INSTRUCTION } from '../../../src/constants/aiSystemPrompt.ts';
import {
  getAIAnswerStyleInstruction,
  normalizeAIAssistantPreferences,
} from '../../../src/constants/aiPreferences.ts';

// ====================================================================
// GBAIGBANCE — EDGE FUNCTION: ASSISTANT IA CONTEXTUEL & SÉCURISÉ
// Avec journalisation de débogage avancée et propagation JWT Supabase
// ====================================================================

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const SUPABASE_ANON_KEY =
  Deno.env.get('SUPABASE_ANON_KEY') ||
  Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ||
  Deno.env.get('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
  '';

// --------------------------------------------------------------------
// OUTILS DE JOURNALISATION STRUCTURÉE (LOGS EXPÉRIMENTÉS EDGE RUNTIME)
// --------------------------------------------------------------------
function maskToken(token: string | null | undefined): string {
  if (!token) return 'absent';
  return 'present';
}

function log(reqId: string, tag: string, _message: string, _data?: unknown) {
  console.log('[' + reqId + '][' + tag + '] event');
}

function warn(reqId: string, tag: string, _message: string, _data?: unknown) {
  console.warn('[' + reqId + '][' + tag + '] warning');
}

function err(reqId: string, tag: string, _message: string, _errorObj?: unknown) {
  console.error('[' + reqId + '][' + tag + '] error (details redacted)');
}

// Origines CORS autorisées
const ALLOWED_ORIGINS = [
  'https://gbaigbance-event.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  Deno.env.get('FRONTEND_URL'),
  Deno.env.get('SITE_URL'),
  Deno.env.get('APP_URL'),
].filter((origin): origin is string => Boolean(origin));

async function resolveGeminiModel(apiKey: string, reqId: string): Promise<string> {
  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-flash-latest',
  ];

  try {
    log(reqId, 'MODEL', 'Probing available Gemini models via Google AI Studio API...');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const listRes = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models',
      { headers: { 'x-goog-api-key': apiKey }, signal: controller.signal }
    );
    clearTimeout(timeout);

    if (listRes.ok) {
      const data = await listRes.json();
      const models = data.models || [];
      const supported = models
        .filter((m: { supportedGenerationMethods?: string[] }) =>
          Array.isArray(m.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes('generateContent')
        )
        .map((m: { name: string }) => m.name.replace(/^models\//, ''));

      for (const cand of candidateModels) {
        if (supported.includes(cand)) {
          log(reqId, 'MODEL', `Selected candidate model: "${cand}"`);
          return cand;
        }
      }

      const anyFlash = supported.find((n: string) => n.includes('flash'));
      if (anyFlash) {
        log(reqId, 'MODEL', `Selected available flash model: "${anyFlash}"`);
        return anyFlash;
      }

      if (supported.length > 0) {
        log(reqId, 'MODEL', `Selected fallback supported model: "${supported[0]}"`);
        return supported[0];
      }
    } else {
      warn(reqId, 'MODEL', `Failed to probe models list (HTTP ${listRes.status}). Using default fallback.`);
    }
  } catch (probeError: unknown) {
    warn(reqId, 'MODEL', 'Exception probing Gemini models list. Using fallback.', probeError);
  }

  log(reqId, 'MODEL', 'Using static fallback model: "gemini-2.5-flash"');
  return 'gemini-2.5-flash';
}

function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowed = Boolean(requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin));
  return {
    ...(allowed ? { 'Access-Control-Allow-Origin': requestOrigin! } : {}),
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-gemini-api-key, x-request-id',
    'Access-Control-Max-Age': '86400',
  };
}

// --------------------------------------------------------------------
// DÉCLARATION DES 6 OUTILS EN LECTURE SEULE POUR GEMINI
// --------------------------------------------------------------------
const GEMINI_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'search_events',
        description:
          'Recherche des événements publics actifs par mot-clé, catégorie, gratuité ou période temporelle.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: { type: 'STRING', description: 'Terme de recherche (titre, lieu, artiste, etc.)' },
            category: {
              type: 'STRING',
              description: 'Catégorie de l’événement',
              enum: [
                'concert',
                'festival',
                'conference',
                'formation',
                'exposition',
                'spectacle',
                'cultural',
                'private',
              ],
            },
            free_only: { type: 'BOOLEAN', description: 'Si vrai, renvoie uniquement les événements gratuits' },
            date_range: {
              type: 'STRING',
              description: 'Filtre temporel',
              enum: ['today', 'this_weekend', 'this_week', 'this_month', 'upcoming'],
            },
            limit: { type: 'INTEGER', description: 'Nombre maximum d’événements (max 8)' },
          },
        },
      },
      {
        name: 'get_event_details',
        description: 'Récupère la fiche détaillée d’un événement précis via son identifiant UUID.',
        parameters: {
          type: 'OBJECT',
          properties: {
            event_id: { type: 'STRING', description: 'Identifiant UUID de l’événement' },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'get_nearby_events',
        description: 'Trouve les événements actifs proches d’une coordonnée GPS (formule Haversine).',
        parameters: {
          type: 'OBJECT',
          properties: {
            lat: { type: 'NUMBER', description: 'Latitude de l’utilisateur' },
            lng: { type: 'NUMBER', description: 'Longitude de l’utilisateur' },
            radius_km: { type: 'NUMBER', description: 'Rayon de recherche en kilomètres (max 25)' },
            limit: { type: 'INTEGER', description: 'Nombre maximum de résultats (max 8)' },
          },
          required: ['lat', 'lng'],
        },
      },
      {
        name: 'get_my_profile_lite',
        description:
          'Consulte le profil allégé de l’utilisateur actuellement connecté (prénom, rôle, ville, préférences) via son token JWT sous Row-Level Security (RLS). Ne contient aucune donnée sensible.',
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      {
        name: 'get_my_favorites',
        description:
          'Récupère la liste des événements mis en favoris par l’utilisateur connecté via son identifiant de session sous Row-Level Security (RLS).',
        parameters: {
          type: 'OBJECT',
          properties: {
            limit: { type: 'INTEGER', description: 'Nombre maximum de favoris (max 10)' },
          },
        },
      },
      {
        name: 'get_my_tickets',
        description:
          'Récupère les réservations et billets de l’utilisateur connecté avec les informations de l’événement associé sous Row-Level Security (RLS). Les codes QR et données bancaires sont strictement exclus.',
        parameters: {
          type: 'OBJECT',
          properties: {
            limit: { type: 'INTEGER', description: 'Nombre maximum de billets (max 10)' },
          },
        },
      },
      {
        name: 'get_my_follows',
        description:
          'Récupère les artistes, organisateurs et profils suivis par l’utilisateur connecté, sans données privées.',
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
    ],
  },
];

// --------------------------------------------------------------------
// SYSTEM PROMPT SÉCURISÉ & CONTEXTE AFRIQUE DE L'OUEST
// --------------------------------------------------------------------
const SYSTEM_INSTRUCTION = AI_SYSTEM_INSTRUCTION;

// --------------------------------------------------------------------
// EXÉCUTION DES OUTILS EN LECTURE SEULE (CLIENT SUPABASE AVEC JWT RLS)
// --------------------------------------------------------------------
async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  userClient: ReturnType<typeof createClient>,
  userId: string | null,
  isAuthenticated: boolean,
  turnEventIds: Set<string>,
  reqId: string
): Promise<Record<string, unknown>> {
  const toolStart = performance.now();
  log(reqId, `TOOL:${name}`, `Starting execution of tool "${name}"...`, {
    args,
    isAuthenticated,
    userId: userId || '(none)',
  });

  try {
    switch (name) {
      case 'search_events': {
        const query = sanitizeSearchTerm(args.query);
        const category = normalizeCategory(args.category);
        const freeOnly = Boolean(args.free_only);
        const limit = clampLimit(args.limit);
        const window = catalogDateWindow(args.date_range);

        log(reqId, 'TOOL:search_events', `Building query: term="${query}", category=${category || 'all'}, freeOnly=${freeOnly}, dateRange=${String(args.date_range || 'upcoming')}, limit=${limit}`);

        let dbQuery = userClient
          .from('events')
          .select(
            'id, title, category, starts_at, location_name, city, price_min, currency'
          )
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
        if (category) {
          dbQuery = dbQuery.eq('category', category);
        }
        if (freeOnly) {
          dbQuery = dbQuery.eq('price_min', 0);
        }

        const { data, error } = await dbQuery;
        const dur = Math.round(performance.now() - toolStart);

        if (error) {
          err(reqId, 'TOOL:search_events', `DB query failed (${dur}ms): ${error.message}`, error);
          return { success: false, error: 'Erreur lors de la recherche des événements.' };
        }

        const eventsList = (data || [])
          .slice(0, limit)
          .map(
          (ev: {
            id: string;
            title: string;
            category: string;
            starts_at: string;
            location_name: string;
            city: string;
            price_min: number;
            currency: string;
          }) => {
            turnEventIds.add(ev.id);
            return {
              id: ev.id,
              title: ev.title,
              category: ev.category,
              starts_at: ev.starts_at,
              location: `${ev.location_name || ''}, ${ev.city || 'Lomé'}`.trim(),
              price: formatEventPrice(ev.price_min, ev.currency),
            };
          }
        );

        log(
          reqId,
          'TOOL:search_events',
          `✅ Found ${eventsList.length} matching event(s) in ${dur}ms: [${eventsList.map((e) => e.title).join(', ')}]`
        );
        return { count: eventsList.length, events: eventsList };
      }

      case 'get_event_details': {
        const eventId = String(args.event_id || '').trim();
        if (!eventId) {
          warn(reqId, 'TOOL:get_event_details', 'Missing event_id parameter.');
          return { error: 'Identifiant d’événement manquant.' };
        }

        log(reqId, 'TOOL:get_event_details', `Fetching details for event_id="${eventId}"`);
        const { data, error } = await userClient
          .from('events')
          .select(
            'id, title, description, category, starts_at, ends_at, location_name, location_address, city, country, price_min, price_max, currency, cover_url, capacity, attendees_count'
          )
          .eq('id', eventId)
          .eq('status', 'published')
          .maybeSingle();

        const dur = Math.round(performance.now() - toolStart);
        if (error || !data) {
          warn(
            reqId,
            'TOOL:get_event_details',
            `Event "${eventId}" not found or not published (${dur}ms). Error: ${error?.message || 'not found'}`
          );
          return { error: 'Événement introuvable ou non publié.' };
        }

        turnEventIds.add(data.id);
        log(
          reqId,
          'TOOL:get_event_details',
          `✅ Retrieved event "${data.title}" (${data.category}, ${data.city}) in ${dur}ms`
        );
        return {
          id: data.id,
          title: data.title,
          category: data.category,
          starts_at: data.starts_at,
          ends_at: data.ends_at,
          location_name: data.location_name,
          location_address: data.location_address,
          city: data.city,
          country: data.country,
          price_range:
            data.price_min === 0 && !data.price_max
              ? 'Gratuit'
              : `${data.price_min || 0} - ${data.price_max || data.price_min || 0} ${data.currency || 'FCFA'}`,
          description: (data.description || '').slice(0, 400),
          capacity_info: data.capacity ? `Capacité: ${data.capacity}` : 'Capacité non spécifiée',
        };
      }

      case 'get_nearby_events': {
        const lat = Number(args.lat);
        const lng = Number(args.lng);
        const radiusKm = Math.min(Math.max(Number(args.radius_km) || 15, 1), 25);
        const limit = Math.min(Math.max(Number(args.limit) || 6, 1), 8);

        if (isNaN(lat) || isNaN(lng)) {
          warn(reqId, 'TOOL:get_nearby_events', 'Invalid GPS coordinates provided.', { lat, lng });
          return { error: 'Coordonnées GPS invalides.' };
        }

        log(reqId, 'TOOL:get_nearby_events', `Executing Haversine nearby lookup (lat: ${lat}, lng: ${lng}, radius: ${radiusKm}km)...`);

        const { data, error } = await userClient.rpc('get_nearby_events_rpc', {
          p_lat: lat,
          p_lng: lng,
          p_radius_km: radiusKm,
          p_limit: limit,
        });

        const dur = Math.round(performance.now() - toolStart);
        if (error) {
          warn(reqId, 'TOOL:get_nearby_events', `RPC get_nearby_events_rpc failed (${dur}ms). Triggering fallback query. Error: ${error.message}`);
          const { data: fallbackEvents } = await userClient
            .from('events')
            .select('id, title, category, starts_at, ends_at, location_name, city, country, price_min, price_max, currency')
            .eq('status', 'published')
            .limit(limit);

          const list = (fallbackEvents || []).map(
            (ev: {
              id: string;
              title: string;
              category: string;
              starts_at: string;
              location_name: string;
              city: string;
              price_min: number;
              currency: string;
            }) => {
              turnEventIds.add(ev.id);
              return {
                id: ev.id,
                title: ev.title,
                category: ev.category,
                starts_at: ev.starts_at,
                location: `${ev.location_name || ''}, ${ev.city || 'Lomé'}`.trim(),
                price: ev.price_min === 0 ? 'Gratuit' : `${ev.price_min} ${ev.currency || 'FCFA'}`,
              };
            }
          );
          log(reqId, 'TOOL:get_nearby_events', `Fallback returned ${list.length} event(s)`);
          return { count: list.length, events: list };
        }

        const eventsList = (data || []).map(
          (ev: {
            id: string;
            title: string;
            category: string;
            starts_at: string;
            location_name: string;
            city: string;
            price_min: number;
            currency: string;
            distance_km: number;
          }) => {
            turnEventIds.add(ev.id);
            return {
              id: ev.id,
              title: ev.title,
              category: ev.category,
              starts_at: ev.starts_at,
              location: `${ev.location_name || ''}, ${ev.city || 'Lomé'}`.trim(),
              price: ev.price_min === 0 ? 'Gratuit' : `${ev.price_min} ${ev.currency || 'FCFA'}`,
              distance: `${ev.distance_km} km`,
            };
          }
        );

        log(reqId, 'TOOL:get_nearby_events', `✅ Found ${eventsList.length} nearby event(s) in ${dur}ms`);
        return { count: eventsList.length, events: eventsList };
      }

      // --------------------------------------------------------------
      // OUTIL PERSONNALISÉ 1 : PROFIL UTILISATEUR (SÉCURISÉ PAR JWT RLS)
      // --------------------------------------------------------------
      case 'get_my_profile_lite': {
        log(reqId, 'TOOL:get_my_profile_lite', `Checking user profile. Auth state: isAuthenticated=${isAuthenticated}, userId=${userId || '(none)'}`);

        if (!userId || !isAuthenticated) {
          log(reqId, 'TOOL:get_my_profile_lite', 'ℹ️ User is unauthenticated (guest mode). Informing model.');
          return { authenticated: false, message: 'L’utilisateur n’est pas connecté (mode invité).' };
        }

        log(reqId, 'TOOL:get_my_profile_lite', `Executing SELECT from profiles table under user JWT RLS for uid=${userId}...`);
        const { data, error } = await userClient
          .from('profiles')
          .select('id, name, role, city, country, bio')
          .eq('id', userId)
          .maybeSingle();

        const dur = Math.round(performance.now() - toolStart);
        if (error) {
          warn(reqId, 'TOOL:get_my_profile_lite', `RLS query error on profiles table for uid=${userId} (${dur}ms): ${error.message}`, error);
          return { authenticated: true, first_name: 'Participant', role: 'participant', city: 'Lomé' };
        }

        if (!data) {
          warn(reqId, 'TOOL:get_my_profile_lite', `No row found in profiles table for uid=${userId} (${dur}ms). Returning default profile.`);
          return { authenticated: true, first_name: 'Participant', role: 'participant', city: 'Lomé' };
        }

        const firstName = data.name ? data.name.trim().split(/\s+/)[0] : 'Participant';
        log(
          reqId,
          'TOOL:get_my_profile_lite',
          `✅ Successfully retrieved profile under RLS in ${dur}ms: name="${data.name}", role="${data.role}", city="${data.city}"`
        );

        return {
          authenticated: true,
          first_name: firstName,
          role: data.role || 'participant',
          city: data.city || 'Lomé',
          country: data.country || 'TG',
          preferences: data.bio ? String(data.bio).slice(0, 150) : null,
        };
      }

      // --------------------------------------------------------------
      // OUTIL PERSONNALISÉ 2 : FAVORIS DE L'UTILISATEUR (SÉCURISÉ PAR JWT RLS)
      // --------------------------------------------------------------
      case 'get_my_favorites': {
        const limit = Math.min(Math.max(Number(args.limit) || 8, 1), 10);
        log(reqId, 'TOOL:get_my_favorites', `Requesting favorites (limit: ${limit}). Auth state: isAuthenticated=${isAuthenticated}, userId=${userId || '(none)'}`);

        if (!userId || !isAuthenticated) {
          log(reqId, 'TOOL:get_my_favorites', 'ℹ️ User is unauthenticated. Prompting model to suggest login.');
          return { authenticated: false, message: 'Connectez-vous pour accéder à vos favoris.' };
        }

        log(reqId, 'TOOL:get_my_favorites', `Executing SELECT on event_likes joined with events under user JWT RLS for user_id=${userId}...`);
        const { data, error } = await userClient
          .from('event_likes')
          .select('event_id, events(id, title, category, starts_at, location_name, city, price_min, currency)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);

        const dur = Math.round(performance.now() - toolStart);
        if (error) {
          err(reqId, 'TOOL:get_my_favorites', `RLS query error on event_likes (${dur}ms): ${error.message}`, error);
          return { count: 0, favorites: [], error: 'Impossible de récupérer les favoris.' };
        }

        const favorites = (data || [])
          .map(
            (item: {
              events?: {
                id: string;
                title: string;
                category: string;
                starts_at: string;
                location_name: string;
                city: string;
                price_min: number;
                currency: string;
              } | null;
            }) => item.events
          )
          .filter(Boolean)
          .map(
            (ev: {
              id: string;
              title: string;
              category: string;
              starts_at: string;
              location_name: string;
              city: string;
              price_min: number;
              currency: string;
            }) => {
              turnEventIds.add(ev.id);
              return {
                id: ev.id,
                title: ev.title,
                category: ev.category,
                starts_at: ev.starts_at,
                location: `${ev.location_name || ''}, ${ev.city || 'Lomé'}`.trim(),
                price: ev.price_min === 0 ? 'Gratuit' : `${ev.price_min} ${ev.currency || 'FCFA'}`,
              };
            }
          );

        log(
          reqId,
          'TOOL:get_my_favorites',
          `✅ Found ${favorites.length} favorite event(s) under RLS in ${dur}ms: [${favorites.map((f) => f.title).join(', ') || 'none'}]`
        );
        return { count: favorites.length, favorites };
      }

      case 'get_my_follows': {
        if (!userId || !isAuthenticated) {
          return { authenticated: false, message: 'Connectez-vous pour consulter vos abonnements.' };
        }

        const [artistFollows, organizationFollows, userFollows] = await Promise.all([
          userClient.from('artist_follows').select('artist_id').eq('user_id', userId).limit(10),
          userClient.from('organization_follows').select('organization_id').eq('user_id', userId).limit(10),
          userClient.from('user_follows').select('following_id').eq('follower_id', userId).limit(10),
        ]);
        const followError = artistFollows.error || organizationFollows.error || userFollows.error;
        if (followError) {
          err(reqId, 'TOOL:get_my_follows', 'Unable to retrieve follow IDs.', followError);
          return { error: 'Impossible de récupérer les abonnements de votre compte.' };
        }

        const artistIds = (artistFollows.data || []).map((row: { artist_id: string }) => row.artist_id);
        const organizationIds = (organizationFollows.data || []).map((row: { organization_id: string }) => row.organization_id);
        const followedUserIds = (userFollows.data || []).map((row: { following_id: string }) => row.following_id);
        const [artists, organizations, profiles] = await Promise.all([
          artistIds.length
            ? userClient.from('artists').select('id, name, genres').in('id', artistIds)
            : Promise.resolve({ data: [], error: null }),
          organizationIds.length
            ? userClient.from('organizations').select('id, name, city, country').in('id', organizationIds)
            : Promise.resolve({ data: [], error: null }),
          followedUserIds.length
            ? userClient.from('public_profiles').select('id, name, role, city, country').in('id', followedUserIds)
            : Promise.resolve({ data: [], error: null }),
        ]);
        const detailsError = artists.error || organizations.error || profiles.error;
        if (detailsError) {
          err(reqId, 'TOOL:get_my_follows', 'Unable to retrieve public follow details.', detailsError);
          return { error: 'Impossible de récupérer les détails de vos abonnements.' };
        }

        return {
          artists: artists.data || [],
          organizations: organizations.data || [],
          people: profiles.data || [],
        };
      }

      // --------------------------------------------------------------
      // OUTIL PERSONNALISÉ 3 : BILLETS DE L'UTILISATEUR (SÉCURISÉ PAR JWT RLS)
      // --------------------------------------------------------------
      case 'get_my_tickets': {
        const limit = Math.min(Math.max(Number(args.limit) || 8, 1), 10);
        log(reqId, 'TOOL:get_my_tickets', `Requesting user tickets (limit: ${limit}). Auth state: isAuthenticated=${isAuthenticated}, userId=${userId || '(none)'}`);

        if (!userId || !isAuthenticated) {
          log(reqId, 'TOOL:get_my_tickets', 'ℹ️ User is unauthenticated. Prompting model to suggest login.');
          return { authenticated: false, message: 'Connectez-vous pour consulter vos billets.' };
        }

        log(reqId, 'TOOL:get_my_tickets', `Executing SELECT on tickets joined with events under user JWT RLS for user_id=${userId}...`);
        // Colonnes explicites SANS qr_code ni détails de carte bancaire (confidentialité stricte)
        const { data, error } = await userClient
          .from('tickets')
          .select(
            'id, event_id, ticket_type, quantity, price_paid, currency, status, created_at, events(id, title, starts_at, location_name, city)'
          )
          .eq('user_id', userId)
          .in('status', [...VISIBLE_TICKET_STATUSES])
          .order('created_at', { ascending: false })
          .limit(limit);

        const dur = Math.round(performance.now() - toolStart);
        if (error) {
          err(reqId, 'TOOL:get_my_tickets', `RLS query error on tickets table (${dur}ms): ${error.message}`, error);
          return { count: 0, tickets: [], error: 'Impossible de récupérer les billets.' };
        }

        const ticketsList = (data || []).map(
          (t: {
            ticket_type: string;
            quantity: number;
            price_paid: number;
            currency: string;
            status: string;
            events?: { id: string; title: string; starts_at: string; location_name: string; city: string } | null;
          }) => {
            if (t.events?.id) {
              turnEventIds.add(t.events.id);
            }
            return {
              event_title: t.events?.title || 'Événement',
              ticket_type: t.ticket_type,
              quantity: t.quantity || 1,
              status: ticketStatusLabel(t.status),
              starts_at: t.events?.starts_at || 'Date à confirmer',
              location: t.events ? `${t.events.location_name || ''}, ${t.events.city || 'Lomé'}`.trim() : 'Lomé',
              price_paid: `${t.price_paid} ${t.currency || 'FCFA'}`,
            };
          }
        );

        log(
          reqId,
          'TOOL:get_my_tickets',
          `✅ Found ${ticketsList.length} ticket(s) under RLS in ${dur}ms: [${ticketsList.map((t) => `${t.event_title} (${t.quantity}x ${t.ticket_type})`).join(' | ') || 'none'}]`
        );
        return { count: ticketsList.length, tickets: ticketsList };
      }

      default:
        warn(reqId, 'TOOL', `Unknown tool call requested by Gemini: "${name}"`);
        return { error: `Outil inconnu : ${name}` };
    }
  } catch (errCatch: unknown) {
    const dur = Math.round(performance.now() - toolStart);
    const msg = errCatch instanceof Error ? errCatch.message : 'Erreur interne de l’outil';
    err(reqId, `TOOL:${name}`, `Unhandled exception inside tool "${name}" (${dur}ms): ${msg}`, errCatch);
    return { error: msg };
  }
}

// --------------------------------------------------------------------
// HANDLER HTTP PRINCIPAL
// --------------------------------------------------------------------
const handler = async (req: Request): Promise<Response> => {
  const reqStart = performance.now();
  const reqId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), { status: 403, headers: { 'Content-Type': 'application/json', Vary: 'Origin' } });
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  log(reqId, 'REQ', 'Incoming request');

  if (req.method !== 'POST') {
    warn(reqId, 'REQ', `Method ${req.method} not allowed`);
    return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // 0. Body et Clé API (priorité à la clé personnelle de l'utilisateur, sinon clé serveur)
    const userApiKey = req.headers.get('x-gemini-api-key')?.trim();
    const body = await req.json().catch(() => ({}));
    const activeGeminiKey = userApiKey || GEMINI_API_KEY;

    log(
      reqId,
      'CONFIG',
      `Configuration status: SupabaseURL=${Boolean(SUPABASE_URL)}, AnonKey=${Boolean(SUPABASE_ANON_KEY)}, ServerGeminiKey=${Boolean(GEMINI_API_KEY)}`
    );
    log(
      reqId,
      'KEY',
      `Active Gemini Key source: ${
        userApiKey
          ? 'Client Header (x-gemini-api-key BYOK)'
          : GEMINI_API_KEY
          ? 'Server Environment (GEMINI_API_KEY)'
          : 'MISSING'
      }`
    );

    if (!activeGeminiKey) {
      err(reqId, 'KEY', 'No Gemini API key available. Request rejected with 400.');
      return new Response(
        JSON.stringify({
          error: 'Aucune clé API Gemini fournie (ni sur le serveur, ni transmise par l’utilisateur).',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 1. Détection et validation du Bearer Token / Supabase JWT
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const rawToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    const token = rawToken && rawToken !== 'null' && rawToken !== 'undefined' ? rawToken : '';

    log(reqId, 'AUTH', `Inspecting Authorization header: ${token ? maskToken(token) : '(none/empty)'}`);

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let userId: string | null = null;
    let isAuthenticated = false;
    let userEmail: string | null = null;
    let userRole = 'guest';

    const isAnonOrPublishable = Boolean(
      token && (token === SUPABASE_ANON_KEY || token.startsWith('sb_publishable_'))
    );

    if (isAnonOrPublishable) {
      log(reqId, 'AUTH', 'Token matches anon/publishable key -> proceeding in guest mode.');
    } else if (token) {
      log(reqId, 'AUTH', `Supabase JWT candidate detected (${maskToken(token)}). Validating with auth.getUser()...`);
      try {
        const { data: userData, error: userError } = await anonClient.auth.getUser(token);
        if (userError) {
          warn(
            reqId,
            'AUTH',
            `JWT validation failed: "${userError.message}" (status: ${userError.status || 401}). Proceeding as guest.`
          );
        } else if (userData?.user) {
          userId = userData.user.id;
          isAuthenticated = true;
          userEmail = userData.user.email || null;
          userRole =
            userData.user.app_metadata?.role || userData.user.user_metadata?.role || 'participant';
          log(
            reqId,
            'AUTH',
            `✅ JWT VALIDATED! Authenticated user: uid=${userId}, role=${userRole}, email=${
              userEmail ? userEmail.slice(0, 3) + '***' : '(unspecified)'
            }`
          );
        } else {
          warn(reqId, 'AUTH', 'getUser returned success but user object is empty.');
        }
      } catch (authException: unknown) {
        err(reqId, 'AUTH', 'Unexpected exception during JWT verification:', authException);
      }
    } else {
      log(reqId, 'AUTH', 'No bearer token provided -> Proceeding as unauthenticated guest.');
    }

    // 2. Client Supabase scopé au JWT pour la propagation de Row-Level Security (RLS)
    const userClientHeaders: Record<string, string> = {};
    if (isAuthenticated && token) {
      userClientHeaders['Authorization'] = `Bearer ${token}`;
      log(
        reqId,
        'RLS',
        `🔐 PROPAGATING JWT TO USERCLIENT: "Authorization: Bearer ${maskToken(token)}". Postgres auth.uid() will be "${userId}".`
      );
    } else {
      log(reqId, 'RLS', '🌐 Initializing userClient with default anon credentials (guest mode: auth.uid() is null).');
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: userClientHeaders,
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Quota is checked through a server-only RPC.
    const clientIp = req.headers.get('cf-connecting-ip') || 'unknown';
    const ipDigest = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(clientIp)))
    ).map((byte) => byte.toString(16).padStart(2, '0')).join('');
    const quotaResult = await createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }).rpc('check_and_increment_ai_quota', {
      p_identifier: isAuthenticated && userId ? 'user_' + userId : 'ip_' + ipDigest,
      p_is_authenticated: isAuthenticated,
    });
    const quotaCheck = quotaResult.data;
    const quotaErr = quotaResult.error;

    if (quotaErr || !quotaCheck) {
      err(reqId, 'QUOTA', 'Quota backend failed; request denied.', quotaErr);
      return new Response(JSON.stringify({ error: 'Quota indisponible. Veuillez réessayer.' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } else if (quotaCheck && quotaCheck.allowed === false) {
      warn(reqId, 'QUOTA', 'Rate limit exceeded.');
      return new Response(
        JSON.stringify({
          error: quotaCheck.message || 'Quota dépassé. Veuillez patienter.',
          reason: quotaCheck.reason,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      log(reqId, 'QUOTA', '✅ Quota check passed.');
    }

    // 4. Validation et nettoyage du body
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const rawLocation = body.userLocation;
    const preferences = normalizeAIAssistantPreferences(body.preferences);
    const systemInstruction = `${SYSTEM_INSTRUCTION}\n\n${getAIAnswerStyleInstruction(preferences.answerStyle)}`;

    log(reqId, 'BODY', `Received ${rawMessages.length} raw message(s). Has GPS location: ${Boolean(rawLocation)}`);

    // Plafonne à 10 messages récents, force les rôles user/assistant, plafonne la taille du texte
    const sanitizedHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
    for (const msg of rawMessages.slice(-10)) {
      if (!msg || typeof msg !== 'object') continue;
      const role = msg.role === 'assistant' ? 'model' : 'user';
      const text = typeof msg.text === 'string' ? msg.text.trim().slice(0, 1000) : '';
      if (text) {
        sanitizedHistory.push({ role, parts: [{ text }] });
      }
    }

    if (sanitizedHistory.length === 0) {
      warn(reqId, 'BODY', 'No valid text messages found in request payload.');
      return new Response(JSON.stringify({ error: 'Aucun message valide fourni.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Arrondi de la position GPS à ~1 km (2 décimales) si fournie
    let locationContext = '';
    if (
      rawLocation &&
      typeof rawLocation.lat === 'number' &&
      typeof rawLocation.lng === 'number' &&
      !isNaN(rawLocation.lat) &&
      !isNaN(rawLocation.lng)
    ) {
      const roundedLat = Number(rawLocation.lat.toFixed(2));
      const roundedLng = Number(rawLocation.lng.toFixed(2));
      locationContext = `\nPosition approximative de l'utilisateur (~1 km) : Lat ${roundedLat}, Lng ${roundedLng}.`;
      log(reqId, 'GEO', 'Approximate location context added.');
    }

    // 5. Boucle d'outils bornée (Max 3 tours)
    const turnEventIds = new Set<string>();
    const contents: Array<{
      role: 'user' | 'model';
      parts: Array<
        | { text: string }
        | { functionCall: { name: string; args: Record<string, unknown> } }
        | { functionResponse: { name: string; response: Record<string, unknown> } }
      >;
    }> = [...sanitizedHistory];

    // Injecte la position dans le dernier message utilisateur sans altérer la BD
    if (locationContext) {
      const lastMsg = contents[contents.length - 1];
      if (lastMsg && lastMsg.role === 'user' && lastMsg.parts[0] && 'text' in lastMsg.parts[0]) {
        lastMsg.parts[0].text += locationContext;
      }
    }

    const model = await resolveGeminiModel(activeGeminiKey, reqId);
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    let maxRounds = 3;

    log(reqId, 'GENAI', `Starting multi-turn tool calling loop with model "${model}" (max 3 rounds)...`);

    while (maxRounds > 0) {
      const roundNum = 4 - maxRounds;
      maxRounds--;

      log(reqId, 'GENAI', `Round ${roundNum}/3: Calling Gemini API for tool decision / text generation...`);

      const geminiPayload = {
        contents,
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        tools: GEMINI_TOOLS,
        generationConfig: {
          temperature: preferences.temperature,
          maxOutputTokens: preferences.maxOutputTokens,
        },
      };

      const genaiStart = performance.now();
      const geminiAbortCtrl = new AbortController();
      const geminiTimeout = setTimeout(() => geminiAbortCtrl.abort(), 25_000);

      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': activeGeminiKey },
        body: JSON.stringify(geminiPayload),
        signal: geminiAbortCtrl.signal,
      });
      clearTimeout(geminiTimeout);
      const genaiDur = Math.round(performance.now() - genaiStart);

      if (!geminiRes.ok) {
        err(reqId, 'GENAI', `Gemini API error (${geminiRes.status} in ${genaiDur}ms).`);
        if ([400, 401, 403].includes(geminiRes.status)) {
          throw new Error('GEMINI_API_KEY_INVALID');
        }
        if (geminiRes.status === 429) throw new Error('GEMINI_QUOTA_EXCEEDED');
        throw new Error(`GEMINI_API_ERROR_${geminiRes.status}`);
      }

      const geminiData = await geminiRes.json();
      const candidate = geminiData.candidates?.[0];
      const modelParts = candidate?.content?.parts || [];

      // Vérifie s'il y a des appels d'outils (functionCall)
      const functionCalls = modelParts.filter(
        (p: { functionCall?: { name: string; args: Record<string, unknown> } }) =>
          Boolean(p.functionCall)
      );

      if (functionCalls.length > 0) {
        log(
          reqId,
          'GENAI',
          `Gemini requested ${functionCalls.length} tool call(s) in round ${roundNum}: [${functionCalls
            .map((f: { functionCall?: { name: string } }) => f.functionCall?.name)
            .join(', ')}]`
        );

        // Enregistre l'appel du modèle
        contents.push({ role: 'model', parts: modelParts });

        // Exécute chaque fonction avec le client scopé RLS
        const responseParts = [];
        for (const fc of functionCalls) {
          const fnName = fc.functionCall.name;
          const fnArgs = fc.functionCall.args || {};
          const fnResult = await executeToolCall(
            fnName,
            fnArgs,
            userClient,
            userId,
            isAuthenticated,
            turnEventIds,
            reqId
          );
          responseParts.push({
            functionResponse: {
              name: fnName,
              response: fnResult,
            },
          });
        }

        // Renvoie les résultats des fonctions au modèle
        contents.push({ role: 'user', parts: responseParts });
        continue;
      }

      // Si aucune fonction demandée, le modèle a synthétisé sa réponse !
      log(reqId, 'GENAI', `Round ${roundNum}/3: Gemini finished tool calling and produced response.`);
      break;
    }

    // 6. Streaming final vers le client (SSE stream)
    log(reqId, 'STREAM', `Initializing final SSE streaming generation with model "${model}"...`);
    const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;
    const streamPayload = {
      contents,
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      generationConfig: {
        temperature: preferences.temperature,
          maxOutputTokens: preferences.maxOutputTokens,
      },
    };

    const sseAbortCtrl = new AbortController();
    let sseTimedOut = false;
    const sseTimeout = setTimeout(() => {
      sseTimedOut = true;
      sseAbortCtrl.abort();
    }, 45_000);
    const abortOnRequestEnd = () => sseAbortCtrl.abort(req.signal.reason);
    if (req.signal.aborted) abortOnRequestEnd();
    else req.signal.addEventListener('abort', abortOnRequestEnd, { once: true });

    let sseResponse: Response;
    try {
      sseResponse = await fetch(streamUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': activeGeminiKey },
        body: JSON.stringify(streamPayload),
        signal: sseAbortCtrl.signal,
      });
    } catch (fetchError) {
      clearTimeout(sseTimeout);
      req.signal.removeEventListener('abort', abortOnRequestEnd);
      throw fetchError;
    }

    if (!sseResponse.ok || !sseResponse.body) {
      clearTimeout(sseTimeout);
      req.signal.removeEventListener('abort', abortOnRequestEnd);
      err(reqId, 'STREAM', `Failed to initialize Gemini SSE stream (HTTP ${sseResponse.status})`);
      throw new Error(`Impossible d'initialiser le flux de streaming SSE (${sseResponse.status})`);
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = sseResponse.body.getReader();

    const stream = new ReadableStream({
      async start(controller) {
        let chunkCount = 0;
        let totalChars = 0;
        const emitDataLine = (line: string) => {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) return;
          const jsonStr = trimmed.replace(/^data:\s*/, '');
          if (!jsonStr || jsonStr === '[DONE]') return;

          try {
            const parsed = JSON.parse(jsonStr);
            const parts = parsed.candidates?.[0]?.content?.parts || [];
            const chunkText = parts
              .map((part: { text?: string }) => part.text || '')
              .join('');
            if (chunkText && !sseAbortCtrl.signal.aborted) {
              chunkCount++;
              totalChars += chunkText.length;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: chunkText, done: false })}\n\n`)
              );
            }
          } catch {
            // Ignore incomplete or non-JSON provider events.
          }
        };

        try {
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) emitDataLine(line);
          }

          buffer += decoder.decode();
          if (buffer.trim()) emitDataLine(buffer);

          // Émet la fin du flux avec la liste des IDs d'événements vérifiés pour les cartes UI
          const verifiedEventIds = Array.from(turnEventIds);
          if (!sseAbortCtrl.signal.aborted) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ done: true, event_ids: verifiedEventIds })}\n\n`)
            );
            controller.close();
          }

          const totalDuration = Math.round(performance.now() - reqStart);
          log(
            reqId,
            'DONE',
            `✅ Request completed successfully in ${totalDuration}ms. Streamed ${chunkCount} chunks (${totalChars} chars). Verified event cards: ${verifiedEventIds.length} [${verifiedEventIds.join(', ')}]`
          );
        } catch (streamErr: unknown) {
          const msg = sseTimedOut
            ? 'Le délai de réponse de l’assistant a été dépassé.'
            : streamErr instanceof Error
              ? streamErr.message
              : 'Erreur pendant le streaming';
          err(reqId, 'STREAM', `Streaming loop error: ${msg}`, streamErr);
          if (!req.signal.aborted) {
            try {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ error: msg, done: true })}\n\n`)
              );
              controller.close();
            } catch {
              // The downstream client may already have closed the stream.
            }
          }
        } finally {
          clearTimeout(sseTimeout);
          req.signal.removeEventListener('abort', abortOnRequestEnd);
          reader.releaseLock();
        }
      },
      async cancel(reason) {
        sseAbortCtrl.abort(reason);
        await reader.cancel(reason).catch(() => undefined);
        clearTimeout(sseTimeout);
        req.signal.removeEventListener('abort', abortOnRequestEnd);
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'x-request-id': reqId,
      },
    });
  } catch (errorCatch: unknown) {
    const totalDuration = Math.round(performance.now() - reqStart);
    const errorCode = errorCatch instanceof Error ? errorCatch.message : '';
    const errorMsg = errorCode === 'GEMINI_API_KEY_INVALID'
      ? 'La clé Gemini est invalide ou n’a pas accès à l’API.'
      : errorCode === 'GEMINI_QUOTA_EXCEEDED'
        ? 'Le quota Gemini associé à cette clé est atteint. Réessayez plus tard.'
        : errorCode.startsWith('GEMINI_API_ERROR_')
          ? 'Le service Gemini a refusé la requête. Vérifiez le modèle et la configuration de la clé.'
          : 'Erreur interne inattendue';
    err(reqId, 'FATAL', 'Request failed.', errorCatch);

    const status = errorCode === 'GEMINI_API_KEY_INVALID' ? 401 : errorCode === 'GEMINI_QUOTA_EXCEEDED' ? 429 : 500;
    return new Response(JSON.stringify({ error: errorMsg, request_id: reqId }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

// Deno.serve natif moderne (Supabase Edge Runtime v2) ou serve std
if (
  typeof Deno !== 'undefined' &&
  'serve' in Deno &&
  typeof (Deno as { serve?: unknown }).serve === 'function'
) {
  (Deno as unknown as { serve: (h: typeof handler) => void }).serve(handler);
} else {
  serve(handler);
}

export default handler;
