import { sendLocalPushNotification } from './pushNotificationService';
import { getSyncCachedUserTickets } from './cache';
import { supabase, isSupabaseConfigured } from './supabase';
import { isRealEvent } from '@/features/events/status';
import { collectFollowTargets, uniqueFollowIds } from './eventReminderRules';
import type { Event, Ticket } from '@/types';

const REMINDERS_KEY = 'gba_dispatched_reminders_v1';
const ARTIST_ALERTS_KEY = 'gba_dispatched_artist_alerts_v1';
/** Marque qu'une base silencieuse des dates déjà présentes a été posée (premier lancement). */
const ARTIST_BASELINE_KEY = 'gba_artist_alerts_baseline_done_v1';

// Empêche un double envoi si l'accueil et le démarrage global réclament la même alerte dans le même tour.
const claimedArtistAlerts = new Set<string>();

function isArtistBaselineDone(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(ARTIST_BASELINE_KEY) === '1';
  } catch {
    return true;
  }
}

function markArtistBaselineDone(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ARTIST_BASELINE_KEY, '1');
  } catch {
    // Ignore
  }
}

function getDispatchedKeys(storageKey: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {
    // Ignore
  }
  return new Set();
}

function saveDispatchedKey(storageKey: string, key: string): void {
  if (typeof window === 'undefined') return;
  try {
    const set = getDispatchedKeys(storageKey);
    set.add(key);
    // Keep max 200 elements to avoid localStorage growth
    const arr = Array.from(set).slice(-200);
    localStorage.setItem(storageKey, JSON.stringify(arr));
  } catch {
    // Ignore
  }
}

/**
 * Vérifie si les rappels d'événements sont activés pour l'utilisateur.
 * Lecture seule : ne crée pas de ligne de préférence (évite les effets de bord sur le planificateur).
 * Défaut : activé si aucune préférence ou erreur de lecture.
 */
async function areEventRemindersEnabled(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('event_reminders')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return true;
    return data.event_reminders !== false;
  } catch {
    return true;
  }
}

/**
 * Analyse les billets réservés par l'utilisateur et déclenche les rappels 24h et 2h
 * Respecte la préférence `event_reminders` de l'utilisateur.
 */
export async function checkAndTriggerTicketReminders(userId: string): Promise<number> {
  if (!userId) return 0;

  const remindersEnabled = await areEventRemindersEnabled(userId);
  if (!remindersEnabled) return 0;

  let tickets: Ticket[] = [];

  // Lecture synchrone du cache rapide
  const cached = getSyncCachedUserTickets(userId);
  if (cached.length > 0) {
    tickets = cached;
  } else if (isSupabaseConfigured) {
    try {
      const { data } = await supabase
        .from('tickets')
        .select('*, event:events(*)')
        .eq('user_id', userId)
        .in('status', ['valid', 'pending']);
      if (data) tickets = data as Ticket[];
    } catch {
      // Ignore
    }
  }

  const validTickets = tickets.filter((t) => t.status === 'valid' || t.status === 'pending');
  if (validTickets.length === 0) return 0;

  const dispatchedReminders = getDispatchedKeys(REMINDERS_KEY);
  const now = Date.now();
  let triggeredCount = 0;

  for (const ticket of validTickets) {
    const event = ticket.event;
    if (!event || !event.starts_at) continue;

    const startsAtMs = new Date(event.starts_at).getTime();
    const diffHours = (startsAtMs - now) / (1000 * 60 * 60);

    // Rappel 24h : entre 20h et 26h avant l'événement
    if (diffHours >= 20 && diffHours <= 26) {
      const tag24 = `rem_24h_${ticket.id}_${event.id}`;
      if (!dispatchedReminders.has(tag24)) {
        saveDispatchedKey(REMINDERS_KEY, tag24);
        const timeStr = new Date(event.starts_at).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        sendLocalPushNotification({
          title: `⏰ Rappel 24h : ${event.title}`,
          body: `Votre événement commence demain à ${timeStr} ! Retrouvez votre billet QR Code dans l'application.`,
          tag: tag24,
          data: { url: '/tickets', ticketId: ticket.id, eventId: event.id },
          vibrate: [100, 50, 100],
        });
        triggeredCount++;
      }
    }

    // Rappel 2h : entre 30 min et 2h30 avant l'événement
    if (diffHours >= 0.5 && diffHours <= 2.5) {
      const tag2h = `rem_2h_${ticket.id}_${event.id}`;
      if (!dispatchedReminders.has(tag2h)) {
        saveDispatchedKey(REMINDERS_KEY, tag2h);
        sendLocalPushNotification({
          title: `⚡ Rappel 2h : ${event.title} commence bientôt !`,
          body: `Rendez-vous à ${event.location_name || event.city} ! Votre billet est prêt pour un contrôle rapide au guichet.`,
          tag: tag2h,
          data: { url: '/tickets', ticketId: ticket.id, eventId: event.id },
          vibrate: [150, 50, 150],
        });
        triggeredCount++;
      }
    }
  }

  return triggeredCount;
}

