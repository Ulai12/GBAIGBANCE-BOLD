import type { ReactNode, CSSProperties } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'strong';
  onClick?: () => void;
  style?: CSSProperties;
}

export function GlassCard({ children, className = '', variant = 'default', onClick, style }: GlassCardProps) {
  const base = variant === 'strong' ? 'glass-strong' : 'glass-card';
  const clickable = onClick ? 'cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]' : '';
  return <div className={`${base} rounded-3xl ${clickable} ${className}`} onClick={onClick} style={style}>{children}</div>;
}
