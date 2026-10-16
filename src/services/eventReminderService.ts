import { sendLocalPushNotification } from './pushNotificationService';
import { getSyncCachedUserTickets } from './cache';
import { supabase, isSupabaseConfigured } from './supabase';
import type { Event, Ticket } from '@/types';

const REMINDERS_KEY = 'gba_dispatched_reminders_v1';
const ARTIST_ALERTS_KEY = 'gba_dispatched_artist_alerts_v1';

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
 * Analyse les billets réservés par l'utilisateur et déclenche les rappels 24h et 2h
 */
export async function checkAndTriggerTicketReminders(userId: string): Promise<number> {
  if (!userId) return 0;

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
 * Détecte si de nouveaux événements annoncés concernent des artistes suivis par l'utilisateur
 */
export function checkFollowedArtistsNewDates(
  events: Event[],
  followedArtistIds: Set<string>
): number {
  if (events.length === 0 || followedArtistIds.size === 0) return 0;

  const dispatchedAlerts = getDispatchedKeys(ARTIST_ALERTS_KEY);
  let alertedCount = 0;

  for (const event of events) {
    if (!event.artist_id && !event.organizer_id) continue;

    const matchesArtist =
      (event.artist_id && followedArtistIds.has(event.artist_id)) ||
      (event.organizer_id && followedArtistIds.has(event.organizer_id));

    if (matchesArtist) {
      const alertTag = `artist_date_${event.id}`;
      if (!dispatchedAlerts.has(alertTag)) {
        saveDispatchedKey(ARTIST_ALERTS_KEY, alertTag);

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
    }
  }

  return alertedCount;
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
