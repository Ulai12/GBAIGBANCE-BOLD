/**
 * GBAIGBANCE — Moteur Direct Client Fallback pour l'Assistant IA
 * 
 * Utilisé lorsque l'Edge Function Supabase n'est pas encore déployée (HTTP 404),
 * ou lorsque l'utilisateur utilise sa propre clé API Gemini en mode direct.
 * Exécute les mêmes outils en lecture seule avec le client Supabase local.
 */

import { supabase } from '@/infrastructure/supabase';
import { resolveAvailableGeminiModel } from '@/services/gemini';
import type { AIAssistantMessage, StreamCallbacks } from '@/services/aiAssistantService';

const SYSTEM_INSTRUCTION = `Tu es le concierge virtuel officiel de GBAIGBANCE, la plateforme de billetterie d'événements et Mobile Money au Togo, Bénin et en Afrique de l'Ouest francophone.
Tu aides les utilisateurs avec chaleur, bienveillance et précision.
- Tes réponses doivent être concises, percutantes et adaptées au mobile.
- Utilise les outils à ta disposition pour trouver les événements, vérifier les détails, les billets et favoris de l'utilisateur.
- IMPORTANT : Ne génère JAMAIS d'images en markdown (![]) ni de liens web bruts ou externes.
- Mentionne toujours les prix en Francs CFA (ex: 5 000 FCFA ou Gratuit) et les lieux réels (ex: Lomé, Cotonou).`;

const GEMINI_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'search_events',
        description: 'Recherche des événements publics actifs par mot-clé, catégorie, gratuité ou période.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: { type: 'STRING', description: 'Terme de recherche (titre, lieu, artiste, etc.)' },
            category: {
              type: 'STRING',
              description: 'Catégorie de l’événement',
              enum: ['concert', 'festival', 'conference', 'formation', 'exposition', 'spectacle', 'cultural', 'private'],
            },
            free_only: { type: 'BOOLEAN', description: 'Si vrai, renvoie uniquement les événements gratuits' },
            date_range: {
              type: 'STRING',
              description: 'Filtre temporel',
              enum: ['today', 'this_weekend', 'this_week', 'this_month', 'upcoming'],
            },
            limit: { type: 'INTEGER', description: 'Nombre maximum de résultats (1 à 8)' },
          },
        },
      },
      {
        name: 'get_event_details',
        description: 'Obtient les détails complets d’un événement via son ID.',
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
        description: 'Trouve les événements proches d’une position GPS géographique.',
        parameters: {
          type: 'OBJECT',
          properties: {
            lat: { type: 'NUMBER', description: 'Latitude' },
            lng: { type: 'NUMBER', description: 'Longitude' },
            radius_km: { type: 'NUMBER', description: 'Rayon de recherche en km (max 25 km)' },
            limit: { type: 'INTEGER', description: 'Nombre maximum de résultats (1 à 8)' },
          },
          required: ['lat', 'lng'],
        },
      },
      {
        name: 'get_my_profile_lite',
        description: 'Récupère le prénom et la ville de l’utilisateur connecté.',
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      {
        name: 'get_my_favorites',
        description: 'Liste les événements ajoutés aux favoris de l’utilisateur connecté.',
        parameters: {
          type: 'OBJECT',
          properties: {
            limit: { type: 'INTEGER', description: 'Nombre de favoris à récupérer' },
          },
        },
      },
      {
        name: 'get_my_tickets',
        description: 'Liste les billets actifs et réservations de l’utilisateur connecté.',
        parameters: {
          type: 'OBJECT',
          properties: {
            limit: { type: 'INTEGER', description: 'Nombre maximum de billets' },
          },
        },
      },
    ],
  },
];

