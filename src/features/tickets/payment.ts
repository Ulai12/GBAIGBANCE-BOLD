/**
 * Liaison front ↔ backend pour frais plateforme et initiation de paiement.
 * Les billets payants ne sont emis qu apres confirm_ticket_payment (webhook).
 */
import { isSupabaseConfigured, supabase } from '@/services/supabase';
import type { PaymentProvider } from '@/types';
import { coreFinancialFees, type FinancialFeesResult } from '@/lib/rust-core';

export interface TicketFeeQuote {
  currency: string;
  quantity: number;
  amount_face_xof: number;
  platform_fee_xof: number;
  operator_fee_xof: number;
  amount_charged_xof: number;
  organizer_payout_xof: number;
  fee_payer: 'buyer' | 'organizer' | string;
  fee_percent_bps: number;
  fixed_fee_xof: number;
  source: 'rpc' | 'core' | 'local';
}

export interface InitiatePaymentResult {
  success: boolean;
  payment_id?: string;
  status?: string;
  provider?: string;
  amount_face_xof?: number;
  platform_fee_xof?: number;
  amount_charged_xof?: number;
  organizer_payout_xof?: number;
  fee_payer?: string;
  currency?: string;
  quantity?: number;
  fees?: TicketFeeQuote;
  message?: string;
  error?: string;
  idempotent?: boolean;
}

function mapFees(raw: Record<string, unknown>, source: TicketFeeQuote['source']): TicketFeeQuote {
  return {
    currency: String(raw.currency || 'XOF'),
    quantity: Number(raw.quantity) || 1,
    amount_face_xof: Number(raw.amount_face_xof) || 0,
    platform_fee_xof: Number(raw.platform_fee_xof) || 0,
    operator_fee_xof: Number(raw.operator_fee_xof) || 0,
    amount_charged_xof: Number(raw.amount_charged_xof) || 0,
    organizer_payout_xof: Number(raw.organizer_payout_xof) || 0,
    fee_payer: String(raw.fee_payer || 'buyer'),
    fee_percent_bps: Number(raw.fee_percent_bps) || 0,
    fixed_fee_xof: Number(raw.fixed_fee_xof) || 0,
    source,
  };
}

function fromCore(res: FinancialFeesResult, quantity: number, feePayer: string): TicketFeeQuote {
  const face = res.total_amount;
  const platform = res.platform_fee;
  const buyerPays = feePayer !== 'organizer';
  return {
    currency: res.currency || 'XOF',
    quantity,
    amount_face_xof: face,
    platform_fee_xof: platform,
    operator_fee_xof: res.operator_fee,
    amount_charged_xof: buyerPays ? face + platform : face,
    organizer_payout_xof: buyerPays ? face : Math.max(0, face - platform),
    fee_payer: feePayer,
    fee_percent_bps: (res.fee_percent || 0) * 100,
    fixed_fee_xof: res.fixed_fee,
    source: 'core',
  };
}

/**
 * Detail des frais pour affichage checkout (RPC serveur prioritaire).
 */
export async function fetchTicketFeeQuote(params: {
  unitPriceXof: number;
  quantity?: number;
  paymentMethod?: 'mobile_money' | 'card' | 'free';
  feePayer?: 'buyer' | 'organizer' | null;
}): Promise<TicketFeeQuote> {
  const quantity = Math.max(1, params.quantity ?? 1);
  const unit = Math.max(0, Math.round(params.unitPriceXof || 0));
  const method = params.paymentMethod || (unit === 0 ? 'free' : 'mobile_money');
  const feePayer = params.feePayer || 'buyer';

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('compute_ticket_fees', {
        p_unit_price_xof: unit,
        p_quantity: quantity,
        p_payment_method: method,
        p_fee_payer: feePayer,
      });
      if (!error && data && typeof data === 'object') {
        return mapFees(data as Record<string, unknown>, 'rpc');
      }
    } catch {
      // fallback core
    }
  }

  const core = await coreFinancialFees(unit, quantity, method === 'free' ? 'free' : method === 'card' ? 'card' : 'mobile_money');
  return fromCore(core, quantity, feePayer);
}

/**
 * Initie un paiement pending. Aucun billet emis.
 * Apres succes Mobile Money, le webhook appelle confirm_ticket_payment.
 */
export async function initiateTicketPayment(params: {
  eventId: string;
  ticketOptionId: string;
  quantity?: number;
  provider: PaymentProvider | string;
  paymentPhone?: string;
  idempotencyKey?: string;
  feePayer?: 'buyer' | 'organizer';
}): Promise<InitiatePaymentResult> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase non configure' };
  }

  const quantity = Math.max(1, Math.min(10, params.quantity ?? 1));
  const provider = String(params.provider || 'pending');

  try {
    const { data, error } = await supabase.rpc('initiate_ticket_payment', {
      p_event_id: params.eventId,
      p_ticket_option_id: params.ticketOptionId,
      p_quantity: quantity,
      p_provider: provider,
      p_payment_phone: params.paymentPhone || null,
      p_idempotency_key: params.idempotencyKey || null,
      p_fee_payer: params.feePayer || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const res = data as InitiatePaymentResult & { fees?: Record<string, unknown> };
    if (!res?.success) {
      return { success: false, error: res?.error || 'Initiation refusee' };
    }

    return {
      ...res,
      fees: res.fees ? mapFees(res.fees as Record<string, unknown>, 'rpc') : undefined,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur initiation paiement',
    };
  }
}

/**
 * Met a jour une option de billet (orga) : prix, stock, fee_payer, fenetre de vente.
 * Respecte le RLS organisateur existant.
 */
export async function updateTicketOptionForOrganizer(
  optionId: string,
  patch: Partial<{
    label: string;
    price: number;
    quantity_total: number;
    description: string | null;
    fee_payer: 'buyer' | 'organizer';
    is_active: boolean;
    sales_start_at: string | null;
    sales_end_at: string | null;
  }>
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase non configure' };
  try {
    const { error } = await supabase.from('ticket_options').update(patch).eq('id', optionId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur maj option' };
  }
}
