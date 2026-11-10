import express from 'express';
import type { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import type { LiveServerMessage } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

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

const DEFAULT_SUPABASE_URL = 'https://qbngqstyhusndngkours.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFibmdxc3R5aHVzbmRuZ2tvdXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NDk2MjEsImV4cCI6MjEwMDUyNTYyMX0.FjxlwhFLJe9rgio0FmP48ae8maMNuWwn3yZv2g_p8dM';

const supabaseServer = createClient(
  process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
);

const AI_SYSTEM_INSTRUCTION = `Tu es l'assistant concierge intelligent officiel de Gbaigbance, l'application de billetterie d'événements leader en Afrique de l'Ouest (Togo, Bénin, Côte d'Ivoire).
Tu aides chaleureusement, avec précision et rigueur, les utilisateurs à découvrir leurs sorties et à gérer leurs réservations.

OBLIGATION STRICTE D'UTILISATION DES OUTILS POUR LES ÉVÉNEMENTS (ZÉRO CONNAISSANCE EXTERNE) :
1. Pour toute question portant sur des événements, sorties, concerts, festivals, spectacles, conférences, dates, lieux, artistes, disponibilités ou tarifs, tu as l'OBLIGATION ABSOLUE d'appeler l'un des outils fournis ('search_events', 'get_event_details', 'get_nearby_events').
2. Il t'est FORMELLEMENT INTERDIT de t'appuyer sur tes connaissances pré-entraînées ou des informations externes au système pour décrire, recommander, dater, tarifer ou confirmer un événement. Toutes les informations sur les événements doivent provenir exclusivement et en temps réel de la table 'public.events' via les outils.

RECROISEMENT SYSTÉMATIQUE DU CONTEXTE UTILISATEUR AVEC LA TABLE 'public.events' :
1. Dès qu'un contexte utilisateur est fourni (coordonnées GPS lat/lng, ville/pays, informations de profil, favoris, ou billets) :
   - Tu DOIS IMPÉRATIVEMENT recroiser ce contexte utilisateur avec les données réelles de la table 'public.events' via les outils appropriés.
   - Si la position géographique (GPS ou ville) est fournie, appelle 'get_nearby_events' (avec lat/lng) ou 'search_events' (avec la ville/zone) pour ne proposer que des événements réels proches ou pertinents pour cette localisation.
   - Si l'utilisateur demande une recommandation selon ses goûts ou préférences, appelle 'get_my_favorites' (et si nécessaire 'get_my_profile_lite'), puis recroise IMMÉDIATEMENT en appelant 'search_events' pour vérifier quels événements actuels et publiés dans 'public.events' correspondent à ces goûts.
2. Ne recommande JAMAIS un événement qui n'a pas été explicitement validé et retourné par une requête d'outil sur la table 'public.events' lors du tour de conversation en cours.

REFUS STRICT DE TOUTE RÉPONSE HORS DES OUTILS FOURNIS :
1. RÈGLE DE REFUS CATÉGORIQUE : Si l'utilisateur pose une question sur un événement, un artiste, une date, un lieu ou un tarif qui ne figure pas ou n'est pas vérifié dans les données retournées par les outils de la table 'public.events' (ou si l'outil renvoie 0 résultat), tu DOIS EXPLICITEMENT REFUSER de fournir des informations non confirmées ou d'extrapoler.
2. Formule ton refus poliment et sans ambiguïté : "Cet événement (ou cette information) ne figure pas dans le catalogue officiel et vérifié des événements de Gbaigbance ('public.events'). Afin de garantir des informations fiables et exactes, je ne peux communiquer aucun détail non validé par nos outils en direct."
3. N'INVENTE, N'ESTIME ET N'APPROXIME JAMAIS d'événement, de prix, de date, d'artiste ou de lieu absent des données d'outils.

SORTIE EN TEXTE PUR ET CARTES :
N'inclus JAMAIS d'image en markdown (![]) ni de lien web externe (http/https). L'interface affichera automatiquement des cartes interactives pour les événements vérifiés que tu recommandes.

TON ET STYLE :
Langue : Français soigné, chaleureux, dynamique et concis.
Contexte géographique : Lomé et Afrique de l'Ouest, prix en FCFA (XOF).`;

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
    ],
  },
];

