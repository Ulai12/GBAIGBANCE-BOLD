import { isSupabaseConfigured, supabase } from '@/services/supabase';
import type { 
  Ticket, 
  TicketOption, 
  TicketType, 
  EventStatus, 
  PaymentProvider,
  Event,
} from '@/types';
import { fetchEventById } from '@/services/events';
import { coreMergeIds, coreSignTicket } from '@/lib/rust-core';
export { coreFinancialFees, coreStock } from '@/lib/rust-core';

export const LOCAL_TICKETS_KEY = 'gba_user_tickets';

export function getLocalTicketsKey(userId?: string | null): string {
  if (userId && !userId.startsWith('guest-')) {
    return `gba_user_tickets_${userId}`;
  }
  return 'gba_user_tickets_guest';
}

export function clearLocalUserTickets(userId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LOCAL_TICKETS_KEY);
    localStorage.removeItem('gba_user_tickets_guest');
    if (userId) {
      localStorage.removeItem(getLocalTicketsKey(userId));
    }
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('gba_user_tickets') || k.startsWith('gba_tickets_digest_'))) {
        localStorage.removeItem(k);
      }
    }
  } catch {
    // Ignore
  }
}

export function generateFallbackTicketOptions(eventId: string, priceMin: number = 0): TicketOption[] {
  // Hors-ligne uniquement : un seul pass, stock stable (jamais aléatoire).
  // Un stock tiré au hasard faisait « sauter » les places restantes à chaque rechargement.
  const isFree = !priceMin || priceMin <= 0;
  return [
    {
      id: `fallback-opt-std-${eventId}`,
      event_id: eventId,
      ticket_type: (isFree ? 'free' : 'standard') as TicketType,
      label: isFree ? 'Accès Libre (Gratuit)' : 'Billet Standard',
      price: isFree ? 0 : priceMin,
      quantity_total: isFree ? 500 : 250,
      quantity_sold: 0,
      description: isFree ? 'Entrée 100% libre et gratuite' : "Accès standard à l'événement",
      created_at: new Date().toISOString(),
    },
  ];
}

export async function fetchTicketOptions(eventId: string, priceMin: number = 0): Promise<TicketOption[]> {
  if (!eventId) return [];

  // Catalogue démo seulement si Supabase n'est pas branché.
  // En production, inventer des pass VIP factices permettait de payer un billet inexistant.
  if (!isSupabaseConfigured) {
    return generateFallbackTicketOptions(eventId, priceMin);
  }

  try {
    const { data, error } = await supabase
      .from('ticket_options')
      .select('*')
      .eq('event_id', eventId)
      .order('price', { ascending: true });

    if (error || !data) return [];
    return data as TicketOption[];
  } catch {
    return [];
  }
}

export async function createTicketOption(
  option: Omit<TicketOption, 'id' | 'created_at' | 'quantity_sold'>
): Promise<TicketOption | null> {
  const { data, error } = await supabase
    .from('ticket_options')
    .insert(option)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as TicketOption | null;
}

export function getLocalStoredTickets(userId?: string | null): Ticket[] {
  try {
    const key = getLocalTicketsKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (userId) {
      return parsed.filter((t) => t && (t.user_id === userId || t.buyer_user_id === userId));
    }
    return parsed;
  } catch {
    return [];
  }
}

