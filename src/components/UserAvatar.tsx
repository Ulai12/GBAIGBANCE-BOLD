import { useState, useEffect, useMemo } from 'react';
import { BadgeCheck, Music2, Building2, User } from 'lucide-react';
import type { UserRole } from '@/types';

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  role?: UserRole | string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shape?: 'circle' | 'squircle';
  isVerified?: boolean;
  className?: string;
  imageClassName?: string;
  ring?: boolean;
}

const SIZE_MAP = {
  xs: { box: 'w-7 h-7 text-[10px]', icon: 'w-3.5 h-3.5', badge: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5' },
  sm: { box: 'w-9 h-9 text-xs font-bold', icon: 'w-4 h-4', badge: 'w-3 h-3 -bottom-0.5 -right-0.5' },
  md: { box: 'w-12 h-12 text-sm font-black', icon: 'w-5 h-5', badge: 'w-3.5 h-3.5 -bottom-0.5 -right-0.5' },
  lg: { box: 'w-16 h-16 text-lg font-black', icon: 'w-7 h-7', badge: 'w-4 h-4 -bottom-1 -right-1' },
  xl: { box: 'w-20 h-20 text-xl font-black', icon: 'w-8 h-8', badge: 'w-5 h-5 -bottom-0.5 -right-0.5' },
  '2xl': { box: 'w-28 h-28 text-3xl font-black', icon: 'w-12 h-12', badge: 'w-6 h-6 -bottom-1 -right-1' },
};

const GRADIENTS = [
  'from-[#6600FF] via-[#7C3AED] to-[#A855F7]', // Royal Purple
  'from-[#0052D4] via-[#4364F7] to-[#6FB1FC]', // Deep Azure
  'from-[#FF416C] via-[#FF4B2B] to-[#FF758C]', // Vivid Coral
  'from-[#0575E6] via-[#00F260] to-[#20BDFF]', // Emerald Breeze
  'from-[#8E2DE2] via-[#4A00E0] to-[#7F00FF]', // Deep Indigo
  'from-[#F97316] via-[#EA580C] to-[#C2410C]', // Warm Tangerine
  'from-[#0D9488] via-[#14B8A6] to-[#2DD4BF]', // Modern Teal
  'from-[#BE185D] via-[#DB2777] to-[#F472B6]', // Vivid Rose
];

function getInitials(name?: string | null): string {
  if (!name) return '';
  const trimmed = name.trim();
  if (!trimmed) return '';
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

function getGradientIndex(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % GRADIENTS.length;
}

export function UserAvatar({
  src,
  name,
  role,
  size = 'md',
  shape = 'circle',
  isVerified = false,
  className = '',
  imageClassName = '',
  ring = true,
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;
  const initials = useMemo(() => getInitials(name), [name]);

  useEffect(() => {
    setImageError(false);
  }, [src]);

  const gradientClass = useMemo(() => {
    if (role === 'artist') return 'from-[#7C3AED] via-[#6600FF] to-[#C026D3]';
    if (role === 'organizer') return 'from-[#EA580C] via-[#E11D48] to-[#9333EA]';
    return GRADIENTS[getGradientIndex(name || 'user')];
  }, [name, role]);

  const roundedClass = shape === 'circle' ? 'rounded-full' : 'rounded-2xl sm:rounded-[1.4rem]';
  const hasCustomRing = className.includes('ring-');
  const ringClass = ring && !hasCustomRing ? 'ring-2 ring-black/5 dark:ring-white/10 shadow-xs' : '';

  const hasValidImage = Boolean(src && !imageError && src.trim() !== '');

  const RoleIcon = role === 'artist' ? Music2 : role === 'organizer' ? Building2 : User;

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 aspect-square ${roundedClass} ${className}`}>
      <div
        className={`relative overflow-hidden flex items-center justify-center aspect-square select-none w-full h-full ${sizeConfig.box} ${roundedClass} ${ringClass} ${
          hasValidImage ? 'bg-zinc-100 dark:bg-zinc-800' : `bg-gradient-to-tr ${gradientClass} text-white shadow-sm`
        }`}
      >
        {hasValidImage ? (
          <img
            src={src!}
            alt={name || 'Avatar'}
            onError={() => setImageError(true)}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className={`w-full h-full aspect-square object-cover ${roundedClass} ${imageClassName}`}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-white font-black tracking-wider">
            {initials ? (
              <span>{initials}</span>
            ) : (
              <RoleIcon className={`${sizeConfig.icon} text-white/90`} />
            )}
          </div>
        )}
      </div>

      {/* Verification Badge */}
      {isVerified && (
        <div
          className={`absolute ${sizeConfig.badge} rounded-full bg-[#6600FF] ring-2 ring-white dark:ring-[#14121E] flex items-center justify-center text-white shadow-xs z-10`}
          title="Compte Vérifié"
        >
          <BadgeCheck className="w-full h-full p-0.5 text-white" />
        </div>
      )}
    </div>
  );
}
