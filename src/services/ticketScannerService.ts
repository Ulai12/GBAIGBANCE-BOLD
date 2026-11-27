import { supabase } from '@/services/supabase';
import { validateTicketQr } from '@/features/tickets/service';
import { coreVerifyQr } from '@/lib/rust-core';
import { get, set } from 'idb-keyval';
import type { Ticket, Event } from '@/types';

export interface GateScanRecord {
  id: string;
  qrCode: string;
  ticketId?: string;
  eventId: string;
  eventTitle: string;
  status: 'valid' | 'already_used' | 'invalid' | 'wrong_event' | 'cancelled';
  participantName: string;
  ticketType?: string;
  seatInfo?: string | null;
  scannedAt: string;
  isOffline?: boolean;
}

export type GateValidationMessageKey =
  | 'emptyQr' | 'qrEngine' | 'noEvents' | 'validOnline' | 'alreadyUsedOnline'
  | 'cancelledOnline' | 'wrongEvent' | 'invalidOnline' | 'alreadyUsedOffline'
  | 'cancelledOffline' | 'validOffline' | 'verifiedOffline' | 'unknownQrOnline' | 'unknownQrOffline';

export interface GateValidationResult {
  status: 'valid' | 'already_used' | 'invalid' | 'wrong_event' | 'cancelled';
  message: string;
  messageKey?: GateValidationMessageKey;
  participantName?: string;
  ticketType?: string;
  seatInfo?: string | null;
  ticket?: Partial<Ticket>;
  eventTitle?: string;
  isOffline?: boolean;
}

const OFFLINE_TICKETS_KEY_PREFIX = 'gba_gate_tickets_';
const OFFLINE_QUEUE_KEY = 'gba_gate_offline_queue';
const GATE_HISTORY_KEY = 'gba_gate_scan_history';

/**
 * Nettoie et extrait le code QR effectif depuis une chaîne brute, URL ou JSON
 */
export function sanitizeQrCode(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();

  // Si c'est un format JSON encodé
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.qr_code) return String(parsed.qr_code).trim();
      if (parsed.qr) return String(parsed.qr).trim();
      if (parsed.id) return String(parsed.id).trim();
    } catch {
      // Ignorer l'échec de parsing JSON
    }
  }

  // Si c'est une URL Gbaïgbancê avec jeton de réclamation ou ID
  if (trimmed.includes('#claim=')) {
    const parts = trimmed.split('#claim=');
    return decodeURIComponent(parts[1]?.split('&')[0] || '').trim();
  }
  if (trimmed.includes('claim_token=')) {
    const parts = trimmed.split('claim_token=');
    return decodeURIComponent(parts[1]?.split('&')[0] || '').trim();
  }
  if (trimmed.includes('/tickets/')) {
    const parts = trimmed.split('/tickets/');
    return decodeURIComponent(parts[1]?.split('?')[0] || '').trim();
  }

  return trimmed;
}

/**
 * Synthétiseur audio Web Audio API pour retour sonore instantané au guichet
 * Fonctionne 100% hors-ligne sans fichier MP3 externe
 */
class GateAudioEngine {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  play(type: 'valid' | 'already_used' | 'invalid' | 'wrong_event') {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      if (type === 'valid') {
        // Carillon ascendant mélodieux et éclatant (880Hz -> 1320Hz)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'already_used') {
        // Double alerte avertissement (520Hz -> 390Hz)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.setValueAtTime(390, now + 0.15);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else {
        // Buzzer grave d'erreur (200Hz dent de scie)
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(160, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch {
      // Ignorer silencieusement si bloqué par le navigateur
    }
  }
}

export const gateAudio = new GateAudioEngine();

/**
 * Précharge les billets d'un événement en cache local pour le mode guichet hors-ligne
 */
export async function preloadEventTicketsForOffline(eventId: string): Promise<number> {
  try {
    const tickets: Array<{
      id: string;
      event_id: string;
      qr_code: string | null;
      status: string;
      ticket_type: string;
      seat_info: string | null;
      user_id: string;
      recipient_name: string | null;
    }> = [];

    // PostgREST limite les réponses; paginer évite de tronquer les grands événements.
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase
        .from('tickets')
        .select('id, event_id, qr_code, status, ticket_type, seat_info, user_id, recipient_name')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true })
        .range(offset, offset + 499);

      if (error || !data) return 0;
      tickets.push(...data);
      if (data.length < 500) break;
    }