export function saveLocalStoredTicket(ticket: Ticket, userId?: string | null) {
  try {
    const targetUserId = userId || ticket.user_id || ticket.buyer_user_id || null;
    const key = getLocalTicketsKey(targetUserId);
    const current = getLocalStoredTickets(targetUserId);
    const updated = [ticket, ...current.filter((t) => t.id !== ticket.id)];
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
}

export function removeLocalStoredTicket(ticketId: string, userId?: string | null) {
  try {
    const key = getLocalTicketsKey(userId);
    const current = getLocalStoredTickets(userId);
    const updated = current.filter((t) => t.id !== ticketId);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {
    // Ignore
  }
}

export interface TicketRecipientInput {
  recipient_name: string;
  recipient_phone?: string;
  recipient_user_id?: string;
  is_for_me: boolean;
}

/**
 * Annulation directe de billet (rétrocompatibilité)
 */
export async function cancelTicket(ticketId: string, userId?: string): Promise<{ success: boolean; error?: string }> {
  removeLocalStoredTicket(ticketId, userId);
  if (isSupabaseConfigured && !ticketId.startsWith('tkt_')) {
    try {
      await supabase.from('tickets').update({ status: 'cancelled' }).eq('id', ticketId);
    } catch {
      // Ignorer
    }
  }
  return { success: true };
}

/**
 * Réservation simple de billet (rétrocompatibilité pour tests ou appels directs)
 */
export async function bookTicket(
  eventId: string,
  ticketOptionId: string,
  quantity: number = 1,
  buyerInfo?: { name?: string; email?: string; phone?: string }
): Promise<{ success: boolean; ticket?: Partial<Ticket>; error?: string }> {
  const recipients: TicketRecipientInput[] = Array.from({ length: quantity }, (_, i) => ({
    recipient_name: buyerInfo?.name || (i === 0 ? 'Moi-même' : `Ami #${i + 1}`),
    recipient_phone: buyerInfo?.phone || '',
    is_for_me: i === 0,
  }));

  const res = await purchaseTicketsMulti({
    eventId,
    ticketOptionId,
    recipients,
    paymentProvider: 'tmoney',
    paymentPhone: buyerInfo?.phone || '90000000',
    userId: 'guest-' + Date.now(),
  });

  if (res.success && res.tickets && res.tickets[0]) {
    return {
      success: true,
      ticket: {
        id: res.tickets[0].ticket_id,
        event_id: eventId,
        qr_code: res.tickets[0].qr_code,
        price_paid: (res.amount_xof || 0) / quantity,
        status: 'pending',
      },
    };
  }

  return { success: false, error: res.error || 'Erreur réservation' };
}

function isMissingRpcError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const anyErr = err as { code?: string; message?: string; details?: string };
  if (anyErr.code === 'PGRST202' || anyErr.code === '42883') return true;
  const msg = ((anyErr.message || '') + ' ' + (anyErr.details || '')).toLowerCase();
  return msg.includes('schema cache') || msg.includes('could not find the function');
}

/**
 * Achat multi-billets (pour soi ou pour des amis)
 * Appelle la RPC purchase_tickets_multi
 */
export async function purchaseTicketsMulti(params: {
  eventId: string;
  ticketOptionId: string;
  recipients: TicketRecipientInput[];
  paymentProvider: PaymentProvider;
  paymentPhone: string;
  userId: string;
  buyerName?: string;
  /** Prix unitaire réel du pass. */
  unitPrice?: number;
}): Promise<{
  success: boolean;
  payment_id?: string;
  amount_xof?: number;
  tickets?: Array<{
    ticket_id: string;
    qr_code: string;
    is_for_me: boolean;
    recipient_name?: string;
    claim_token?: string;
  }>;
  error?: string;
}> {
  const { eventId, ticketOptionId, recipients, paymentProvider, paymentPhone, userId, buyerName } = params;
  const unitPrice = Math.max(0, Number(params.unitPrice) || 0);
  const amountXof = unitPrice * Math.max(1, recipients.length);

  // Tentative via la RPC Supabase si configuré et utilisateur connecté
  if (isSupabaseConfigured && userId && !userId.startsWith('guest-')) {
    try {
      const { data, error } = await supabase.rpc('purchase_tickets_multi', {
        p_event_id: eventId,
        p_ticket_option_id: ticketOptionId,
        p_recipients: recipients,
        p_payment_provider: paymentProvider,
        p_payment_phone: paymentPhone,
      });

      if (error) {
        if (!isMissingRpcError(error)) {
          return { success: false, error: error.message || 'Le paiement n’a pas pu être confirmé.' };
        }
        // Fonction RPC absente du schéma Supabase : bascule propre vers la création locale
      } else if (data) {
        const result = data as {
          success?: boolean;
          payment_id?: string;
          amount_xof?: number;
          tickets?: Array<{
            ticket_id: string;
            qr_code: string;
            is_for_me: boolean;
            recipient_name?: string;
            claim_token?: string;
          }>;
          error?: string;
        };

        if (result.success && result.tickets && result.tickets.length > 0) {
          const event = await fetchEventById(eventId);
          const paidEach = (result.amount_xof ?? amountXof) / result.tickets.length;
          for (let i = 0; i < result.tickets.length; i++) {
            const item = result.tickets[i];
            const recipientInput = recipients[i] || recipients[0];
            const targetUserId = item.is_for_me ? userId : (recipientInput?.recipient_user_id || '');
            const loc: Ticket = {
              id: item.ticket_id,
              event_id: eventId,
              user_id: targetUserId,
              buyer_user_id: userId,
              buyer_name: buyerName || 'Un ami',
              is_for_me: item.is_for_me,
              payment_id: result.payment_id,
              ticket_type: 'standard',
              ticket_option_id: ticketOptionId,
              price_paid: paidEach,
              currency: 'XOF',
              qr_code: item.qr_code,
              status: 'pending',
              quantity: 1,
              recipient_name: item.recipient_name || recipientInput?.recipient_name,
              recipient_phone: recipientInput?.recipient_phone,
              claim_token: item.claim_token,
              is_claimed: item.is_for_me,
              seat_info: null,
              created_at: new Date().toISOString(),
              event: event || undefined,
            };
            saveLocalStoredTicket(loc, userId);
            if (!item.is_for_me && recipientInput?.recipient_user_id) {
              saveLocalStoredTicket(loc, recipientInput.recipient_user_id);
            }
            if (!item.is_for_me) {
              saveGiftTicketForFriend(loc);
            }
          }
          return {
            success: true,
            payment_id: result.payment_id,
            amount_xof: result.amount_xof ?? amountXof,
            tickets: result.tickets,
          };
        }

        if (result.error) {
          return {
            success: false,
            error: result.error || 'Réservation refusée. Aucun billet n’a été créé.',
          };
        }
      }
    } catch (err: unknown) {
      if (!isMissingRpcError(err)) {
        return { success: false, error: err instanceof Error ? err.message : 'Erreur lors de la réservation' };
      }
    }
  }

  // Démo hors-ligne : prix réel, et un pass payant reste « en attente » tant qu'il n'y a pas de caisse.
  const event = await fetchEventById(eventId);
  const fakePaymentId = 'pay_' + Math.random().toString(36).slice(2, 10);
  const createdList = [];

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    const tId = 'tkt_' + Math.random().toString(36).slice(2, 11);
    const signed = await coreSignTicket(tId, eventId, 'standard', Date.now());
    const qr = signed.qr_payload;
    const token = r.is_for_me ? undefined : Math.random().toString(36).slice(2, 16);

    const targetUserId = r.is_for_me ? userId : (r.recipient_user_id || '');
    const ticket: Ticket = {
      id: tId,
      event_id: eventId,
      user_id: targetUserId,
      buyer_user_id: userId,
      buyer_name: buyerName || 'Un ami',
      is_for_me: r.is_for_me,
      payment_id: fakePaymentId,
      ticket_type: 'standard',
      ticket_option_id: ticketOptionId,
      price_paid: unitPrice,
      currency: 'XOF',
      qr_code: qr,
      status: unitPrice === 0 ? 'valid' : 'pending',
      quantity: 1,
      recipient_name: r.recipient_name,
      recipient_phone: r.recipient_phone,
      claim_token: token,
      is_claimed: r.is_for_me,
      seat_info: null,
      created_at: new Date().toISOString(),
      event: event || undefined,
    };
    saveLocalStoredTicket(ticket, userId);
    if (!r.is_for_me && r.recipient_user_id) {
      saveLocalStoredTicket(ticket, r.recipient_user_id);
    }
    if (!r.is_for_me) {
      saveGiftTicketForFriend(ticket);
    }

    createdList.push({
      ticket_id: tId,
      qr_code: qr,
      is_for_me: r.is_for_me,
      recipient_name: r.recipient_name,
      claim_token: token,
    });
  }

  return {
    success: true,
    payment_id: fakePaymentId,
    amount_xof: amountXof,
    tickets: createdList,
  };
}

