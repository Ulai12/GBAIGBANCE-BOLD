/**
 * Web Push Notification Service for Gbaigbance PWA
 * Handles browser notification permissions, Service Worker push display,
 * and unified in-app notification routing.
 */

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  vibrate?: number[];
}

const PUSH_STORAGE_KEY = 'gba_web_push_enabled_v1';

export function isPushNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getPushPermissionState(): NotificationPermission | 'unsupported' {
  if (!isPushNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export function isPushEnabledInStorage(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(PUSH_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setPushEnabledInStorage(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PUSH_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore
  }
}

/**
 * Demande poliment la permission au navigateur
 */
export async function requestPushNotificationPermission(): Promise<boolean> {
  if (!isPushNotificationSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    setPushEnabledInStorage(granted);
    return granted;
  } catch (err) {
    console.warn('[Push] Error requesting notification permission:', err);
    return false;
  }
}

/**
 * Affiche une notification push native (via Service Worker si disponible, sinon Notification API)
 * et émet un événement in-app synchrone.
 */
export async function sendLocalPushNotification(payload: PushNotificationPayload): Promise<boolean> {
  // 1. Toujours émettre l'événement in-app pour que l'utilisateur reçoive l'information même sans push OS
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('gba-inapp-push-received', {
        detail: payload,
      })
    );
  }

  if (!isPushNotificationSupported()) {
    return false;
  }

  // Si la permission n'est pas accordée, on n'affiche pas au niveau OS
  if (Notification.permission !== 'granted') {
    return false;
  }

  const options: NotificationOptions = {
    body: payload.body,
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/icon.svg',
    tag: payload.tag || 'gba-general',
    data: payload.data || {},
    // vibration motif [vibre, silence, vibre]
    ...(payload.vibrate ? { vibrate: payload.vibrate } : { vibrate: [100, 50, 100] }),
  };

  try {
    // Méthode 1 : Préférer le Service Worker registration si actif
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(payload.title, options);
        return true;
      }
    }

    // Méthode 2 : Constructeur Notification natif de repli
    new Notification(payload.title, options);
    return true;
  } catch (err) {
    console.warn('[Push] Failed to show native notification:', err);
    return false;
  }
}
