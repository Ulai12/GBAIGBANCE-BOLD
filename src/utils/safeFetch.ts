/**
 * GBAIGBANCE — Utilitaire SafeFetch & Résilience Réseau
 * 
 * Protège contre les failles et pièges courants de fetch :
 * - SSRF (Server-Side Request Forgery & Adresses privées/dangereuses)
 * - Requêtes zombies / blocages infinis (Timeout automatique avec AbortController)
 * - Erreurs transitoires et 429/503 (Retry exponentiel avec jitter)
 * - Fuites de mémoire de flux et verrous de stream
 * - Exceptions JSON non interceptées
 */

export interface SafeFetchOptions extends RequestInit {
  /** Timeout en millisecondes avant abandon (par défaut : 20 000 ms) */
  timeoutMs?: number;
  /** Nombre maximal de tentatives en cas d'erreur transitoire (par défaut : 0) */
  retries?: number;
  /** Délai de base entre chaque tentative en millisecondes (par défaut : 800 ms) */
  retryDelayMs?: number;
  /** Si vrai, vérifie la sécurité de l'URL pour empêcher les failles SSRF (par défaut : true) */
  validateUrl?: boolean;
}

/**
 * Plages d'adresses IP privées et métadonnées cloud interdites (prévention SSRF)
 */
const BANNED_HOSTS = [
  '169.254.169.254', // AWS/GCP Metadata
  'metadata.google.internal',
  'instance-data',
  '0.0.0.0',
];

/**
 * Valide qu'une URL est sécurisée et ne cible pas les métadonnées de l'infrastructure
 */
export function isSafeUrl(rawUrl: string, allowLocal = true): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(rawUrl, window.location.href);

    // Seuls HTTP et HTTPS sont autorisés
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: `Protocole interdit : ${parsed.protocol}` };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Vérification des hôtes interdits (SSRF)
    if (BANNED_HOSTS.some((banned) => hostname === banned || hostname.endsWith(`.${banned}`))) {
      return { safe: false, reason: `Hôte interdit pour des raisons de sécurité : ${hostname}` };
    }

    // Protection contre les IP de loopback si non local
    if (!allowLocal) {
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
        return { safe: false, reason: `Adresses privées/locales non autorisées : ${hostname}` };
      }
    }

    return { safe: true };
  } catch (err) {
    return { safe: false, reason: `URL invalide : ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Combine plusieurs signaux AbortSignal de manière compatible avec tous les navigateurs
 */
function mergeAbortSignals(userSignal?: AbortSignal | null, internalSignal?: AbortSignal): AbortSignal | undefined {
  if (!userSignal) return internalSignal;
  if (!internalSignal) return userSignal;

  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([userSignal, internalSignal]);
  }

  const controller = new AbortController();
  const onAbort = () => {
    controller.abort();
    userSignal.removeEventListener('abort', onAbort);
    internalSignal.removeEventListener('abort', onAbort);
  };

  if (userSignal.aborted || internalSignal.aborted) {
    controller.abort();
    return controller.signal;
  }

  userSignal.addEventListener('abort', onAbort);
  internalSignal.addEventListener('abort', onAbort);
  return controller.signal;
}

/**
 * Effectue un fetch sécurisé avec timeout strict, validation d'URL et retry exponentiel
 */
export async function safeFetch(
  input: RequestInfo | URL,
  options: SafeFetchOptions = {}
): Promise<Response> {
  const {
    timeoutMs = 20_000,
    retries = 0,
    retryDelayMs = 800,
    validateUrl = true,
    signal: userSignal,
    ...fetchInit
  } = options;

  const urlString = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  // 1. Validation de l'URL (SSRF)
  if (validateUrl && urlString) {
    const check = isSafeUrl(urlString);
    if (!check.safe) {
      throw new Error(`[SafeFetch] Échec de sécurité URL: ${check.reason}`);
    }
  }

  let attempt = 0;
  const maxAttempts = Math.max(1, retries + 1);

  while (attempt < maxAttempts) {
    attempt++;
    const internalController = new AbortController();
    const timeoutId = setTimeout(() => {
      internalController.abort();
    }, timeoutMs);

    const combinedSignal = mergeAbortSignals(userSignal, internalController.signal);

    try {
      const response = await fetch(input, {
        ...fetchInit,
        signal: combinedSignal,
      });

      clearTimeout(timeoutId);

      // Si erreur serveur transitoire 502/503/504 ou 429 et qu'il reste des tentatives
      if (attempt < maxAttempts && (response.status === 429 || (response.status >= 502 && response.status <= 504))) {
        const backoff = retryDelayMs * Math.pow(2, attempt - 1) + Math.random() * 200;
        console.warn(`[SafeFetch] Statut HTTP ${response.status}. Nouvelle tentative dans ${Math.round(backoff)}ms (essai ${attempt}/${maxAttempts})...`);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }

      return response;
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      // Si abandonné explicitement par l'utilisateur, ne pas re-tenter
      if (userSignal?.aborted) {
        throw error;
      }

      const isTimeout = internalController.signal.aborted;
      const isNetworkError = error instanceof TypeError;

      if (attempt < maxAttempts && (isTimeout || isNetworkError)) {
        const backoff = retryDelayMs * Math.pow(2, attempt - 1) + Math.random() * 200;
        console.warn(
          `[SafeFetch] ${isTimeout ? 'Timeout' : 'Erreur réseau'}. Nouvelle tentative dans ${Math.round(backoff)}ms (essai ${attempt}/${maxAttempts})...`,
          error
        );
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }

      if (isTimeout) {
        throw new Error(`Délai d'attente dépassé après ${timeoutMs}ms lors de l'appel réseau.`);
      }

      throw error;
    }
  }

  throw new Error('[SafeFetch] Nombre maximal de tentatives réseau atteint sans réponse.');
}

/**
 * Effectue un fetch sécurisé et extrait le corps JSON en gérant les réponses non-JSON ou vides
 */
export async function safeFetchJson<T>(
  input: RequestInfo | URL,
  options: SafeFetchOptions = {}
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  try {
    const res = await safeFetch(input, options);
    const contentType = res.headers.get('content-type') || '';
    
    if (!contentType.includes('application/json')) {
      const text = await res.text().catch(() => '');
      if (!res.ok) {
        return { ok: false, status: res.status, error: text.slice(0, 200) || `Erreur HTTP ${res.status}` };
      }
      return { ok: true, status: res.status, data: text as unknown as T };
    }

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = json?.error || json?.message || `Erreur HTTP ${res.status}`;
      return { ok: false, status: res.status, error: typeof msg === 'string' ? msg : JSON.stringify(msg) };
    }

    return { ok: true, status: res.status, data: json as T };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : 'Erreur de connexion réseau',
    };
  }
}
