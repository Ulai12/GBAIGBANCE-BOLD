/**
 * Appels RPC billets avec gestion d'erreurs unifiee.
 */
import { supabase } from '@/services/supabase';
import {
  handleRpcResult,
  isMissingRpcError,
  type RpcNormalizedError,
} from '@/lib/rpcErrors';
import type { PaymentProvider } from '@/types';
import type { TicketRecipientInput } from './service';

export type { RpcNormalizedError };
export { isMissingRpcError };

export async function rpcInitiateTicketPayment(params: {
  eventId: string;
  ticketOptionId: string;
  quantity: number;
  provider: string;
  paymentPhone?: string | null;
  idempotencyKey?: string | null;
  feePayer?: string | null;
}): Promise<
  | {
      success: true;
      payment_id: string;
      amount_charged_xof?: number;
      amount_face_xof?: number;
      platform_fee_xof?: number;
      message?: string;
    }
  | RpcNormalizedError
> {
  try {
    const { data, error } = await supabase.rpc('initiate_ticket_payment', {
      p_event_id: params.eventId,
      p_ticket_option_id: params.ticketOptionId,
      p_quantity: params.quantity,
      p_provider: params.provider,
      p_payment_phone: params.paymentPhone ?? null,
      p_idempotency_key: params.idempotencyKey ?? null,
      p_fee_payer: params.feePayer ?? null,
    });

    const parsed = handleRpcResult(error, data, 'Impossible d’initier le paiement.');
    if ('ok' in parsed && parsed.ok) {
      const paymentId = typeof parsed.data.payment_id === 'string' ? parsed.data.payment_id : '';
      if (!paymentId) {
        return {
          success: false,
          error: 'Le serveur n’a pas renvoyé d’identifiant de paiement.',
          kind: 'unknown',
          retryable: true,
        };
      }
      // UX billets: initiation != emission
      return {
        success: false,
        error:
          'Paiement initié. Confirmez sur Mobile Money — les billets seront émis uniquement après confirmation serveur.',
        code: 'PAYMENT_PENDING',
        kind: 'payment_pending',
        retryable: false,
        payment_id: paymentId,
        amount_xof:
          typeof parsed.data.amount_charged_xof === 'number'
            ? parsed.data.amount_charged_xof
            : typeof parsed.data.amount_face_xof === 'number'
              ? parsed.data.amount_face_xof
              : undefined,
      };
    }
    return parsed;
  } catch (err) {
    return handleRpcResult(err, null, 'Erreur lors de l’initiation du paiement.') as RpcNormalizedError;
  }
}

export async function rpcPurchaseTicketsMulti(params: {
  eventId: string;
  ticketOptionId: string;
  recipients: TicketRecipientInput[];
  paymentPhone?: string | null;
  buyerName?: string | null;
}): Promise<
  | {
      success: true;
      amount_xof: number;
      tickets: Array<{
        ticket_id: string;
        qr_code: string;
        is_for_me: boolean;
        recipient_name?: string;
        claim_token?: string;
      }>;
    }
  | RpcNormalizedError
> {
  try {
    const { data, error } = await supabase.rpc('purchase_tickets_multi', {
      p_event_id: params.eventId,
      p_ticket_option_id: params.ticketOptionId,
      p_recipients: params.recipients.map((r) => ({
        recipient_name: r.recipient_name,
        recipient_phone: r.recipient_phone || null,
        recipient_user_id: r.recipient_user_id || null,
        is_for_me: Boolean(r.is_for_me),
      })),
      p_payment_provider: 'free',
      p_payment_phone: params.paymentPhone ?? null,
      p_buyer_name: params.buyerName ?? null,
    });

    const parsed = handleRpcResult(error, data, 'La réservation n’a pas pu être enregistrée.');
    if ('ok' in parsed && parsed.ok) {
      const tickets = Array.isArray(parsed.data.tickets) ? parsed.data.tickets : [];
      if (!tickets.length) {
        return {
          success: false,
          error: 'Le serveur n’a pas confirmé la création des billets.',
          kind: 'unknown',
          retryable: true,
        };
      }
      return {
        success: true,
        amount_xof: Number(parsed.data.amount_xof) || 0,
        tickets: tickets as Array<{
          ticket_id: string;
          qr_code: string;
          is_for_me: boolean;
          recipient_name?: string;
          claim_token?: string;
        }>,
      };
    }
    return parsed;
  } catch (err) {
    return handleRpcResult(err, null, 'Erreur lors de la réservation serveur.') as RpcNormalizedError;
  }
}

export async function rpcClaimTicketByToken(rawToken: string) {
  try {
    const { data, error } = await supabase.rpc('claim_ticket_by_token', {
      p_raw_claim_token: rawToken,
    });
    if (error && isMissingRpcError(error)) {
      return { success: true as const, message: 'Billet réclamé avec succès (mode local) !' };
    }
    const parsed = handleRpcResult(error, data, 'Erreur lors de la réclamation');
    if ('ok' in parsed && parsed.ok) {
      return {
        success: true as const,
        message: typeof parsed.data.message === 'string' ? parsed.data.message : 'Billet réclamé.',
        ticket_id: typeof parsed.data.ticket_id === 'string' ? parsed.data.ticket_id : undefined,
      };
    }
    return parsed;
  } catch (err) {
    if (isMissingRpcError(err)) {
      return { success: true as const, message: 'Billet réclamé avec succès (mode local) !' };
    }
    return handleRpcResult(err, null, 'Erreur lors de la réclamation') as RpcNormalizedError;
  }
}