/**
 * Enregistre un billet offert dans un registre partagé afin que l'ami puisse le voir
 */
export function saveGiftTicketForFriend(ticket: Ticket) {
  try {
    const raw = localStorage.getItem('gba_gift_registry') || '[]';
    const list = JSON.parse(raw);
    const updated = [ticket, ...list.filter((t: Ticket) => t.id !== ticket.id)];
    localStorage.setItem('gba_gift_registry', JSON.stringify(updated));
  } catch {
    // ignore
  }
}

/**
 * Récupère les billets offerts destinés à un ami (par numéro de téléphone ou nom)
 */
export function getGiftTicketsForFriend(phone?: string | null, name?: string | null): Ticket[] {
  try {
    if (!phone && !name) return [];
    const raw = localStorage.getItem('gba_gift_registry') || '[]';
    const list: Ticket[] = JSON.parse(raw);
    return list.filter((t) => {
      const matchPhone = phone && t.recipient_phone && (
        t.recipient_phone.replace(/\s+/g, '') === phone.replace(/\s+/g, '')
      );
      const matchName = name && t.recipient_name && (
        t.recipient_name.trim().toLowerCase() === name.trim().toLowerCase()
      );
      return matchPhone || matchName;
    });
  } catch {
    return [];
  }
}

/**
 * Réclamation de billet via un token offert
 */
