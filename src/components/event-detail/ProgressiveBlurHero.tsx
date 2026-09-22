import React, { useState } from 'react';
import { ChevronLeft, Share2, Heart, Edit3, Settings, Film, Flag } from 'lucide-react';
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

  return (
    <div className="relative h-[56vh] min-h-[420px] max-h-[580px] w-full overflow-hidden bg-[#f4f1ff] dark:bg-[#0c0a14] select-none">
      {/* 
        Image Hero avec placeholder blur-up basse résolution
        et zoom subtil au survol
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
            transform: 'translateY(calc(var(--scroll-y, 0px) * 0.22)) scale(calc(1 + var(--scroll-progress, 0) * 0.04))',
            willChange: 'transform',
          }}
          className={`w-full h-full object-cover object-center transition-all duration-700 ease-out group-hover:scale-105 ${
            imageLoaded ? 'opacity-100 filter brightness-[0.96]' : 'opacity-40 filter blur-lg'
          }`}
        />
      </button>

      {/* 
        FLOU PROGRESSIF HAUTE DÉFINITION (Zéro halo grisâtre)
        Au lieu d'un backdrop-filter qui crée des bordures grises disgracieuses en mode clair/sombre,
        on utilise un dédoublement de l'image filtrée avec un masque progressif naturel.
      */}
      <div
        className="absolute inset-0 pointer-events-none z-5 overflow-hidden"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, transparent 28%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.85) 75%, black 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, transparent 28%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.85) 75%, black 100%)',
        }}
      >
        <img
          src={coverImage}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-center filter blur-2xl scale-110 saturate-[1.2]"
        />
      </div>

      {/* 
        Voile supérieur sombre continu pour la zone d'encoche / Dynamic Island iOS
        Garantit un contraste parfait pour les boutons d'action quel que soit le fond de l'image.
      */}
      <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/85 via-black/45 to-transparent pointer-events-none z-10" />

      {/* 
        DÉGRADÉ CONTINU PROFOND VERS LA FEUILLE DE CONTENU
        Couvre largement la moitié inférieure du hero (h-72 / h-80) pour un fondu
        parfaitement soyeux et continu dans l'arrière-plan, éliminant tout bloc ou ligne de rupture.
      */}
      <div className="absolute inset-x-0 bottom-0 h-72 sm:h-80 bg-gradient-to-t from-[#f4f1ff] via-[#f4f1ff]/80 to-transparent dark:from-[#0c0a14] dark:via-[#0c0a14]/85 pointer-events-none z-10" />

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
          aria-label="Retour à la liste des événements"
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
              aria-label="Modifier cet événement"
              className="h-11 px-4 rounded-full bg-black/60 hover:bg-black/80 active:scale-92 backdrop-blur-xl border border-white/25 shadow-lg shadow-black/30 flex items-center gap-1.5 text-xs font-bold text-white cursor-pointer transition-all shrink-0"
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
              className="w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 active:scale-92 backdrop-blur-xl border border-white/25 shadow-lg shadow-black/30 flex items-center justify-center text-white cursor-pointer transition-all shrink-0"
            >
              <Settings className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Bouton Signaler (TODO) */}
          {onReport && (
            <button
              type="button"
              onClick={onReport}
              aria-label="Signaler cet événement"
              title="Signaler cet événement"
              className="w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 active:scale-92 backdrop-blur-xl border border-white/25 shadow-lg shadow-black/30 flex items-center justify-center text-white cursor-pointer transition-all shrink-0"
            >
              <Flag className="w-4 h-4 text-white" />
            </button>
          )}

          {/* Bouton Partager */}
          <button
            type="button"
            onClick={onShare}
            aria-label="Partager l'événement"
            className="w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 active:scale-92 backdrop-blur-xl border border-white/25 shadow-lg shadow-black/30 flex items-center justify-center text-white cursor-pointer transition-all shrink-0"
          >
            <Share2 className="w-4 h-4 text-white" />
          </button>

          {/* Bouton Favori avec cœur et animation pop */}
          <button
            type="button"
            onClick={onLike}
            aria-label={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
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
