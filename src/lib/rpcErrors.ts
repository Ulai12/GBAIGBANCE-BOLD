/**
 * Normalisation des erreurs RPC Supabase / Postgres pour l'UI.
 * - Codes metier renvoyes par les fonctions (jsonb.code)
 * - Codes PostgREST / SQL
 * - Messages FR stables, sans fuite technique inutile
 */

export type RpcErrorKind =
  | 'auth'
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'permission'
  | 'network'
  | 'missing_rpc'
  | 'business'
  | 'payment_pending'
  | 'unknown';

export interface RpcNormalizedError {
  success: false;
  error: string;
  code?: string;
  kind: RpcErrorKind;
  retryable: boolean;
  /** Champs optionnels renvoyes par certaines RPC */
  external_ticket_url?: string | null;
  whatsapp_number?: string | null;
  payment_id?: string;
  amount_xof?: number;
}

const BUSINESS_MESSAGES: Record<string, string> = {
  EXTERNAL_TICKETING: 'La billetterie de cet événement est sur une plateforme externe.',
  WHATSAPP_TICKETING: 'La réservation se fait via WhatsApp pour cet événement.',
  USE_BOOK_TICKET: 'Utilisez la réservation gratuite pour ce billet.',
  USE_INITIATE_PAYMENT: 'Ce billet est payant : le paiement Mobile Money doit être initié.',
  AUTH_REQUIRED: 'Connectez-vous pour continuer.',
  STOCK: 'Stock insuffisant pour cette option.',
  CAPACITY: 'Capacité de l’événement atteinte.',
  PAYMENT_PENDING:
    'Paiement initié. Confirmez sur Mobile Money — les billets seront émis uniquement après confirmation serveur.',
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function str(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return undefined;
}

/** RPC absente du schéma PostgREST / Postgres */
export function isMissingRpcError(err: unknown): boolean {
  const rec = asRecord(err);
  if (!rec) return false;
  const code = str(rec.code) || '';
  if (code === 'PGRST202' || code === '42883') return true;
  const msg = `${str(rec.message) || ''} ${str(rec.details) || ''}`.toLowerCase();
  return msg.includes('schema cache') || msg.includes('could not find the function') || msg.includes('function') && msg.includes('does not exist');
}

/**
 * Mappe une erreur PostgREST / Error JS vers un message FR + kind.
 */
export function normalizeTransportError(err: unknown, fallback: string): RpcNormalizedError {
  if (isMissingRpcError(err)) {
    return {
      success: false,
      error: 'Service temporairement indisponible (fonction serveur manquante). Réessayez plus tard.',
      code: 'MISSING_RPC',
      kind: 'missing_rpc',
      retryable: true,
    };
  }

  const rec = asRecord(err);
  const code = str(rec?.code) || '';
  const message = str(rec?.message) || (err instanceof Error ? err.message : '') || fallback;
  const details = str(rec?.details) || '';
  const hint = str(rec?.hint) || '';
  const blob = `${message} ${details} ${hint}`.toLowerCase();

  // Auth / JWT
  if (
    code === 'PGRST301' ||
    code === '401' ||
    blob.includes('jwt') ||
    blob.includes('not authenticated') ||
    blob.includes('authorization')
  ) {
    return {
      success: false,
      error: 'Session expirée ou absente. Reconnectez-vous.',
      code: code || 'AUTH',
      kind: 'auth',
      retryable: false,
    };
  }

  // Permission RLS / GRANT
  if (code === '42501' || blob.includes('permission denied') || blob.includes('row-level security')) {
    return {
      success: false,
      error: 'Action non autorisée.',
      code: code || 'PERMISSION',
      kind: 'permission',
      retryable: false,
    };
  }

  // Unique / conflit
  if (code === '23505') {
    return {
      success: false,
      error: 'Cette opération a déjà été enregistrée.',
      code: '23505',
      kind: 'conflict',
      retryable: false,
    };
  }

  // Check constraint
  if (code === '23514') {
    return {
      success: false,
      error: 'Données invalides pour cette opération.',
      code: '23514',
      kind: 'validation',
      retryable: false,
    };
  }

  // FK
  if (code === '23503') {
    return {
      success: false,
      error: 'Référence introuvable (événement ou option de billet).',
      code: '23503',
      kind: 'not_found',
      retryable: false,
    };
  }

  // Réseau
  if (
    blob.includes('failed to fetch') ||
    blob.includes('network') ||
    blob.includes('timeout') ||
    blob.includes('offline')
  ) {
    return {
      success: false,
      error: 'Connexion instable. Vérifiez le réseau et réessayez.',
      code: 'NETWORK',
      kind: 'network',
      retryable: true,
    };
  }

  // Message serveur déjà en FR (nos RPC)
  if (message && !message.includes('PGRST') && message.length < 180) {
    return {
      success: false,
      error: message,
      code: code || undefined,
      kind: 'unknown',
      retryable: false,
    };
  }

  return {
    success: false,
    error: fallback,
    code: code || undefined,
    kind: 'unknown',
    retryable: false,
  };
}

/**
 * Interprete le jsonb renvoye par une RPC metier { success, error, code, ... }.
 */
export function normalizeRpcPayload(
  data: unknown,
  fallback: string
): { ok: true; data: Record<string, unknown> } | RpcNormalizedError {
  const rec = asRecord(data);
  if (!rec) {
    return {
      success: false,
      error: fallback,
      kind: 'unknown',
      retryable: true,
    };
  }

  if (rec.success === true) {
    return { ok: true, data: rec };
  }

  const code = str(rec.code)?.toUpperCase();
  const rawError = str(rec.error) || fallback;

  // Paiement initie (cas special: payment_id present mais success false cote UX billets)
  if (str(rec.payment_id) && (code === 'PAYMENT_PENDING' || rawError.toLowerCase().includes('paiement initi'))) {
    return {
      success: false,
      error: BUSINESS_MESSAGES.PAYMENT_PENDING,
      code: 'PAYMENT_PENDING',
      kind: 'payment_pending',
      retryable: false,
      payment_id: str(rec.payment_id),
      amount_xof: typeof rec.amount_charged_xof === 'number'
        ? rec.amount_charged_xof
        : typeof rec.amount_face_xof === 'number'
          ? rec.amount_face_xof
          : undefined,
    };
  }

  if (code && BUSINESS_MESSAGES[code]) {
    return {
      success: false,
      error: BUSINESS_MESSAGES[code],
      code,
      kind: 'business',
      retryable: false,
      external_ticket_url: str(rec.external_ticket_url) ?? null,
      whatsapp_number: str(rec.whatsapp_number) ?? null,
    };
  }

  // Heuristiques sur le texte d'erreur serveur
  const lower = rawError.toLowerCase();
  if (lower.includes('authentif') || lower.includes('connectez')) {
    return { success: false, error: rawError, code: code || 'AUTH_REQUIRED', kind: 'auth', retryable: false };
  }
  if (lower.includes('stock') || lower.includes('disponible')) {
    return { success: false, error: rawError, code: code || 'STOCK', kind: 'business', retryable: false };
  }
  if (lower.includes('capacit')) {
    return { success: false, error: rawError, code: code || 'CAPACITY', kind: 'business', retryable: false };
  }
  if (lower.includes('introuvable') || lower.includes('not found')) {
    return { success: false, error: rawError, code: code || 'NOT_FOUND', kind: 'not_found', retryable: false };
  }

  return {
    success: false,
    error: rawError,
    code,
    kind: 'business',
    retryable: false,
    external_ticket_url: str(rec.external_ticket_url) ?? null,
    whatsapp_number: str(rec.whatsapp_number) ?? null,
    payment_id: str(rec.payment_id),
  };
}

/**
 * Enveloppe un appel RPC : transport error + payload metier.
 */
export function handleRpcResult(
  error: unknown,
  data: unknown,
  fallback: string
): { ok: true; data: Record<string, unknown> } | RpcNormalizedError {
  if (error) {
    return normalizeTransportError(error, fallback);
  }
  return normalizeRpcPayload(data, fallback);
}
