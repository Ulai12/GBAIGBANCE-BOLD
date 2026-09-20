import React, { useState } from 'react';
import { ChevronLeft, Share2, Heart, Edit3, Settings, Film } from 'lucide-react';
import type { Event } from '@/types';

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
  onOpenLightbox,
  onEditEvent,
  onOpenManage,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="relative h-[54vh] min-h-[380px] max-h-[520px] w-full overflow-hidden bg-[#0c0a14] select-none">
      {/* 
        Image Hero avec placeholder blur-up basse résolution
        et transitions matérielles fluides 
      */}
      <button
        type="button"
        onClick={() => onOpenLightbox(coverImage)}
        className="absolute inset-0 z-0 block w-full h-full cursor-zoom-in group text-left focus:outline-hidden"
        aria-label={`Agrandir la photo de couverture de ${event.title}`}
      >
        <img
          src={coverImage}
          alt={event.title}
          decoding="async"
          fetchPriority="high"
          onLoad={() => setImageLoaded(true)}
          style={{
            transform: 'translateY(calc(var(--scroll-y, 0px) * 0.25)) scale(calc(1 + var(--scroll-progress, 0) * 0.05))',
            willChange: 'transform',
          }}
          className={`w-full h-full object-cover object-center transition-all duration-700 ease-out group-hover:scale-105 ${
            imageLoaded ? 'opacity-100 filter brightness-[0.92]' : 'opacity-40 filter blur-lg'
          }`}
        />
      </button>

      {/* Voile supérieur sombre pour garantir la lisibilité des boutons d'action iOS */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/75 via-black/35 to-transparent pointer-events-none z-10" />

      {/* 
        FLOU PROGRESSIF EN BAS (5 couches superposées de backdrop-filter)
        Chaque couche possède une hauteur et un blur croissant, avec son propre masque linéaire.
        Cela crée une fusion continue et organique de l'image vers le fond de la page.
      */}
      <div className="absolute inset-x-0 bottom-0 h-44 pointer-events-none z-10 overflow-hidden">
        {/* Couche 1 : Premier voile subtil (blur 2px) */}
        <div
          className="absolute inset-0"
          style={{
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 100%)',
          }}
        />
        {/* Couche 2 : Flou doux intermédiaire (blur 4px) */}
        <div
          className="absolute inset-x-0 bottom-0 h-[80%]"
          style={{
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            maskImage: 'linear-gradient(to bottom, transparent 15%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 15%, black 100%)',
          }}
        />
        {/* Couche 3 : Flou moyen (blur 8px) */}
        <div
          className="absolute inset-x-0 bottom-0 h-[60%]"
          style={{
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            maskImage: 'linear-gradient(to bottom, transparent 30%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 30%, black 100%)',
          }}
        />
        {/* Couche 4 : Flou prononcé (blur 14px) */}
        <div
          className="absolute inset-x-0 bottom-0 h-[40%]"
          style={{
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            maskImage: 'linear-gradient(to bottom, transparent 45%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 45%, black 100%)',
          }}
        />
        {/* Couche 5 : Flou terminal profond (blur 20px) */}
        <div
          className="absolute inset-x-0 bottom-0 h-[22%]"
          style={{
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            maskImage: 'linear-gradient(to bottom, transparent 60%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 60%, black 100%)',
          }}
        />
        {/* Voile de dégradé colorimétrique vers la feuille de contenu */}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#f4f1ff] via-[#f4f1ff]/60 to-transparent dark:from-[#0c0a14] dark:via-[#0c0a14]/65 pointer-events-none" />
      </div>

      {/* Barre d'outils flottante supérieure (cercles de verre iOS 44px) */}
      <div className="absolute top-0 left-0 right-0 pt-safe-header px-4 sm:px-6 pt-3 flex items-center justify-between z-20 pointer-events-auto">
        {/* Bouton Retour (touch target 44x44px) */}
        <button
          type="button"
          onClick={onBack}
          aria-label="Retour à la liste des événements"
          className="glass-btn-circle cursor-pointer hover:bg-white/30 focus:outline-hidden focus:ring-2 focus:ring-white"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>

        {/* Actions à droite : Gestionnaire (si organisateur), Partage et Cœur Favori */}
        <div className="flex items-center gap-2.5">
          {isOrganizer && onEditEvent && (
            <button
              type="button"
              onClick={() => onEditEvent(event)}
              aria-label="Modifier cet événement"
              className="h-[44px] px-4 rounded-full glass-btn-circle w-auto flex items-center gap-1.5 text-xs font-bold text-white cursor-pointer hover:bg-white/30"
            >
              <Edit3 className="w-4 h-4" />
              <span className="hidden xs:inline">Modifier</span>
            </button>
          )}

          {isOrganizer && onOpenManage && (
            <button
              type="button"
              onClick={onOpenManage}
              aria-label="Gérer l'événement et les entrées"
              className="glass-btn-circle cursor-pointer hover:bg-white/30 focus:outline-hidden focus:ring-2 focus:ring-white"
            >
              <Settings className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Bouton Partager */}
          <button
            type="button"
            onClick={onShare}
            aria-label="Partager l'événement"
            className="glass-btn-circle cursor-pointer hover:bg-white/30 focus:outline-hidden focus:ring-2 focus:ring-white"
          >
            <Share2 className="w-4 h-4 text-white" />
          </button>

          {/* Bouton Favori avec cœur et animation pop */}
          <button
            type="button"
            onClick={onLike}
            aria-label={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            className="glass-btn-circle cursor-pointer hover:bg-white/30 focus:outline-hidden focus:ring-2 focus:ring-white"
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

      {/* Badge du nombre de photos de la galerie en bas à droite du hero */}
      {galleryCount > 1 && (
        <div className="absolute bottom-6 right-4 sm:right-6 z-20 pointer-events-auto">
          <button
            type="button"
            onClick={() => onOpenLightbox(coverImage)}
            className="px-3.5 py-1.5 rounded-full bg-black/55 hover:bg-black/75 backdrop-blur-md border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
            aria-label={`Voir les ${galleryCount} photos de la galerie`}
          >
            <Film className="w-3.5 h-3.5 text-[#6600FF] dark:text-purple-400" />
            <span>{galleryCount} photos</span>
          </button>
        </div>
      )}
    </div>
  );
};
