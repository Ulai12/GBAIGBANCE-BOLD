import type { ReactNode, CSSProperties, KeyboardEvent } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'strong';
  onClick?: () => void;
  style?: CSSProperties;
  role?: string;
  tabIndex?: number;
  ariaLabel?: string;
}

export function GlassCard({
  children,
  className = '',
  variant = 'default',
  onClick,
  style,
  role,
  tabIndex,
  ariaLabel,
}: GlassCardProps) {
  const base = variant === 'strong' ? 'glass-strong' : 'glass-card';
  const isClickable = Boolean(onClick);
  const clickableClasses = isClickable
    ? 'cursor-pointer transition-all duration-300 hover:scale-[1.015] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF]/60 focus-visible:ring-offset-2'
    : '';

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`${base} rounded-3xl ${clickableClasses} ${className}`}
      onClick={onClick}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      role={role ?? (isClickable ? 'button' : undefined)}
      tabIndex={tabIndex ?? (isClickable ? 0 : undefined)}
      aria-label={ariaLabel}
      style={style}
    >
      {children}
    </div>
  );
}
