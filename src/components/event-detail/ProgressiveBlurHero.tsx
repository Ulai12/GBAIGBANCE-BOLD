import React, { useState } from 'react';
import { ChevronLeft, Share2, Heart, Edit3, Settings, Film, Flag } from 'lucide-react';
import type { Event } from '@/types';
import { useApp } from '@/hooks/useApp';

/**
 * GBAIGBANCE — ProgressiveBlurHero (iOS Liquid Glass)
 * 
 * Implémente le hero immersif (56% de la hauteur d'écran) avec :
 * 1. Dégradé de flou progressif à 5 strates calculées (blur 2px -> 20px) avec mask-image
 *    pour éviter toute coupure nette avec le contenu.
 * 2. Boutons de navigation en verre circulaire (44px, active:scale-94, pop sur le like).
 * 3. Parallaxe et lissage matériel adaptés aux mobiles d'Afrique de l'Ouest.
 */

interface ProgressiveBlurHeroProps {
  event: Event;
  coverImage: string;
  galleryCount: number;
  liked: boolean;
  isOrganizer: boolean;
  onBack: () => void;
  onLike: () => void;
  onShare: () => void;
  onReport?: () => void;
  onOpenLightbox: (src: string) => void;
  onEditEvent?: (event: Event) => void;
  onOpenManage?: () => void;
}

