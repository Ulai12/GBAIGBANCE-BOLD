/**
 * Navigation avec View Transition API (progressive enhancement).
 * Utilisation : navigateVT(navigate, '/path', options)
 */
export function navigateVT(
  navigate: (to: string | number, options?: object) => void,
  to: string | number,
  options?: object,
): void {
  const go = () => {
    if (typeof to === 'number') navigate(to);
    else navigate(to, options as never);
  };
  if (typeof document !== 'undefined' && 'startViewTransition' in document) {
    try {
      (document as Document & { startViewTransition: (cb: () => void) => void }).startViewTransition(go);
      return;
    } catch {
      // ignore
    }
  }
  go();
}
