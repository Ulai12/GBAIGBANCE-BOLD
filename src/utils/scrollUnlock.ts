/**
 * Libère les locks overflow/touch laissés par View Transition ou gestures (iOS Safari).
 * À appeler après chaque navigation POP / retour arrière.
 */
export function unlockDocumentScroll() {
  try {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    document.documentElement.style.touchAction = '';
  } catch {
    // ignore
  }
}

export function restoreWindowScroll(y: number) {
  unlockDocumentScroll();
  window.scrollTo({ top: y, left: 0, behavior: 'auto' });
}