async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  context: {
    userId?: string | null;
    userLocation?: { lat: number; lng: number } | null;
    turnEventIds: Set<string>;
  }
): Promise<unknown> {
  const { turnEventIds, userId } = context;

  switch (name) {
    case 'search_events': {
      const query = String(args.query || '').trim();
      const category = args.category ? String(args.category).trim() : null;
      const freeOnly = Boolean(args.free_only);
      const limit = Math.min(Math.max(Number(args.limit) || 5, 1), 8);

      let dbQuery = supabaseServer
        .from('events')
        .select('id, title, category, starts_at, location_name, city, price_min, currency, cover_url')
        .eq('status', 'published')
        .order('starts_at', { ascending: true })
        .limit(limit * 2);

      if (query) {
        dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%,location_name.ilike.%${query}%,city.ilike.%${query}%`);
      }
      if (category) {
        dbQuery = dbQuery.eq('category', category);
      }
      if (freeOnly) {
        dbQuery = dbQuery.eq('price_min', 0);
      }

      const { data, error } = await dbQuery;
      if (error || !data) {
        return { count: 0, events: [] };
      }

      const eventsList = data.slice(0, limit).map((ev) => {
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

      return { count: eventsList.length, events: eventsList };
    }

    case 'get_event_details': {
      const eventId = String(args.event_id || '').trim();
      if (!eventId) return { error: 'Identifiant d’événement manquant.' };

      const { data, error } = await supabaseServer
        .from('events')
        .select('id, title, description, category, starts_at, ends_at, location_name, location_address, city, country, price_min, price_max, currency, cover_url, capacity, attendees_count')
        .eq('id', eventId)
        .eq('status', 'published')
        .maybeSingle();

      if (error || !data) {
        return { error: 'Événement introuvable ou non publié.' };
      }

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
        price_range: data.price_min === 0 ? 'Gratuit' : `${data.price_min} FCFA`,
        description: (data.description || '').slice(0, 350),
      };
    }

    case 'get_nearby_events': {
      const lat = Number(args.lat);
      const lng = Number(args.lng);
      const limit = Math.min(Math.max(Number(args.limit) || 5, 1), 8);

      if (isNaN(lat) || isNaN(lng)) return { error: 'Coordonnées GPS invalides.' };

      // Recherche les événements publiés dans le secteur
      const { data } = await supabaseServer
        .from('events')
        .select('id, title, category, starts_at, location_name, city, price_min, currency, latitude, longitude')
        .eq('status', 'published')
        .order('starts_at', { ascending: true })
        .limit(limit);

      if (!data || data.length === 0) {
        return { count: 0, events: [] };
      }

      const eventsList = data.map((ev) => {
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

      return { count: eventsList.length, events: eventsList };
    }

    case 'get_my_tickets': {
      if (!userId || userId.startsWith('guest-')) {
        return { authenticated: false, message: 'Utilisateur non connecté' };
      }
      const { data } = await supabaseServer
        .from('tickets')
        .select('id, event_id, ticket_type, price_paid, qr_code, status, event:events(title, starts_at, location_name, city)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      return { count: data?.length || 0, tickets: data || [] };
    }

    case 'get_my_favorites': {
      if (!userId || userId.startsWith('guest-')) {
        return { authenticated: false, message: 'Utilisateur non connecté' };
      }
      const { data } = await supabaseServer
        .from('user_favorites')
        .select('event_id, event:events(id, title, category, starts_at, city)')
        .eq('user_id', userId)
        .limit(5);

      return { count: data?.length || 0, favorites: data || [] };
    }

    case 'get_my_profile_lite': {
      if (!userId || userId.startsWith('guest-')) {
        return { authenticated: false, message: 'Invité' };
      }
      const { data } = await supabaseServer
        .from('profiles')
        .select('id, name, city, country, role')
        .eq('id', userId)
        .maybeSingle();

      return data || { id: userId };
    }

    default:
      return { error: `Outil ${name} non reconnu.` };
  }
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
    active: true,
    model: 'gemini-3.8-flash',
    liveModel: 'gemini-3.8-live',
    provider: 'GoogleGenAI',
  });
});

// Endpoint de streaming conversationnel (SSE)
app.post('/api/ai/assistant/stream', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const { messages = [], userLocation, userId } = req.body;
  const turnEventIds = new Set<string>();

  try {
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
    let iterations = 0;
    const maxIterations = 5;

    while (iterations < maxIterations) {
      iterations++;

      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction: AI_SYSTEM_INSTRUCTION,
          tools: GEMINI_TOOLS,
          temperature: 0.7,
        },
      });

      let functionCallFound: { name: string; args: Record<string, unknown> } | null = null;

      for await (const chunk of responseStream) {
        // Envoi des fragments de texte
        if (chunk.text) {
          res.write(`event: chunk\ndata: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }

        // Détection d'un appel d'outil
        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          const fc = chunk.functionCalls[0];
          functionCallFound = {
            name: fc.name,
            args: (fc.args as Record<string, unknown>) || {},
          };
        }
      }

      // Si le modèle a demandé un outil, on l'exécute et on relance la boucle
      if (functionCallFound) {
        const { name, args } = functionCallFound;
        const toolResult = await executeToolCall(name, args, {
          userId,
          userLocation,
          turnEventIds,
        });

        contents.push({
          role: 'model',
          parts: [{ functionCall: { name, args } }],
        });

        contents.push({
          role: 'user',
          parts: [{ functionResponse: { name, response: toolResult } }],
        });

        continue;
      }

      // Pas d'appel d'outil, fin du tour
      break;
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
  const { prompt, currentEvent, userLocation, userId } = req.body;
  const turnEventIds = new Set<string>();

  try {
    let fullPrompt = prompt || '';
    if (currentEvent) {
      fullPrompt = `À propos de l'événement "${currentEvent.title}" (${currentEvent.location_name || ''}, ${currentEvent.city || 'Lomé'}) : ${prompt}`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: fullPrompt,
      config: {
        systemInstruction: AI_SYSTEM_INSTRUCTION,
        tools: GEMINI_TOOLS,
        temperature: 0.7,
      },
    });

    // Si function call, l'exécuter une fois
    let text = response.text || '';
    if (response.functionCalls && response.functionCalls.length > 0) {
      const fc = response.functionCalls[0];
      const toolResult = await executeToolCall(fc.name, (fc.args as Record<string, unknown>) || {}, {
        userId,
        userLocation,
        turnEventIds,
      });

      const second = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          { role: 'user', parts: [{ text: fullPrompt }] },
          { role: 'model', parts: [{ functionCall: { name: fc.name, args: fc.args } }] },
          { role: 'user', parts: [{ functionResponse: { name: fc.name, response: toolResult } }] },
        ],
        config: {
          systemInstruction: AI_SYSTEM_INSTRUCTION,
        },
      });
      text = second.text || text;
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