    // Les billets pointent vers auth.users, pas directement vers profiles.
    // On récupère donc les noms via la projection publique autorisée par RLS,
    // sans exposer les numéros de téléphone du profil.
    const userIds = Array.from(
      new Set(
        tickets
          .map((ticket) => ticket.user_id)
          .filter((userId): userId is string => typeof userId === 'string' && userId.length > 0)
      )
    );
    const profileNameById = new Map<string, string>();

    // Petits lots pour éviter une URL PostgREST trop longue sur les grands événements.
    const profileBatches = await Promise.all(
      Array.from({ length: Math.ceil(userIds.length / 200) }, (_, index) =>
        supabase
          .from('public_profiles')
          .select('id, name')
          .in('id', userIds.slice(index * 200, (index + 1) * 200))
      )
    );

    for (const batch of profileBatches) {
      if (batch.error) {
        console.warn('Erreur lors de la lecture des noms publics des participants:', batch.error);
        continue;
      }

      for (const profile of batch.data || []) {
        if (profile.id && profile.name?.trim()) {
          profileNameById.set(profile.id, profile.name.trim());
        }
      }
    }

    const cachePayload = tickets.map((ticket) => ({
      id: ticket.id,
      event_id: ticket.event_id,
      qr_code: ticket.qr_code,
      status: ticket.status,
      ticket_type: ticket.ticket_type,
      seat_info: ticket.seat_info,
      participant_name:
        ticket.recipient_name?.trim() ||
        profileNameById.get(ticket.user_id) ||
        'Participant',
    }));

    await set(`${OFFLINE_TICKETS_KEY_PREFIX}${eventId}`, cachePayload);
    return cachePayload.length;
  } catch (err) {
    console.warn('Erreur lors du préchargement hors-ligne des billets:', err);
    return 0;
  }
}

/**
 * Récupère les statistiques de scannage en direct pour un événement
 */
export async function fetchEventGateStats(eventId: string): Promise<{
  totalTickets: number;
  scannedCount: number;
  activeCount: number;
}> {
  try {
    const [totalResult, scannedResult, activeResult] = await Promise.all([
      supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('event_id', eventId).in('status', ['valid', 'active', 'used']),
      supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('event_id', eventId).eq('status', 'used'),
      supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('event_id', eventId).in('status', ['valid', 'active']),
    ]);

    if (totalResult.error || scannedResult.error || activeResult.error) {
      return { totalTickets: 0, scannedCount: 0, activeCount: 0 };
    }

    return {
      totalTickets: totalResult.count || 0,
      scannedCount: scannedResult.count || 0,
      activeCount: activeResult.count || 0,
    };
  } catch {
    return { totalTickets: 0, scannedCount: 0, activeCount: 0 };
  }
}

/**
 * Valide un billet scanné soit via RPC Supabase en ligne, soit via cache local hors-ligne
 */