export async function claimTicketByToken(rawToken: string): Promise<{ success: boolean; message?: string; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('claim_ticket_by_token', {
        p_raw_claim_token: rawToken,
      });
      if (error && !isMissingRpcError(error)) return { success: false, error: error.message };
      if (data) return data as { success: boolean; message?: string; error?: string };
    } catch (err: unknown) {
      if (!isMissingRpcError(err)) {
        return { success: false, error: err instanceof Error ? err.message : 'Erreur lors de la réclamation' };
      }
    }
  }
  return { success: true, message: 'Billet réclamé avec succès (mode local) !' };
}

/**
 * Régénération d'un lien de réclamation pour un ami
 */
export async function regenerateClaimLink(ticketId: string): Promise<{ success: boolean; claim_token?: string; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('regenerate_claim_link', {
        p_ticket_id: ticketId,
      });
      if (error && !isMissingRpcError(error)) return { success: false, error: error.message };
      if (data) return data as { success: boolean; claim_token?: string; error?: string };
    } catch (err: unknown) {
      if (!isMissingRpcError(err)) {
        return { success: false, error: err instanceof Error ? err.message : 'Erreur' };
      }
    }
  }
  return { success: true, claim_token: Math.random().toString(36).slice(2, 16) };
}

/**
 * Demande de remboursement
 */
export async function requestTicketRefund(params: {
  ticketId: string;
  reasonDetails?: string;
  refundPhone?: string;
  paymentProvider?: PaymentProvider;
}): Promise<{ success: boolean; refund_id?: string; amount_xof?: number; message?: string; error?: string }> {
  const { ticketId, reasonDetails = '', refundPhone, paymentProvider } = params;

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('request_ticket_refund', {
        p_ticket_id: ticketId,
        p_reason_details: reasonDetails,
        p_custom_refund_phone: refundPhone || null,
        p_custom_payment_provider: paymentProvider || null,
      });
      if (error && !isMissingRpcError(error)) return { success: false, error: error.message };
      if (data) return data as { success: boolean; refund_id?: string; amount_xof?: number; message?: string; error?: string };
    } catch (err: unknown) {
      if (!isMissingRpcError(err)) {
        return { success: false, error: err instanceof Error ? err.message : 'Erreur lors de la demande' };
      }
    }
  }

  // Local fallback
  return { success: true, message: 'Demande de remboursement soumise avec succès (mode local).' };
}

/**
 * Validation du mini-défi de présence fun
 */
export async function completePresenceChallenge(params: {
  ticketId: string;
  submittedPattern: string;
}): Promise<{ success: boolean; attempts_left?: number; message?: string; error?: string; badge_name?: string }> {
  const { ticketId, submittedPattern } = params;

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('complete_presence_challenge', {
        p_ticket_id: ticketId,
        p_submitted_pattern: submittedPattern,
      });
      if (error && !isMissingRpcError(error)) return { success: false, error: error.message };
      if (data) return data as { success: boolean; attempts_left?: number; message?: string; error?: string; badge_name?: string };
    } catch (err: unknown) {
      if (!isMissingRpcError(err)) {
        return { success: false, error: err instanceof Error ? err.message : 'Erreur de communication avec le serveur' };
      }
    }
  }

  // Local fallback simulation
  return { success: true, badge_name: 'Pionnier du Live', message: 'Bravo ! Défi validé en mode local.' };
}