/**
 * Détecte si de nouveaux événements annoncés concernent des artistes suivis par l'utilisateur.
 * Au premier passage (base absente), enregistre silencieusement les dates déjà présentes
 * sans envoyer de notification, pour éviter le spam du catalogue existant.
 */
export function checkFollowedArtistsNewDates(
  events: Event[],
  followedArtistIds: Set<string>
): number {
  if (events.length === 0 || followedArtistIds.size === 0) return 0;

  const dispatchedAlerts = getDispatchedKeys(ARTIST_ALERTS_KEY);
  const baselineDone = isArtistBaselineDone();
  let alertedCount = 0;

  for (const event of events) {
    if (!event.artist_id && !event.organizer_id) continue;

    const matchesArtist =
      (event.artist_id && followedArtistIds.has(event.artist_id)) ||
      (event.organizer_id && followedArtistIds.has(event.organizer_id));

    if (!matchesArtist) continue;

    const alertTag = `artist_date_${event.id}`;
    // Réservation synchrone : deux appels concurrents (accueil + démarrage) ne notifient qu'une fois.
    if (dispatchedAlerts.has(alertTag) || claimedArtistAlerts.has(alertTag)) continue;
    claimedArtistAlerts.add(alertTag);
    saveDispatchedKey(ARTIST_ALERTS_KEY, alertTag);
    dispatchedAlerts.add(alertTag);

    // Premier lancement : on pose la base sans notifier.
    if (!baselineDone) continue;

    const dateStr = new Date(event.starts_at).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });

    sendLocalPushNotification({
      title: `🎤 Nouvelle date annoncée !`,
      body: `Un artiste que vous suivez se produira le ${dateStr} à ${event.city} : "${event.title}". Réservez dès maintenant !`,
      tag: alertTag,
      data: { url: `/events/${event.id}`, eventId: event.id },
      vibrate: [80, 40, 80],
    });

    alertedCount++;
  }

  if (!baselineDone) {
    markArtistBaselineDone();
  }

  return alertedCount;
}

/**
 * Événements publiés encore à venir, rattachés aux artistes ou festivals suivis.
 * Indépendant du catalogue d'accueil : une fiche ouverte en lien direct doit aussi alerter.
 */
export async function fetchPublishedEventsForFollows(
  artistIds: Iterable<string>,
  organizerIds: Iterable<string>
): Promise<Event[]> {
  if (!isSupabaseConfigured) return [];
  const artists = uniqueFollowIds(artistIds);
  const orgs = uniqueFollowIds(organizerIds);
  if (artists.length === 0 && orgs.length === 0) return [];

  const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const byId = new Map<string, Event>();

  const pull = async (column: 'artist_id' | 'organizer_id', ids: string[]) => {
    if (ids.length === 0) return;
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .in(column, ids)
      .gte('starts_at', since)
      .order('starts_at', { ascending: true })
      .limit(40);
    if (error || !data) return;
    for (const row of data as Event[]) {
      if (isRealEvent(row)) byId.set(row.id, row);
    }
  };

  await Promise.all([pull('artist_id', artists), pull('organizer_id', orgs)]);
  return Array.from(byId.values());
}

/**
 * Planifié au démarrage de l'app, pas seulement quand l'accueil est monté.
 */
export async function checkFollowedArtistsAnnouncements(
  artistIds: Iterable<string>,
  organizerIds: Iterable<string>
): Promise<number> {
  const targets = collectFollowTargets(artistIds, organizerIds);
  if (targets.size === 0) return 0;
  const events = await fetchPublishedEventsForFollows(artistIds, organizerIds);
  return checkFollowedArtistsNewDates(events, targets);
}

/**
 * Déclenche une notification de test instantanée
 */
export async function triggerTestPushNotification(): Promise<boolean> {
  return sendLocalPushNotification({
    title: '🔔 Test Notification Web Push Gbaïgbancê',
    body: 'Les notifications PWA sont actives ! Vous recevrez vos rappels 24h & 2h ainsi que les alertes de vos artistes favoris.',
    tag: `test_${Date.now()}`,
    data: { url: '/' },
    vibrate: [100, 50, 100],
  });
}