export async function processTicketGateValidation(params: {
  rawCode: string;
  selectedEventId?: string;
  availableEvents: Event[];
}): Promise<GateValidationResult> {
  const code = sanitizeQrCode(params.rawCode);

  if (!code) {
    return {
      status: 'invalid',
      message: 'Code QR vide ou illisible',
      messageKey: 'emptyQr',
    };
  }

  // Vérification cryptographique immédiate par le cœur Rust
  const qrCheck = await coreVerifyQr(
    code,
    params.selectedEventId && params.selectedEventId !== 'all' ? params.selectedEventId : undefined
  );
  if (!qrCheck.valid) {
    return {
      status: qrCheck.reason?.includes('autre événement') ? 'wrong_event' : 'invalid',
      message: qrCheck.reason || 'Billet invalide ou contrefait (Moteur Rust)',
      messageKey: qrCheck.reason?.includes('autre événement') ? 'wrongEvent' : 'qrEngine',
    };
  }

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  // 1. SI LE DISPOSITIF EST EN LIGNE
  if (isOnline) {
    let targetEventId = params.selectedEventId;
    let targetEvent = params.availableEvents.find((e) => e.id === targetEventId);

    // Si aucun événement spécifique sélectionné (mode multi-événement / auto-détection)
    if (!targetEventId || targetEventId === 'all') {
      try {
        const { data: matchedTicket } = await supabase
          .from('tickets')
          .select('id, event_id, events(id, title)')
          .eq('qr_code', code)
          .maybeSingle();

        if (matchedTicket?.event_id) {
          targetEventId = matchedTicket.event_id;
          const evData = matchedTicket.events as unknown as { id: string; title: string };
          targetEvent = params.availableEvents.find((e) => e.id === targetEventId) || {
            id: evData?.id || targetEventId,
            title: evData?.title || 'Événement',
          } as Event;
        }
      } catch {
        // Continue
      }
    }

    if (!targetEventId || targetEventId === 'all') {
      // Tenter avec le premier événement disponible
      if (params.availableEvents.length > 0) {
        targetEventId = params.availableEvents[0].id;
        targetEvent = params.availableEvents[0];
      } else {
        return {
          status: 'invalid',
          message: 'Aucun événement disponible pour valider ce billet',
          messageKey: 'noEvents',
        };
      }
    }

    try {
      const res = await validateTicketQr(code, targetEventId);

      if (res.success) {
        const ticket = res.ticket as Partial<Ticket> | undefined;
        return {
          status: 'valid',
          message: res.message || 'Billet validé avec succès ! Entrée accordée 🎉',
          messageKey: 'validOnline',
          participantName: res.participant_name || undefined,
          ticketType: ticket?.ticket_type ? ticket.ticket_type.toUpperCase() : 'STANDARD',
          seatInfo: ticket?.seat_info || null,
          ticket,
          eventTitle: targetEvent?.title,
          isOffline: false,
        };
      }

      // Gestion des cas d'échec retournés par le RPC
      const err = res.error || '';
      if (res.code === 'ALREADY_USED' || err.includes('déjà été validé') || err.includes('used')) {
        const ticket = res.ticket as Partial<Ticket> | undefined;
        return {
          status: 'already_used',
          message: 'Billet déjà scanné et utilisé à l’entrée !',
          messageKey: 'alreadyUsedOnline',
          participantName: res.participant_name || undefined,
          ticketType: ticket?.ticket_type ? ticket.ticket_type.toUpperCase() : undefined,
          ticket,
          eventTitle: targetEvent?.title,
          isOffline: false,
        };
      }

      if (res.code === 'CANCELLED' || err.includes('annulé') || err.includes('cancelled')) {
        return {
          status: 'cancelled',
          message: 'Ce billet a été annulé ou remboursé',
          messageKey: 'cancelledOnline',
          eventTitle: targetEvent?.title,
          isOffline: false,
        };
      }

      // Si le billet existe mais pour un AUTRE événement de l'organisateur
      try {
        const { data: otherTicket } = await supabase
          .from('tickets')
          .select('id, event_id, events(title)')
          .eq('qr_code', code)
          .maybeSingle();

        if (otherTicket && otherTicket.event_id !== targetEventId) {
          const otherEv = otherTicket.events as unknown as { title: string };
          return {
            status: 'wrong_event',
            message: `Billet valide mais prévu pour un autre événement : "${otherEv?.title || 'Autre date'}"`,
            messageKey: 'wrongEvent',
            eventTitle: otherEv?.title,
            isOffline: false,
          };
        }
      } catch {
        // Ignorer
      }

      return {
        status: 'invalid',
        message: res.code === 'EXPIRED'
          ? 'Ce billet a expiré.'
          : res.code === 'NOT_ADMITTABLE'
          ? 'Ce billet n’est pas confirmé ou ne permet pas l’entrée.'
          : res.error || 'Billet introuvable ou invalide pour cet événement',
        messageKey: 'invalidOnline',
        eventTitle: targetEvent?.title,
        isOffline: false,
      };
    } catch (apiErr) {
      console.warn('Erreur appel RPC validateTicketQr:', apiErr);
      // Une panne RPC alors que le navigateur est en ligne ne vaut jamais une admission locale.
      return {
        status: 'invalid',
        message: 'Validation serveur indisponible. Réessayez avant d’autoriser l’entrée.',
        messageKey: 'invalidOnline',
        eventTitle: targetEvent?.title,
        isOffline: false,
      };
    }
  }

  // 2. MODE HORS-LIGNE (RÉSEAU COUPE / SALLE DE CONCERT EN SOUS-SOL)
  const targetId = params.selectedEventId && params.selectedEventId !== 'all'
    ? params.selectedEventId
    : qrCheck.event_id || params.availableEvents[0]?.id;

  if (targetId) {
    const cachedTickets = await get<Array<{
      id: string;
      event_id: string;
      qr_code: string;
      status: string;
      ticket_type: string;
      seatInfo?: string;
      participant_name: string;
    }>>(`${OFFLINE_TICKETS_KEY_PREFIX}${targetId}`);

    if (cachedTickets && cachedTickets.length > 0) {
      const match = cachedTickets.find(
        (t) => t.qr_code === code || (qrCheck.ticket_id && t.id === qrCheck.ticket_id)
      );
      if (match) {
        if (match.status === 'used') {
          return {
            status: 'already_used',
            message: 'Billet déjà validé (détecté hors-ligne)',
            messageKey: 'alreadyUsedOffline',
            participantName: match.participant_name,
            ticketType: match.ticket_type.toUpperCase(),
            seatInfo: match.seatInfo,
            isOffline: true,
          };
        }
        if (match.status === 'cancelled' || match.status === 'refunded') {
          return {
            status: 'cancelled',
            message: 'Billet annulé (base hors-ligne)',
            messageKey: 'cancelledOffline',
            isOffline: true,
          };
        }

        if (match.status === 'expired') {
          return {
            status: 'invalid',
            message: 'Billet expiré dans le cache hors-ligne.',
            messageKey: 'invalidOnline',
            isOffline: true,
          };
        }
        if (match.status !== 'valid' && match.status !== 'active') {
          return {
            status: 'invalid',
            message: 'Billet non confirmé dans le cache hors-ligne.',
            messageKey: 'invalidOnline',
            isOffline: true,
          };
        }

        // Marquer localement comme utilisé; ce statut reste provisoire jusqu'à synchronisation.
        match.status = 'used';
        await set(`${OFFLINE_TICKETS_KEY_PREFIX}${targetId}`, cachedTickets);

        // Une seule entrée de file par événement et code QR sur cet appareil.
        const queue = (await get<Array<{ qrCode: string; eventId: string; scannedAt: string }>>(OFFLINE_QUEUE_KEY)) || [];
        const alreadyQueued = queue.some((item) => item.eventId === targetId && item.qrCode === code);
        if (!alreadyQueued) {
          queue.push({ qrCode: code, eventId: targetId, scannedAt: new Date().toISOString() });
          await set(OFFLINE_QUEUE_KEY, queue);
        }

        return {
          status: 'valid',
          message: 'Billet validé hors-ligne ⚡ (Synchronisation dès retour du réseau)',
          messageKey: 'validOffline',
          participantName: match.participant_name,
          ticketType: match.ticket_type.toUpperCase(),
          seatInfo: match.seatInfo,
          isOffline: true,
        };
      }
    }

  }

  return {
    status: 'invalid',
    message: isOnline
      ? 'Code QR non reconnu comme billet Gbaïgbancê'
      : 'Billet non trouvé dans le cache local hors-ligne',
    messageKey: isOnline ? 'unknownQrOnline' : 'unknownQrOffline',
    isOffline: !isOnline,
  };
}