/**
 * Examen d'une demande de remboursement par l'organisateur (Approuver / Rejeter)
 */
export async function reviewRefund(params: {
  refundId: string;
  action: 'approve' | 'reject';
  rejectionReason?: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  const { refundId, action, rejectionReason } = params;

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('review_refund', {
        p_refund_id: refundId,
        p_action: action,
        p_rejection_reason: rejectionReason || null,
      });
      if (error && !isMissingRpcError(error)) return { success: false, error: error.message };
      if (data) return data as { success: boolean; message?: string; error?: string };
    } catch (err: unknown) {
      if (!isMissingRpcError(err)) {
        return { success: false, error: err instanceof Error ? err.message : 'Erreur lors de la revue' };
      }
    }
  }

  return { success: true, message: `Demande ${action === 'approve' ? 'approuvée' : 'refusée'} (mode local)` };
}

/**
 * Récupération de l'ensemble des billets d'un utilisateur (détenus + achetés pour des tiers + reçus en cadeau)
 */
export async function fetchUserTickets(userId: string, userPhone?: string | null, userName?: string | null): Promise<Ticket[]> {
  const localTickets = getLocalStoredTickets(userId);
  const friendGifts = getGiftTicketsForFriend(userPhone, userName);
  let dbTickets: Ticket[] = [];

  if (isSupabaseConfigured && userId && !userId.startsWith('guest-')) {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*, event:events(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        dbTickets = data as Ticket[];
      }
    } catch {
      // Ignore
    }
  }

  const seen = new Set<string>();
  const merged: Ticket[] = [];
  const pool = new Map<string, Ticket>();
  for (const ticket of [...dbTickets, ...localTickets, ...friendGifts]) {
    if (ticket?.id && !pool.has(ticket.id)) pool.set(ticket.id, ticket);
  }
  // Le serveur passe devant le cache. Rust retire les doublons d'id.
  const order = await coreMergeIds(
    dbTickets.map((ticket) => ticket.id),
    [...localTickets, ...friendGifts].map((ticket) => ticket.id),
    []
  );
  const ordered = order && order.length > 0 ? order : [...pool.keys()];
  for (const id of ordered) {
    const ticket = pool.get(id);
    if (!ticket || seen.has(id)) continue;
    seen.add(id);
    merged.push(ticket);
  }

  if (isSupabaseConfigured) {
    const missingIds = Array.from(
      new Set(merged.filter((t) => !t.event && t.event_id).map((t) => t.event_id))
    ).slice(0, 40);
    if (missingIds.length > 0) {
      try {
        const { data: events } = await supabase.from('events').select('*').in('id', missingIds);
        if (events && events.length > 0) {
          const byId = new Map(events.map((eventRow) => [eventRow.id as string, eventRow as Event]));
          for (const t of merged) {
            if (!t.event && t.event_id && byId.has(t.event_id)) {
              t.event = byId.get(t.event_id);
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }

  return merged;
}

export async function setEventStatus(
  eventId: string,
  status: Exclude<EventStatus, 'pending'>,
  reason?: string
): Promise<void> {
  const { data, error } = await supabase.rpc('set_event_status', {
    p_event_id: eventId,
    p_status: status,
    p_reason: reason || null,
  });
  if (error) throw error;
  const result = data as { success?: boolean; error?: string };
  if (!result.success) throw new Error(result.error || 'Transition de statut impossible');
}

export async function validateTicketQr(
  qrCode: string,
  eventId: string
): Promise<{ success: boolean; error?: string; message?: string; ticket?: unknown; participant_name?: string }> {
  const { data, error } = await supabase.rpc('validate_ticket_qr', {
    p_qr_code: qrCode,
    p_event_id: eventId,
  });
  if (error) throw error;
  return data as { success: boolean; error?: string; message?: string; ticket?: unknown; participant_name?: string };
}
