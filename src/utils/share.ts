import type { Event, Language } from '@/types';
import type { ToastData } from '@/components/Toast';
import { translate } from '@/locales';

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

export function formatEventShareDate(dateString: string, language: Language = 'fr'): string {
  try {
    return new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-US', {
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

export function getEventShareData(event: Event, language: Language = 'fr'): EventShareData {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://gbaigbance.app';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const url = `${origin}${pathname}?event=${encodeURIComponent(event.id)}`;

  const formattedDate = formatEventShareDate(event.starts_at, language);
  const formattedLocation = event.location_name || event.city || (language === 'fr' ? 'Afrique de l’Ouest' : 'West Africa');
  const formattedPrice =
    event.price_min === 0
      ? translate(language, 'events', 'detail.share.free')
      : `${event.price_min.toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US')} FCFA`;

  const text = translate(language, 'events', 'detail.share.text')
    .replace('{title}', event.title)
    .replace('{date}', formattedDate)
    .replace('{location}', formattedLocation)
    .replace('{price}', formattedPrice);

  return {
    title: translate(language, 'events', 'detail.share.title').replace('{title}', event.title),
    text,
    url,
    formattedDate,
    formattedLocation,
    formattedPrice,
  };
}

export async function shareEventNative(
  event: Event,
  onToast?: (toast: Omit<ToastData, 'id'>) => void,
  language: Language = 'fr'
): Promise<'shared' | 'cancelled' | 'unsupported' | 'failed'> {
  const shareData = getEventShareData(event, language);
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
        message: translate(language, 'events', 'detail.share.success'),
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
  onToast?: (toast: Omit<ToastData, 'id'>) => void,
  language: Language = 'fr'
): Promise<boolean> {
  const shareData = getEventShareData(event, language);
  const notify = onToast || triggerAppToast;
  const fullContent = `${shareData.text}\n${shareData.url}`;

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(fullContent);
      notify({
        message: translate(language, 'events', 'detail.share.copied'),
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
        message: translate(language, 'events', 'detail.share.copied'),
        type: 'success',
      });
      return true;
    } catch {
      notify({
        message: translate(language, 'events', 'detail.share.copyFailed'),
        type: 'error',
      });
      return false;
    }
  }

  return false;
}