/**
 * Synchronise les validations stockées hors-ligne une fois la connexion rétablie
 */
export async function syncOfflineGateQueue(): Promise<{ synced: number; failed: number; conflicts: number }> {
  try {
    const queue = (await get<Array<{ qrCode: string; eventId: string; scannedAt: string }>>(OFFLINE_QUEUE_KEY)) || [];
    if (queue.length === 0) return { synced: 0, failed: 0, conflicts: 0 };

    let synced = 0;
    let failed = 0;
    let conflicts = 0;
    const remaining: typeof queue = [];

    for (const item of queue) {
      try {
        const res = await validateTicketQr(item.qrCode, item.eventId);
        if (res.success) {
          synced++;
          continue;
        }

        if (['ALREADY_USED', 'CANCELLED', 'EXPIRED', 'NOT_ADMITTABLE', 'INVALID_TICKET', 'EVENT_NOT_FOUND', 'FORBIDDEN'].includes(res.code || '')) {
          conflicts++;
          continue;
        }

        // Les erreurs temporaires restent en file pour une prochaine tentative.
        remaining.push(item);
        failed++;
      } catch {
        remaining.push(item);
        failed++;
      }
    }

    await set(OFFLINE_QUEUE_KEY, remaining);
    return { synced, failed, conflicts };
  } catch {
    return { synced: 0, failed: 0, conflicts: 0 };
  }
}

/**
 * Gestion de l'historique des scans du guichet
 */
export function getSavedGateHistory(): GateScanRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(GATE_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveGateScanRecord(record: GateScanRecord) {
  if (typeof window === 'undefined') return;
  try {
    const history = getSavedGateHistory();
    const updated = [record, ...history.filter((h) => h.id !== record.id)].slice(0, 50);
    localStorage.setItem(GATE_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // Ignore
  }
}

export function clearGateScanHistory() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(GATE_HISTORY_KEY);
  } catch {
    // Ignore
  }
}
