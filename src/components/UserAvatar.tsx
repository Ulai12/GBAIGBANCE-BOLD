import { useState, useEffect, useMemo } from 'react';
import { Music2, Building2, User } from 'lucide-react';
import { getDefaultUserAvatar, getAvatarInitials } from '@/utils/defaultImages';
import type { UserRole } from '@/types';

interface UserAvatarProps {
  id?: string | null;
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

export function UserAvatar({
  id,
  src,
  name,
  role,
  size = 'md',
  shape = 'circle',
  className = '',
  imageClassName = '',
  ring = true,
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;
  // Utilise la règle stricte des initiales : 2 mots -> 1ère lettre de chaque mot (HB), 1 mot -> 2 premières lettres (JU)
  const initials = useMemo(() => getAvatarInitials(name), [name]);

  useEffect(() => {
    setImageError(false);
  }, [src]);

  const roundedClass = shape === 'circle' ? 'rounded-full' : 'rounded-2xl sm:rounded-[1.4rem]';
  const hasCustomRing = className.includes('ring-');
  const ringClass = ring && !hasCustomRing ? 'ring-2 ring-black/5 dark:ring-white/10 shadow-xs' : '';

  // Évite les conflits de classes Tailwind si className spécifie déjà une largeur ou hauteur personnalisée
  const hasCustomDimension = /(?:^|\s)[wh]-/.test(className);
  const dimensionClass = hasCustomDimension
    ? sizeConfig.box.replace(/(?:^|\s)[wh]-[\w/.[\]]+(?=\s|$)/g, '').trim()
    : sizeConfig.box;

  const effectiveSrc = useMemo(() => {
    if (src && src.trim() !== '' && !imageError) {
      return src;
    }
    // Deterministic fallback avatar based on stable entity id/name and role
    return getDefaultUserAvatar(name || 'user', typeof role === 'string' ? role : undefined, id);
  }, [src, imageError, name, role, id]);

  const RoleIcon = role === 'artist' ? Music2 : role === 'organizer' ? Building2 : User;

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${dimensionClass} ${roundedClass} ${className}`}>
      <div
        className={`relative overflow-hidden select-none w-full h-full ${roundedClass} ${ringClass} bg-zinc-100 dark:bg-zinc-800`}
      >
        {effectiveSrc ? (
          <img
            src={effectiveSrc}
            alt={name || 'Avatar'}
            onError={() => {
              if (!imageError) setImageError(true);
            }}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className={`absolute inset-0 w-full h-full object-cover object-center ${imageClassName}`}
          />
        ) : (
          <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#12111A] text-white font-black tracking-wider">
            {initials ? (
              <span>{initials}</span>
            ) : (
              <RoleIcon className={`${sizeConfig.icon} text-white/90`} />
            )}
          </div>
        )}
      </div>

      {/* Badge de certification retiré temporairement selon la demande utilisateur */}
      {/* {isVerified && (
        <div
          className={`absolute ${sizeConfig.badge} rounded-full bg-[#6600FF] ring-2 ring-white dark:ring-[#14121E] flex items-center justify-center text-white shadow-xs z-10`}
          title="Compte Vérifié"
        >
          <BadgeCheck className="w-full h-full p-0.5 text-white" />
        </div>
      )} */}
    </div>
  );
}
