import { supabase } from '@/services/supabase';
import { validateTicketQr } from '@/features/tickets/service';
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

export interface GateValidationResult {
  status: 'valid' | 'already_used' | 'invalid' | 'wrong_event' | 'cancelled';
  message: string;
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
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('id, event_id, qr_code, status, ticket_type, seat_info, user_id, recipient_name, profiles(name, phone)')
      .eq('event_id', eventId);

    if (error || !tickets) return 0;

    const cachePayload = tickets.map((t) => {
      const profile = (t.profiles as unknown as { name?: string; phone?: string }) || {};
      return {
        id: t.id,
        event_id: t.event_id,
        qr_code: t.qr_code,
        status: t.status,
        ticket_type: t.ticket_type,
        seat_info: t.seat_info,
        participant_name: t.recipient_name || profile.name || 'Participant',
      };
    });

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
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('status')
      .eq('event_id', eventId)
      .neq('status', 'cancelled');

    if (error || !tickets) {
      return { totalTickets: 0, scannedCount: 0, activeCount: 0 };
    }

    const totalTickets = tickets.length;
    const scannedCount = tickets.filter((t) => t.status === 'used').length;
    const activeCount = tickets.filter((t) => t.status === 'valid' || t.status === 'active').length;

    return { totalTickets, scannedCount, activeCount };
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
          participantName: res.participant_name || 'Participant',
          ticketType: ticket?.ticket_type ? ticket.ticket_type.toUpperCase() : 'STANDARD',
          seatInfo: ticket?.seat_info || null,
          ticket,
          eventTitle: targetEvent?.title,
          isOffline: false,
        };
      }

      // Gestion des cas d'échec retournés par le RPC
      const err = res.error || '';
      if (err.includes('déjà été validé') || err.includes('used')) {
        const ticket = res.ticket as Partial<Ticket> | undefined;
        return {
          status: 'already_used',
          message: 'Billet déjà scanné et utilisé à l’entrée !',
          participantName: res.participant_name || 'Participant',
          ticketType: ticket?.ticket_type ? ticket.ticket_type.toUpperCase() : undefined,
          ticket,
          eventTitle: targetEvent?.title,
          isOffline: false,
        };
      }

      if (err.includes('annulé') || err.includes('cancelled')) {
        return {
          status: 'cancelled',
          message: 'Ce billet a été annulé ou remboursé',
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
            eventTitle: otherEv?.title,
            isOffline: false,
          };
        }
      } catch {
        // Ignorer
      }

      return {
        status: 'invalid',
        message: res.error || 'Billet introuvable ou invalide pour cet événement',
        eventTitle: targetEvent?.title,
        isOffline: false,
      };
    } catch (apiErr) {
      console.warn('Erreur appel RPC validateTicketQr, passage en secours local:', apiErr);
      // En cas d'erreur réseau transitoire, bascule en vérification locale
    }
  }

  // 2. MODE HORS-LIGNE (RÉSEAU COUPE / SALLE DE CONCERT EN SOUS-SOL)
  const targetId = params.selectedEventId && params.selectedEventId !== 'all'
    ? params.selectedEventId
    : params.availableEvents[0]?.id;

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
      const match = cachedTickets.find((t) => t.qr_code === code);
      if (match) {
        if (match.status === 'used') {
          return {
            status: 'already_used',
            message: 'Billet déjà validé (détecté hors-ligne)',
            participantName: match.participant_name,
            ticketType: match.ticket_type.toUpperCase(),
            seatInfo: match.seatInfo,
            isOffline: true,
          };
        }
        if (match.status === 'cancelled') {
          return {
            status: 'cancelled',
            message: 'Billet annulé (base hors-ligne)',
            isOffline: true,
          };
        }

        // Marquer comme scanné dans le cache local
        match.status = 'used';
        await set(`${OFFLINE_TICKETS_KEY_PREFIX}${targetId}`, cachedTickets);

        // Enregistrer dans la file d'attente de synchronisation
        const queue = (await get<Array<{ qrCode: string; eventId: string; scannedAt: string }>>(OFFLINE_QUEUE_KEY)) || [];
        queue.push({ qrCode: code, eventId: targetId, scannedAt: new Date().toISOString() });
        await set(OFFLINE_QUEUE_KEY, queue);

        return {
          status: 'valid',
          message: 'Billet validé hors-ligne ⚡ (Synchronisation dès retour du réseau)',
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
    isOffline: !isOnline,
  };
}

/**
 * Synchronise les validations stockées hors-ligne une fois la connexion rétablie
 */
export async function syncOfflineGateQueue(): Promise<{ synced: number; failed: number }> {
  try {
    const queue = (await get<Array<{ qrCode: string; eventId: string; scannedAt: string }>>(OFFLINE_QUEUE_KEY)) || [];
    if (queue.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;
    const remaining: typeof queue = [];

    for (const item of queue) {
      try {
        const res = await validateTicketQr(item.qrCode, item.eventId);
        if (res.success || res.error?.includes('used')) {
          synced++;
        } else {
          failed++;
        }
      } catch {
        remaining.push(item);
        failed++;
      }
    }

    await set(OFFLINE_QUEUE_KEY, remaining);
    return { synced, failed };
  } catch {
    return { synced: 0, failed: 0 };
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