async function executeClientTool(
  name: string,
  args: Record<string, unknown>,
  turnEventIds: Set<string>
): Promise<unknown> {
  const now = new Date().toISOString();

  switch (name) {
    case 'search_events': {
      const limit = Math.min(Math.max(Number(args.limit) || 5, 1), 8);
      let query = supabase
        .from('events')
        .select('id, title, category, starts_at, ends_at, location_name, city, country, price_min, price_max, currency, cover_url')
        .eq('status', 'published')
        .not('id', 'like', 'mock-%');

      if (args.free_only) {
        query = query.eq('price_min', 0);
      }

      if (args.category) {
        query = query.eq('category', String(args.category).toLowerCase());
      }

      if (args.query) {
        const q = String(args.query).trim();
        query = query.or(`title.ilike.%${q}%,location_name.ilike.%${q}%,city.ilike.%${q}%`);
      }

      const { data, error } = await query.order('starts_at', { ascending: true }).limit(limit);
      if (error || !data) return { count: 0, events: [] };

      const events = data.map((ev) => {
        turnEventIds.add(ev.id);
        return {
          id: ev.id,
          title: ev.title,
          category: ev.category,
          starts_at: ev.starts_at,
          location: `${ev.location_name || ''}, ${ev.city || 'Lomé'}`.trim(),
          price: ev.price_min === 0 ? 'Gratuit' : `${ev.price_min} ${ev.currency || 'FCFA'}`,
        };
      });

      return { count: events.length, events };
    }

    case 'get_event_details': {
      const eventId = String(args.event_id || '');
      if (!eventId) return { error: 'Identifiant d’événement manquant.' };

      const { data, error } = await supabase
        .from('events')
        .select('id, title, category, starts_at, ends_at, location_name, location_address, city, country, price_min, price_max, currency, description, capacity, cover_url')
        .eq('id', eventId)
        .single();

      if (error || !data) return { error: 'Événement introuvable.' };

      turnEventIds.add(data.id);
      return {
        id: data.id,
        title: data.title,
        category: data.category,
        starts_at: data.starts_at,
        ends_at: data.ends_at,
        location_name: data.location_name,
        city: data.city,
        price_range: data.price_min === 0 && !data.price_max ? 'Gratuit' : `${data.price_min || 0} - ${data.price_max || data.price_min || 0} ${data.currency || 'FCFA'}`,
        description: (data.description || '').slice(0, 400),
      };
    }

    case 'get_nearby_events': {
      const lat = Number(args.lat);
      const lng = Number(args.lng);
      const limit = Math.min(Math.max(Number(args.limit) || 6, 1), 8);

      // Tente d'abord la fonction RPC Postgres avec calcul Haversine
      const { data: rpcData } = await supabase.rpc('get_nearby_events_rpc', {
        p_lat: lat,
        p_lng: lng,
        p_radius_km: 25,
        p_limit: limit,
      });

      if (rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
        const list = rpcData.map((ev: { id: string; title: string; category: string; starts_at: string; location_name?: string; city?: string; price_min: number; currency?: string }) => {
          turnEventIds.add(ev.id);
          return {
            id: ev.id,
            title: ev.title,
            category: ev.category,
            starts_at: ev.starts_at,
            location: `${ev.location_name || ''}, ${ev.city || 'Lomé'}`.trim(),
            price: ev.price_min === 0 ? 'Gratuit' : `${ev.price_min} ${ev.currency || 'FCFA'}`,
          };
        });
        return { count: list.length, events: list };
      }

      const { data } = await supabase
        .from('events')
        .select('id, title, category, starts_at, ends_at, location_name, city, country, price_min, price_max, currency, cover_url')
        .eq('status', 'published')
        .not('id', 'like', 'mock-%')
        .gte('starts_at', now)
        .order('starts_at', { ascending: true })
        .limit(limit);

      const list = (data || []).map((ev) => {
        turnEventIds.add(ev.id);
        return {
          id: ev.id,
          title: ev.title,
          category: ev.category,
          starts_at: ev.starts_at,
          location: `${ev.location_name || ''}, ${ev.city || 'Lomé'}`.trim(),
          price: ev.price_min === 0 ? 'Gratuit' : `${ev.price_min} ${ev.currency || 'FCFA'}`,
        };
      });

      return { count: list.length, events: list };
    }

    case 'get_my_profile_lite': {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { authenticated: false, message: 'L’utilisateur navigue en mode invité.' };
      }
      const rawName = user.user_metadata?.name || user.user_metadata?.full_name || '';
      const firstName = rawName.split(' ')[0] || 'Ami';
      return {
        authenticated: true,
        first_name: firstName,
        city: user.user_metadata?.city || 'Lomé',
      };
    }

    case 'get_my_favorites': {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { count: 0, favorites: [], message: 'Mode invité : aucun favori enregistré.' };
      }

      const { data, error } = await supabase
        .from('favorites')
        .select('event_id, events(id, title, category, starts_at, location_name, city, price_min, currency)')
        .eq('user_id', user.id)
        .limit(6);

      if (error || !data) return { count: 0, favorites: [] };

      type FavEvent = { id: string; title: string; category: string; starts_at: string; location_name: string; city: string; price_min: number; currency: string };
      const favoritesList = data
        .map((f: { events: unknown }) => f.events as FavEvent | null)
        .filter((ev): ev is FavEvent => Boolean(ev && typeof ev === 'object' && 'id' in ev))
        .map((ev) => {
          turnEventIds.add(ev.id);
          return {
            id: ev.id,
            title: ev.title,
            category: ev.category,
            starts_at: ev.starts_at,
            location: `${ev.location_name || ''}, ${ev.city || 'Lomé'}`.trim(),
            price: ev.price_min === 0 ? 'Gratuit' : `${ev.price_min} ${ev.currency || 'FCFA'}`,
          };
        });

      return { count: favoritesList.length, favorites: favoritesList };
    }

    case 'get_my_tickets': {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { count: 0, tickets: [], message: 'Mode invité : aucun billet actif.' };
      }

      const { data, error } = await supabase
        .from('tickets')
        .select('ticket_type, quantity, price_paid, currency, events(id, title, starts_at, location_name, city)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error || !data) return { count: 0, tickets: [] };

      const ticketsList = data.map((t: { ticket_type: string; quantity: number; price_paid: number; currency: string; events?: { id: string; title: string; starts_at: string; location_name: string; city: string } | null }) => {
        if (t.events?.id) turnEventIds.add(t.events.id);
        return {
          event_title: t.events?.title || 'Événement',
          ticket_type: t.ticket_type,
          quantity: t.quantity || 1,
          starts_at: t.events?.starts_at || 'Date à confirmer',
          location: t.events ? `${t.events.location_name || ''}, ${t.events.city || 'Lomé'}`.trim() : 'Lomé',
          price_paid: `${t.price_paid} ${t.currency || 'FCFA'}`,
        };
      });

      return { count: ticketsList.length, tickets: ticketsList };
    }

    default:
      return { error: `Outil non supporté : ${name}` };
  }
}

