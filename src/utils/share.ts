/**
 * Universal native Web Share API with resilient clipboard fallback.
 */

export interface ShareDataPayload {
  title: string;
  text?: string;
  url?: string;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback for older browsers
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

export async function shareContent(payload: ShareDataPayload): Promise<{ success: boolean; method: 'native' | 'clipboard' | 'failed' }> {
  const shareUrl = payload.url || (typeof window !== 'undefined' ? window.location.href : 'https://gbaigbance.com');
  const fullText = payload.text ? `${payload.text}\n${shareUrl}` : shareUrl;

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: shareUrl,
      });
      return { success: true, method: 'native' };
    } catch (err: unknown) {
      const error = err as { name?: string };
      // If user aborted/cancelled the native share sheet, do not trigger fallback error
      if (error.name === 'AbortError') {
        return { success: false, method: 'native' };
      }
    }
  }

  // Fallback to clipboard
  const copied = await copyToClipboard(fullText);
  return { success: copied, method: copied ? 'clipboard' : 'failed' };
}
