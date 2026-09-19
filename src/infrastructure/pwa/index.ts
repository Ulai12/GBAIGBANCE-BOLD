/**
 * GBAIGBANCE Infrastructure - Progressive Web App (PWA)
 */

export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((window.navigator as unknown as { standalone?: boolean }).standalone)
  );
}

export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

export function registerOnlineStatusListener(onStatusChange: (online: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handleOnline = () => onStatusChange(true);
  const handleOffline = () => onStatusChange(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