export async function rpcRegenerateClaimLink(ticketId: string) {
  try {
    const { data, error } = await supabase.rpc('regenerate_claim_link', {
      p_ticket_id: ticketId,
    });
    if (error && isMissingRpcError(error)) {
      return { success: true as const, claim_token: Math.random().toString(36).slice(2, 16) };
    }
    const parsed = handleRpcResult(error, data, 'Impossible de régénérer le lien');
    if ('ok' in parsed && parsed.ok) {
      return {
        success: true as const,
        claim_token: typeof parsed.data.claim_token === 'string' ? parsed.data.claim_token : undefined,
      };
    }
    return parsed;
  } catch (err) {
    if (isMissingRpcError(err)) {
      return { success: true as const, claim_token: Math.random().toString(36).slice(2, 16) };
    }
    return handleRpcResult(err, null, 'Impossible de régénérer le lien') as RpcNormalizedError;
  }
}

export async function rpcRequestTicketRefund(params: {
  ticketId: string;
  reasonDetails?: string;
  refundPhone?: string;
  paymentProvider?: PaymentProvider;
}) {
  try {
    const { data, error } = await supabase.rpc('request_ticket_refund', {
      p_ticket_id: params.ticketId,
      p_reason_details: params.reasonDetails || '',
      p_custom_refund_phone: params.refundPhone || null,
      p_custom_payment_provider: params.paymentProvider || null,
    });
    if (error && isMissingRpcError(error)) {
      return { success: true as const, message: 'Demande de remboursement soumise avec succès (mode local).' };
    }
    const parsed = handleRpcResult(error, data, 'Erreur lors de la demande de remboursement');
    if ('ok' in parsed && parsed.ok) {
      return {
        success: true as const,
        refund_id: typeof parsed.data.refund_id === 'string' ? parsed.data.refund_id : undefined,
        amount_xof: typeof parsed.data.amount_xof === 'number' ? parsed.data.amount_xof : undefined,
        message: typeof parsed.data.message === 'string' ? parsed.data.message : undefined,
      };
    }
    return parsed;
  } catch (err) {
    if (isMissingRpcError(err)) {
      return { success: true as const, message: 'Demande de remboursement soumise avec succès (mode local).' };
    }
    return handleRpcResult(err, null, 'Erreur lors de la demande') as RpcNormalizedError;
  }
}

export async function rpcReviewRefund(params: {
  refundId: string;
  action: 'approve' | 'reject';
  rejectionReason?: string;
}) {
  try {
    const { data, error } = await supabase.rpc('review_refund', {
      p_refund_id: params.refundId,
      p_action: params.action,
      p_rejection_reason: params.rejectionReason || null,
    });
    if (error && isMissingRpcError(error)) {
      return {
        success: true as const,
        message: `Demande ${params.action === 'approve' ? 'approuvée' : 'refusée'} (mode local)`,
      };
    }
    const parsed = handleRpcResult(error, data, 'Erreur lors de la revue');
    if ('ok' in parsed && parsed.ok) {
      return {
        success: true as const,
        message: typeof parsed.data.message === 'string' ? parsed.data.message : undefined,
      };
    }
    return parsed;
  } catch (err) {
    if (isMissingRpcError(err)) {
      return {
        success: true as const,
        message: `Demande ${params.action === 'approve' ? 'approuvée' : 'refusée'} (mode local)`,
      };
    }
    return handleRpcResult(err, null, 'Erreur lors de la revue') as RpcNormalizedError;
  }
}

export async function rpcCompletePresenceChallenge(params: {
  ticketId: string;
  submittedPattern: string;
}) {
  try {
    const { data, error } = await supabase.rpc('complete_presence_challenge', {
      p_ticket_id: params.ticketId,
      p_submitted_pattern: params.submittedPattern,
    });
    if (error && isMissingRpcError(error)) {
      return {
        success: true as const,
        badge_name: 'Pionnier du Live',
        message: 'Bravo ! Défi validé en mode local.',
      };
    }
    const parsed = handleRpcResult(error, data, 'Erreur de communication avec le serveur');
    if ('ok' in parsed && parsed.ok) {
      return {
        success: true as const,
        badge_name: typeof parsed.data.badge_name === 'string' ? parsed.data.badge_name : undefined,
        message: typeof parsed.data.message === 'string' ? parsed.data.message : undefined,
        attempts_left: typeof parsed.data.attempts_left === 'number' ? parsed.data.attempts_left : undefined,
      };
    }
    return parsed;
  } catch (err) {
    if (isMissingRpcError(err)) {
      return {
        success: true as const,
        badge_name: 'Pionnier du Live',
        message: 'Bravo ! Défi validé en mode local.',
      };
    }
    return handleRpcResult(err, null, 'Erreur de communication avec le serveur') as RpcNormalizedError;
  }
}
