/**
 * Liaison front ↔ backend pour frais plateforme et initiation de paiement.
 * Les billets payants ne sont emis qu apres confirm_ticket_payment (webhook).
 */
import { isSupabaseConfigured, supabase } from '@/services/supabase';
import type { PaymentProvider } from '@/types';
import { coreFinancialFees, type FinancialFeesResult } from '@/lib/rust-core';
import { handleRpcResult, isRpcPayloadSuccess } from '@/lib/rpcErrors';

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
  code?: string;
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

  const core = await coreFinancialFees(
    unit,
    quantity,
    method === 'free' ? 'free' : method === 'card' ? 'card' : 'mobile_money'
  );
  return fromCore(core, quantity, feePayer);
}

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
    return { success: false, error: 'Supabase non configuré', code: 'NETWORK' };
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

    const parsed = handleRpcResult(error, data, 'Impossible d’initier le paiement.');
    if (isRpcPayloadSuccess(parsed)) {
      const feesRaw = parsed.data.fees;
      return {
        success: true,
        payment_id: typeof parsed.data.payment_id === 'string' ? parsed.data.payment_id : undefined,
        status: typeof parsed.data.status === 'string' ? parsed.data.status : undefined,
        provider: typeof parsed.data.provider === 'string' ? parsed.data.provider : undefined,
        amount_face_xof:
          typeof parsed.data.amount_face_xof === 'number' ? parsed.data.amount_face_xof : undefined,
        platform_fee_xof:
          typeof parsed.data.platform_fee_xof === 'number' ? parsed.data.platform_fee_xof : undefined,
        amount_charged_xof:
          typeof parsed.data.amount_charged_xof === 'number'
            ? parsed.data.amount_charged_xof
            : undefined,
        organizer_payout_xof:
          typeof parsed.data.organizer_payout_xof === 'number'
            ? parsed.data.organizer_payout_xof
            : undefined,
        fee_payer: typeof parsed.data.fee_payer === 'string' ? parsed.data.fee_payer : undefined,
        currency: typeof parsed.data.currency === 'string' ? parsed.data.currency : 'XOF',
        quantity: typeof parsed.data.quantity === 'number' ? parsed.data.quantity : quantity,
        message: typeof parsed.data.message === 'string' ? parsed.data.message : undefined,
        idempotent: parsed.data.idempotent === true,
        fees:
          feesRaw && typeof feesRaw === 'object'
            ? mapFees(feesRaw as Record<string, unknown>, 'rpc')
            : undefined,
      };
    }

    return {
      success: false,
      error: parsed.error,
      code: parsed.code,
      payment_id: parsed.payment_id,
    };
  } catch (err: unknown) {
    const parsed = handleRpcResult(err, null, 'Erreur initiation paiement');
    if (isRpcPayloadSuccess(parsed)) {
      return { success: false, error: 'Erreur initiation paiement' };
    }
    return { success: false, error: parsed.error, code: parsed.code };
  }
}

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
): Promise<{ success: boolean; error?: string; code?: string }> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase non configuré', code: 'NETWORK' };
  try {
    const { error } = await supabase.from('ticket_options').update(patch).eq('id', optionId);
    if (error) {
      const parsed = handleRpcResult(error, null, 'Erreur mise à jour de l’option');
      if (isRpcPayloadSuccess(parsed)) return { success: false, error: 'Erreur mise à jour de l’option' };
      return { success: false, error: parsed.error, code: parsed.code };
    }
    return { success: true };
  } catch (err: unknown) {
    const parsed = handleRpcResult(err, null, 'Erreur maj option');
    if (isRpcPayloadSuccess(parsed)) return { success: false, error: 'Erreur maj option' };
    return { success: false, error: parsed.error, code: parsed.code };
  }
}
