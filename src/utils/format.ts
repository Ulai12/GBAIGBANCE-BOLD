export function formatPrice(price: number, currency: string = 'XOF'): string {
  if (price === 0) return '';
  const formatted = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(price);
  const symbols: Record<string, string> = {
    XOF: 'FCFA',
    EUR: '€',
    USD: '$',
  };
  return `${formatted} ${symbols[currency] || currency}`;
}

export function formatDate(dateString?: string | null, lang: string = 'fr'): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
  try {
    return date.toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '';
  }
}

export function formatFullDate(dateString?: string | null, lang: string = 'fr'): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
  try {
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function formatTime(dateString?: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function formatRelativeDate(dateString?: string | null, lang: string = 'fr'): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (lang === 'fr') {
    if (diffDays === 0) return 'Aujourd\'hui';
    if (diffDays === 1) return 'Demain';
    if (diffDays === -1) return 'Hier';
    if (diffDays > 0 && diffDays <= 7) return `Dans ${diffDays} jours`;
    if (diffDays < 0 && diffDays >= -7) return `Il y a ${Math.abs(diffDays)} jours`;
  } else {
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  }
  return formatDate(dateString, lang);
}

export function formatNumber(num: number, lang: string = 'fr'): string {
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace('.0', '')}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace('.0', '')}K`;
  return num.toLocaleString(locale);
}
