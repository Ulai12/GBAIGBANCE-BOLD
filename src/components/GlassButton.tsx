import type { ReactNode } from 'react';

interface GlassButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  fullWidth?: boolean;
}

export function GlassButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  fullWidth = false,
}: GlassButtonProps) {
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const variants = {
    primary: 'bg-[#6600FF] text-white hover:bg-[#5500D4] shadow-lg shadow-[#6600FF]/30',
    secondary: 'glass text-[#171726] hover:bg-white/30',
    ghost: 'text-[#4d4d5d] hover:bg-white/30',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''}
        rounded-2xl font-semibold transition-all duration-300
        hover:scale-[1.02] active:scale-[0.98]
        disabled:opacity-50 disabled:pointer-events-none
        ${className}
      `}
    >
      {children}
    </button>
  );
}