/**
 * Exécute Gemini directement via API REST avec Function Calling & Streaming SSE
 */
export async function streamGeminiDirect(
  apiKey: string,
  messages: AIAssistantMessage[],
  userLocation: { lat: number; lng: number } | null | undefined,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const turnEventIds = new Set<string>();

  const contents: Array<{
    role: 'user' | 'model';
    parts: Array<Record<string, unknown>>;
  }> = [];

  for (const m of messages.slice(-10)) {
    contents.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text.slice(0, 1000) }],
    });
  }

  if (userLocation) {
    const locNote = `\n[Contexte GPS : Latitude ~${userLocation.lat.toFixed(2)}, Longitude ~${userLocation.lng.toFixed(2)}]`;
    const last = contents[contents.length - 1];
    if (last && last.role === 'user' && last.parts[0] && typeof last.parts[0].text === 'string') {
      last.parts[0].text += locNote;
    }
  }

  const model = await resolveAvailableGeminiModel(apiKey);
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  let maxRounds = 3;

  while (maxRounds > 0) {
    maxRounds--;

    const payload = {
      contents,
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      tools: GEMINI_TOOLS,
      generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
    };

    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Erreur Gemini (${res.status}): ${errText.slice(0, 180)}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    const functionCalls = parts.filter(
      (p: { functionCall?: { name: string; args: Record<string, unknown> } }) => Boolean(p.functionCall)
    );

    if (functionCalls.length > 0) {
      contents.push({ role: 'model', parts });

      const responseParts = [];
      for (const fc of functionCalls) {
        const fnName = fc.functionCall.name;
        const fnArgs = fc.functionCall.args || {};
        const fnResult = await executeClientTool(fnName, fnArgs, turnEventIds);
        responseParts.push({
          functionResponse: {
            name: fnName,
            response: fnResult,
          },
        });
      }

      contents.push({ role: 'user', parts: responseParts });
      continue;
    }

    break;
  }

  // Streaming final
  const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
  const streamPayload = {
    contents,
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
  };

  const streamRes = await fetch(streamUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(streamPayload),
    signal,
  });

  if (!streamRes.ok || !streamRes.body) {
    throw new Error(`Erreur flux streaming direct (${streamRes.status})`);
  }

  const reader = streamRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const jsonStr = trimmed.slice(5).trim();
      if (!jsonStr) continue;

      try {
        const parsed = JSON.parse(jsonStr);
        const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textChunk) {
          callbacks.onChunk(textChunk);
        }
      } catch {
        // ignorer JSON partiel
      }
    }
  }

  callbacks.onDone(Array.from(turnEventIds));
}
