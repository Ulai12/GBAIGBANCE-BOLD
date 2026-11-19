import { isSupabaseConfigured, supabase } from '@/services/supabase';
import type {
  Ticket,
  TicketOption,
  TicketType,
  PaymentProvider,
  EventStatus,
} from '@/types';
import { fetchEventById } from '@/services/events';
import { coreMergeIds, coreSignTicket } from '@/lib/rust-core';
export { coreFinancialFees, coreStock } from '@/lib/rust-core';
import {
  rpcClaimTicketByToken,
  rpcCompletePresenceChallenge,
  rpcInitiateTicketPayment,
  rpcPurchaseTicketsMulti,
  rpcRegenerateClaimLink,
  rpcRequestTicketRefund,
  rpcReviewRefund,
} from './rpc';

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

/**
 * Gratuit → purchase_tickets_multi.
 * Payant → initiate_ticket_payment (billets apres webhook).
 * Erreurs normalisees via src/lib/rpcErrors.ts
 */
export async function purchaseTicketsMulti(params: {
  eventId: string;
  ticketOptionId: string;
  recipients: TicketRecipientInput[];
  paymentProvider: PaymentProvider;
  paymentPhone: string;
  userId: string;
  buyerName?: string;
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
  code?: string;
}> {
  const { eventId, ticketOptionId, recipients, userId, buyerName, paymentProvider, paymentPhone } = params;
  const unitPrice = Math.max(0, Number(params.unitPrice) || 0);
  const amountXof = unitPrice * Math.max(1, recipients.length);

  if (isSupabaseConfigured) {
    if (!userId || userId.startsWith('guest-')) {
      return { success: false, error: 'Connectez-vous pour réserver un billet.', code: 'AUTH_REQUIRED' };
    }

    if (unitPrice > 0) {
      const res = await rpcInitiateTicketPayment({
        eventId,
        ticketOptionId,
        quantity: Math.max(1, recipients.length),
        provider: paymentProvider || 'pending',
        paymentPhone,
      });
      if (res.success) {
        return {
          success: false,
          payment_id: res.payment_id,
          amount_xof: res.amount_charged_xof ?? res.amount_face_xof ?? amountXof,
          tickets: [],
          error: 'Paiement initié. Confirmez sur Mobile Money ; les billets seront émis après confirmation serveur.',
          code: 'PAYMENT_PENDING',
        };
      }
      return {
        success: false,
        payment_id: res.payment_id,
        amount_xof: res.amount_xof ?? amountXof,
        tickets: [],
        error: res.error,
        code: res.code,
      };
    }

    const res = await rpcPurchaseTicketsMulti({
      eventId,
      ticketOptionId,
      recipients,
      paymentPhone,
      buyerName,
    });
    if (res.success) {
      return {
        success: true,
        amount_xof: res.amount_xof,
        tickets: res.tickets,
      };
    }
    return {
      success: false,
      error: res.error,
      code: res.code,
    };
  }

  if (unitPrice > 0) {
    return {
      success: false,
      error:
        'Les achats payants nécessitent une connexion au service de paiement. Aucun billet en attente fictif n’a été créé.',
      code: 'NETWORK',
    };
  }

  const event = await fetchEventById(eventId);
  const fakePaymentId = 'pay_' + Math.random().toString(36).slice(2, 10);
  const createdList = [];

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    const tId = 'tkt_' + Math.random().toString(36).slice(2, 11);
    const signed = await coreSignTicket(tId, eventId, 'standard', Date.now());
    const qr = signed.qr_payload;
    const token = r.is_for_me ? undefined : Math.random().toString(36).slice(2, 16);

    const targetUserId = r.is_for_me ? userId : r.recipient_user_id || '';
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

export function getGiftTicketsForFriend(phone?: string | null, name?: string | null): Ticket[] {
  try {
    if (!phone && !name) return [];
    const raw = localStorage.getItem('gba_gift_registry') || '[]';
    const list: Ticket[] = JSON.parse(raw);
    return list.filter((t) => {
      const matchPhone =
        phone &&
        t.recipient_phone &&
        t.recipient_phone.replace(/\s+/g, '') === phone.replace(/\s+/g, '');
      const matchName =
        name &&
        t.recipient_name &&
        t.recipient_name.trim().toLowerCase() === name.trim().toLowerCase();
      return matchPhone || matchName;
    });
  } catch {
    return [];
  }
}

export async function claimTicketByToken(
  rawToken: string
): Promise<{ success: boolean; message?: string; error?: string; code?: string }> {
  if (isSupabaseConfigured) {
    const res = await rpcClaimTicketByToken(rawToken);
    if (res.success) return { success: true, message: res.message };
    return { success: false, error: res.error, code: res.code };
  }
  return { success: true, message: 'Billet réclamé avec succès (mode local) !' };
}

export async function regenerateClaimLink(
  ticketId: string
): Promise<{ success: boolean; claim_token?: string; error?: string; code?: string }> {
  if (isSupabaseConfigured) {
    const res = await rpcRegenerateClaimLink(ticketId);
    if (res.success) return { success: true, claim_token: res.claim_token };
    return { success: false, error: res.error, code: res.code };
  }
  return { success: true, claim_token: Math.random().toString(36).slice(2, 16) };
}

export async function requestTicketRefund(params: {
  ticketId: string;
  reasonDetails?: string;
  refundPhone?: string;
  paymentProvider?: PaymentProvider;
}): Promise<{
  success: boolean;
  refund_id?: string;
  amount_xof?: number;
  message?: string;
  error?: string;
  code?: string;
}> {
  if (isSupabaseConfigured) {
    const res = await rpcRequestTicketRefund(params);
    if (res.success) {
      return {
        success: true,
        refund_id: res.refund_id,
        amount_xof: res.amount_xof,
        message: res.message,
      };
    }
    return { success: false, error: res.error, code: res.code };
  }
  return { success: true, message: 'Demande de remboursement soumise avec succès (mode local).' };
}

export async function completePresenceChallenge(params: {
  ticketId: string;
  submittedPattern: string;
}): Promise<{
  success: boolean;
  attempts_left?: number;
  message?: string;
  error?: string;
  badge_name?: string;
  code?: string;
}> {
  if (isSupabaseConfigured) {
    const res = await rpcCompletePresenceChallenge(params);
    if (res.success) {
      return {
        success: true,
        badge_name: res.badge_name,
        message: res.message,
        attempts_left: res.attempts_left,
      };
    }
    return { success: false, error: res.error, code: res.code };
  }
  return { success: true, badge_name: 'Pionnier du Live', message: 'Bravo ! Défi validé en mode local.' };
}

export async function reviewRefund(params: {
  refundId: string;
  action: 'approve' | 'reject';
  rejectionReason?: string;
}): Promise<{ success: boolean; message?: string; error?: string; code?: string }> {
  if (isSupabaseConfigured) {
    const res = await rpcReviewRefund(params);
    if (res.success) return { success: true, message: res.message };
    return { success: false, error: res.error, code: res.code };
  }
  return {
    success: true,
    message: `Demande ${params.action === 'approve' ? 'approuvée' : 'refusée'} (mode local)`,
  };
}

export async function fetchUserTickets(
  userId: string,
  userPhone?: string | null,
  userName?: string | null
): Promise<Ticket[]> {
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

  const pool = new Map<string, Ticket>();
  for (const ticket of [...dbTickets, ...localTickets, ...friendGifts]) {
    if (ticket?.id && !pool.has(ticket.id)) pool.set(ticket.id, ticket);
  }
  const order = (await coreMergeIds(
    dbTickets.map((ticket) => ticket.id),
    [...localTickets, ...friendGifts].map((ticket) => ticket.id),
    []
  )) ?? Array.from(pool.keys());
  const merged: Ticket[] = [];
  for (const id of order) {
    const t = pool.get(id);
    if (t) merged.push(t);
  }
  return merged;
}


/** Met à jour le cycle de vie d'un événement via la RPC autorisée côté serveur. */
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
  const result = data as { success?: boolean; error?: string } | null;
  if (!result?.success) {
    throw new Error(result?.error || 'Transition de statut impossible');
  }
}

/** Délègue la validation d'un QR à la fonction serveur; aucun succès local n'est simulé. */
export async function validateTicketQr(
  qrCode: string,
  eventId: string
): Promise<{
  success: boolean;
  error?: string;
  message?: string;
  ticket?: Partial<Ticket>;
  participant_name?: string;
}> {
  const { data, error } = await supabase.rpc('validate_ticket_qr', {
    p_qr_code: qrCode,
    p_event_id: eventId,
  });
  if (error) throw error;
  return data as {
    success: boolean;
    error?: string;
    message?: string;
    ticket?: Partial<Ticket>;
    participant_name?: string;
  };
}
