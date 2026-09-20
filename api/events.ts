import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Route publique en lecture seule pour exposer les événements publiés de Gbaigbance.
 * Conçue pour être consommée directement par des agents IA (ex: web_fetch)
 * et des clients sans exécution JavaScript.
 *
 * Spécifications :
 * - Méthode : GET uniquement (OPTIONS supporté pour CORS)
 * - Source : Supabase (clé ANON publique uniquement, jamais service_role)
 * - Filtre : status = 'published'
 * - Tri : Chronologique (starts_at ASC)
 * - Limite : 50 événements
 * - Cache : public, s-maxage=300, stale-while-revalidate=600
 * - Sécurité : Zéro email, téléphone, ID utilisateur ou données de billetterie/paiement
 */

// Interface stricte de sortie garantissant l'absence de champs sensibles ou internes
export interface PublicEventDto {
  id: string;
  titre: string;
  description: string;
  categorie: string;
  date: string;
  heure: string;
  ville: string;
  lieu: string;
  prix: string;
  image: string | null;
  nom_organisateur: string;
}

// Interface représentant les enregistrements bruts retournés par Supabase
interface RawEventRecord {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  starts_at: string | null;
  city: string | null;
  location_name: string | null;
  location_address: string | null;
  price_min: number | string | null;
  currency: string | null;
  cover_url: string | null;
  organizer?: { name: string } | null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. En-têtes CORS universels pour faciliter l'accès aux assistants IA et outils externes
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Gestion de la requête préliminaire (preflight) CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Seule la lecture (GET) est autorisée
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({
      error: 'Méthode non autorisée',
      message: 'Seule la méthode GET est acceptée sur cette route publique.',
    });
  }

  // 2. En-têtes de cache et type MIME requis
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  // 3. Récupération sécurisée des variables d'environnement Supabase (clé ANON publique uniquement)
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({
      error: 'Erreur de configuration serveur',
      message:
        'Variables Supabase manquantes sur Vercel. Veuillez configurer SUPABASE_URL et SUPABASE_ANON_KEY dans les paramètres Vercel.',
    });
  }

  try {
    // 4. Initialisation du client Supabase côté serveur avec la clé ANON publique (JAMAIS service_role)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // 5. Requête sur la table 'events' : uniquement les événements 'published'
    // Sélection restreinte aux seuls champs nécessaires avec jointure optionnelle sur l'organisation
    let eventsData: RawEventRecord[] = [];

    const { data, error } = await supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        category,
        starts_at,
        city,
        location_name,
        location_address,
        price_min,
        currency,
        cover_url,
        organizer:organizations(name)
      `)
      .eq('status', 'published')
      .order('starts_at', { ascending: true })
      .limit(50);

    if (error) {
      // En cas d'erreur de jointure sur 'organizer', repli défensif sur les colonnes directes de 'events'
      const fallbackQuery = await supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          category,
          starts_at,
          city,
          location_name,
          location_address,
          price_min,
          currency,
          cover_url
        `)
        .eq('status', 'published')
        .order('starts_at', { ascending: true })
        .limit(50);

      if (fallbackQuery.error) {
        throw new Error(fallbackQuery.error.message);
      }
      eventsData = (fallbackQuery.data as unknown as RawEventRecord[]) || [];
    } else {
      eventsData = (data as unknown as RawEventRecord[]) || [];
    }

    // 6. Filtrage strict et formatage des champs autorisés (zéro fuite de données personnelles ou internes)
    const sanitizedEvents: PublicEventDto[] = eventsData.map((e) => {
      // Décomposition et formatage de la date et de l'heure
      let formattedDate = '';
      let formattedTime = '';

      if (e.starts_at) {
        try {
          const dateObj = new Date(e.starts_at);
          if (!isNaN(dateObj.getTime())) {
            formattedDate = dateObj.toISOString().split('T')[0]; // Ex: 2026-10-24
            const hours = String(dateObj.getUTCHours()).padStart(2, '0');
            const minutes = String(dateObj.getUTCMinutes()).padStart(2, '0');
            formattedTime = `${hours}:${minutes} UTC`;
          }
        } catch {
          formattedDate = String(e.starts_at);
        }
      }

      // Formatage du tarif en FCFA
      const minPrice = Number(e.price_min) || 0;
      const formattedPrice = minPrice === 0 ? 'Gratuit' : `${minPrice.toLocaleString('fr-FR')} FCFA`;

      // Construction du lieu combiné (salle + adresse si dispo)
      const locationParts = [e.location_name, e.location_address].filter(Boolean);
      const formattedLocation = locationParts.join(', ') || e.city || 'Lomé, Togo';

      // Extraction propre du nom de l'organisateur (sans aucun ID ou email)
      const organizerName =
        e.organizer && typeof e.organizer === 'object' && 'name' in e.organizer
          ? String((e.organizer as { name: string }).name)
          : 'Organisateur Gbaigbance';

      return {
        id: String(e.id),
        titre: String(e.title || 'Sans titre'),
        description: String(e.description || '').trim(),
        categorie: String(e.category || 'concert'),
        date: formattedDate,
        heure: formattedTime,
        ville: String(e.city || 'Lomé'),
        lieu: formattedLocation,
        prix: formattedPrice,
        image: e.cover_url ? String(e.cover_url) : null,
        nom_organisateur: organizerName,
      };
    });

    // 7. Réponse JSON finale
    return res.status(200).json({
      success: true,
      total: sanitizedEvents.length,
      limit: 50,
      events: sanitizedEvents,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Erreur interne du serveur';
    return res.status(500).json({
      error: 'Erreur lors de la récupération des événements',
      message: errorMessage,
    });
  }
}
