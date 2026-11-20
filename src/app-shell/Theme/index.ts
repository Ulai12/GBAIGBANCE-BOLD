/**
 * GBAIGBANCE App Shell - Theme
 */

export type ThemeMode = 'system' | 'light' | 'dark';

export function getSavedThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = window.localStorage.getItem('gba_theme');
    return saved === 'dark' || saved === 'light' || saved === 'system' ? saved : 'system';
  } catch {
    return 'system';
  }
}

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyDocumentTheme(theme: 'light' | 'dark', mode: ThemeMode = theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  root.dataset.themeMode = mode;

  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  themeColor?.setAttribute('content', theme === 'dark' ? '#141216' : '#f7f5f0');
}
