import type { Event } from '@/types';
import type { ToastData } from '@/components/Toast';

export interface EventShareData {
  title: string;
  text: string;
  url: string;
  formattedDate: string;
  formattedLocation: string;
  formattedPrice: string;
}

export function triggerAppToast(toast: Omit<ToastData, 'id'>) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gba-toast', { detail: toast }));
  }
}

export function formatEventShareDate(dateString: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

export function getEventShareData(event: Event): EventShareData {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://gbaigbance.app';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const url = `${origin}${pathname}?event=${encodeURIComponent(event.id)}`;

  const formattedDate = formatEventShareDate(event.starts_at);
  const formattedLocation = event.location_name || event.city || 'Afrique de l’Ouest';
  const formattedPrice =
    event.price_min === 0
      ? 'Entrée Gratuite'
      : `${event.price_min.toLocaleString('fr-FR')} FCFA`;

  const text = `🔥 Rejoins-moi pour "${event.title}" !\n📅 ${formattedDate}\n📍 ${formattedLocation}\n🎟️ ${formattedPrice}\n\nDécouvre tous les détails et réserve ta place sur Gbaïgbancê :`;

  return {
    title: `${event.title} · Gbaïgbancê`,
    text,
    url,
    formattedDate,
    formattedLocation,
    formattedPrice,
  };
}

export async function shareEventNative(
  event: Event,
  onToast?: (toast: Omit<ToastData, 'id'>) => void
): Promise<'shared' | 'cancelled' | 'unsupported' | 'failed'> {
  const shareData = getEventShareData(event);
  const notify = onToast || triggerAppToast;

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const payload: ShareData = {
        title: shareData.title,
        text: shareData.text,
        url: shareData.url,
      };

      if (navigator.canShare && !navigator.canShare(payload)) {
        return 'unsupported';
      }

      await navigator.share(payload);
      notify({
        message: 'Événement partagé avec succès !',
        type: 'success',
      });
      return 'shared';
    } catch (err: unknown) {
      if (err instanceof Error && (err.name === 'AbortError' || err.message?.includes('abort'))) {
        // L'utilisateur a simplement fermé la feuille de partage système
        return 'cancelled';
      }
      return 'failed';
    }
  }

  return 'unsupported';
}

export async function copyEventToClipboard(
  event: Event,
  onToast?: (toast: Omit<ToastData, 'id'>) => void
): Promise<boolean> {
  const shareData = getEventShareData(event);
  const notify = onToast || triggerAppToast;
  const fullContent = `${shareData.text}\n${shareData.url}`;

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(fullContent);
      notify({
        message: 'Lien et détails de l’événement copiés !',
        type: 'success',
      });
      return true;
    }
  } catch {
    // Fallback document.execCommand if clipboard API is restricted
    try {
      const textarea = document.createElement('textarea');
      textarea.value = fullContent;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      notify({
        message: 'Lien copié dans le presse-papiers !',
        type: 'success',
      });
      return true;
    } catch {
      notify({
        message: 'Impossible de copier automatiquement le lien.',
        type: 'error',
      });
      return false;
    }
  }

  return false;
}