export const ProgressiveBlurHero: React.FC<ProgressiveBlurHeroProps> = ({
  event,
  coverImage,
  galleryCount,
  liked,
  isOrganizer,
  onBack,
  onLike,
  onShare,
  onReport,
  onOpenLightbox,
  onEditEvent,
  onOpenManage,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const { t, language } = useApp();
  const detailText = (key: string) => t('events', `detail.${key}`);
  const eventDate = new Date(event.starts_at || '');
  const eventDateLabel = Number.isNaN(eventDate.getTime())
    ? ''
    : new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    }).format(eventDate);

  return (
    <div className="relative h-[68svh] min-h-[480px] max-h-[720px] w-full overflow-hidden bg-neutral-900 select-none sm:h-[58svh] sm:min-h-[500px]">
      {/* 
        Image Hero avec placeholder blur-up basse résolution
        et zoom subtil au survol
      */}
      <button
        type="button"
        onClick={() => onOpenLightbox(coverImage)}
        className="absolute inset-0 z-0 block w-full h-full cursor-zoom-in group text-left focus:outline-hidden"
        aria-label={detailText('hero.enlargeCover').replace('{title}', event.title)}
      >
        <img
          src={coverImage}
          alt={event.title}
          decoding="async"
          // @ts-expect-error fetchpriority lowercase attribute is valid HTML and accepted in React 18
          fetchpriority="high"
          onLoad={() => setImageLoaded(true)}
          style={{
            transform: 'translateY(calc(var(--scroll-y, 0px) * 0.22)) scale(calc(1 + var(--scroll-progress, 0) * 0.04))',
            willChange: 'transform',
          }}
          className={`w-full h-full object-cover object-center transition-all duration-700 ease-out group-hover:scale-105 ${
            imageLoaded ? 'opacity-100 filter brightness-100' : 'opacity-40 filter blur-lg'
          }`}
        />
      </button>

      {/* 
        Voile supérieur sombre très discret et allégé (h-10) pour laisser l'image pleinement visible
      */}
      <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/20 via-black/5 to-transparent pointer-events-none z-10" />

      {/* 
        Dégradé bas très discret (h-8) pour adoucir le raccord sans couvrir la photo
      */}
      <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none z-10" />

      {/* 
        BARRE D'OUTILS FLOTTANTE SUPÉRIEURE iOS
        Ancrée avec env(safe-area-inset-top) + espacement pour rester toujours sous l'encoche et l'île dynamique.
      */}
      <div
        className="absolute top-0 left-0 right-0 px-4 sm:px-6 flex items-center justify-between z-20 pointer-events-auto"
        style={{
          paddingTop: 'max(1.25rem, calc(env(safe-area-inset-top, 0px) + 0.85rem))',
        }}
      >
        {/* Bouton Retour (touch target iOS 44x44px) */}
        <button
          type="button"
          onClick={onBack}
          aria-label={detailText('hero.backToEvents')}
          className="w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 active:scale-92 backdrop-blur-xl border border-white/25 shadow-lg shadow-black/30 flex items-center justify-center text-white cursor-pointer transition-all shrink-0"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>

        {/* Actions à droite : Gestionnaire (si organisateur), Partage et Cœur Favori */}
        <div className="flex items-center gap-2.5">
          {isOrganizer && onEditEvent && (
            <button
              type="button"
              onClick={() => onEditEvent(event)}
              aria-label={detailText('hero.editEvent')}
              className="h-11 px-4 rounded-full bg-black/60 hover:bg-black/80 active:scale-92 backdrop-blur-xl border border-white/25 shadow-lg shadow-black/30 flex items-center gap-1.5 text-xs font-bold text-white cursor-pointer transition-all shrink-0"
            >
              <Edit3 className="w-4 h-4" />
              <span className="hidden xs:inline">{detailText('hero.edit')}</span>
            </button>
          )}

          {isOrganizer && onOpenManage && (
            <button
              type="button"
              onClick={onOpenManage}
              aria-label={detailText('hero.manage')}
              className="w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 active:scale-92 backdrop-blur-xl border border-white/25 shadow-lg shadow-black/30 flex items-center justify-center text-white cursor-pointer transition-all shrink-0"
            >
              <Settings className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Bouton Signaler */}
          {onReport && (
            <button
              type="button"
              onClick={onReport}
              aria-label={detailText('report.title')}
              title={detailText('report.title')}
              className="w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 active:scale-92 backdrop-blur-xl border border-white/25 shadow-lg shadow-black/30 flex items-center justify-center text-white cursor-pointer transition-all shrink-0"
            >
              <Flag className="w-4 h-4 text-white" />
            </button>
          )}

          {/* Bouton Partager */}
          <button
            type="button"
            onClick={onShare}
            aria-label={detailText('share.modalTitle')}
            className="w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 active:scale-92 backdrop-blur-xl border border-white/25 shadow-lg shadow-black/30 flex items-center justify-center text-white cursor-pointer transition-all shrink-0"
          >
            <Share2 className="w-4 h-4 text-white" />
          </button>

          {/* Bouton Favori avec cœur et animation pop */}
          <button
            type="button"
            onClick={onLike}
            aria-label={detailText(liked ? 'removeFavorite' : 'addFavorite')}
            className="w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 active:scale-92 backdrop-blur-xl border border-white/25 shadow-lg shadow-black/30 flex items-center justify-center text-white cursor-pointer transition-all shrink-0"
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                liked
                  ? 'fill-red-500 text-red-500 animate-heart-pop'
                  : 'text-white'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 pb-9 sm:pb-11">
          <div className="max-w-5xl pr-16 sm:pr-24">
            <p className="mb-2 text-xs sm:text-sm font-bold text-white/85">
              {t('events', `categories.${event.category}`)}
              {eventDateLabel ? ` · ${eventDateLabel}` : ''}
            </p>
            <h1 className="max-w-4xl text-[clamp(2.25rem,5vw,4.75rem)] font-black leading-[0.98] text-white break-words tracking-[0] [text-shadow:0_2px_18px_rgba(0,0,0,0.5)]">
              {event.title}
            </h1>
            <p className="mt-2 text-sm sm:text-base font-semibold text-white/85 truncate">
              {[event.location_name, event.city].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      </div>

      {/* Badge du nombre de photos de la galerie en bas à droite du hero */}
      {galleryCount > 1 && (
        <div className="absolute bottom-6 right-4 sm:right-6 z-20 pointer-events-auto">
          <button
            type="button"
            onClick={() => onOpenLightbox(coverImage)}
            className="px-3.5 py-1.5 rounded-full bg-black/55 hover:bg-black/75 backdrop-blur-md border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
            aria-label={detailText('hero.viewGallery').replace('{count}', String(galleryCount))}
          >
            <Film className="w-3.5 h-3.5 text-[#6600FF] dark:text-purple-400" />
            <span>{detailText('hero.photos').replace('{count}', String(galleryCount))}</span>
          </button>
        </div>
      )}
    </div>
  );
};
