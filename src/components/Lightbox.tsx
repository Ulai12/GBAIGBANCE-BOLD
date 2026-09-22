import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ZoomIn,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Info,
  Share2,
  Download,
  Check,
  Sparkles,
  Maximize2,
  ShieldCheck,
  Copy,
} from 'lucide-react';
import { haptic } from '@/hooks/useHaptics';

export interface LightboxProps {
  src?: string;
  images?: string[];
  initialIndex?: number;
  alt?: string;
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  onClose: () => void;
  onToast?: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
}

interface ImageMeta {
  width: number;
  height: number;
  aspectRatio: string;
  megaPixels: string;
  format: string;
}

/**
 * GBAIGBANCE — Visionneuse & Page de Précision d'Images (Apple iOS Style)
 * 
 * Expérience haut de gamme inspirée d'Apple Photos / iOS :
 * - Rendu OLED ultra-sombre immersif avec halo ambiant adaptatif aux couleurs de l'image
 * - Barre supérieure Liquid Glass respectant scrupuleusement la safe-area (encoche & Dynamic Island)
 * - Navigation multi-images fluide (glisser, chevrons, dock de vignettes tactile)
 * - Zoom haute précision (double-tap pour zoomer/dézoomer, slider/boutons 1x -> 2.5x -> 4x, pan libre)
 * - Geste "Pull-to-dismiss" élastique vers le bas pour fermer naturellement
 * - Mode plein écran immersif (masquage/affichage des commandes par simple tap)
 * - Fiche technique de précision (résolution native, ratio, contexte événement, téléchargement)
 */
export function Lightbox({
  src,
  images = [],
  initialIndex = 0,
  alt = '',
  eventTitle = "Détail de l'image",
  eventDate,
  eventLocation,
  onClose,
  onToast,
}: LightboxProps) {
  // Détermination de la liste unifiée d'images
  const allImages = useMemo(() => {
    return images.length > 0 ? images : src ? [src] : [];
  }, [images, src]);
  
  // Index de départ
  const resolveInitialIndex = () => {
    if (initialIndex >= 0 && initialIndex < allImages.length) return initialIndex;
    if (src && allImages.includes(src)) return allImages.indexOf(src);
    return 0;
  };

  const [currentIndex, setCurrentIndex] = useState<number>(resolveInitialIndex);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [showChrome, setShowChrome] = useState(true);
  const [showInfoSheet, setShowInfoSheet] = useState(false);
  const [imageMeta, setImageMeta] = useState<ImageMeta | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [pullY, setPullY] = useState(0);

  // Références d'interaction tactile
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);

  const currentImage = allImages[currentIndex] || src || '';

  // Préchargement des images adjacentes pour fluidité instantanée
  useEffect(() => {
    if (allImages.length <= 1) return;
    const nextIdx = (currentIndex + 1) % allImages.length;
    const prevIdx = (currentIndex - 1 + allImages.length) % allImages.length;
    
    const imgNext = new Image();
    imgNext.src = allImages[nextIdx];
    const imgPrev = new Image();
    imgPrev.src = allImages[prevIdx];
  }, [currentIndex, allImages]);

  // Réinitialiser le zoom lors du changement d'image
  useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setPullY(0);
    setIsPulling(false);
  }, [currentIndex]);

  // Extraction des métadonnées de l'image chargée
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth || 0;
    const h = img.naturalHeight || 0;
    if (w > 0 && h > 0) {
      const mp = ((w * h) / 1000000).toFixed(1);
      const ratio = w / h;
      let ratioLabel = 'Format Personnalisé';
      if (Math.abs(ratio - 1) < 0.05) ratioLabel = 'Carré 1:1';
      else if (Math.abs(ratio - 4 / 5) < 0.08) ratioLabel = 'Flyer Portrait 4:5';
      else if (Math.abs(ratio - 9 / 16) < 0.08) ratioLabel = 'Story / Écran 9:16';
      else if (Math.abs(ratio - 16 / 9) < 0.08) ratioLabel = 'Paysage 16:9';
      else if (Math.abs(ratio - 3 / 2) < 0.08) ratioLabel = 'Photo 3:2';

      // Extension devinée
      const cleanUrl = currentImage.split('?')[0].toLowerCase();
      const ext = cleanUrl.endsWith('.webp')
        ? 'WEBP'
        : cleanUrl.endsWith('.png')
        ? 'PNG'
        : cleanUrl.endsWith('.svg')
        ? 'SVG'
        : 'JPEG HD';

      setImageMeta({
        width: w,
        height: h,
        aspectRatio: ratioLabel,
        megaPixels: `${mp} MP`,
        format: ext,
      });
    }
  };

  // Fermeture sécurisée
  const handleClose = useCallback(() => {
    haptic.light();
    onClose();
  }, [onClose]);

  // Navigation vers l'image suivante
  const handleNext = useCallback(() => {
    if (allImages.length <= 1) return;
    haptic.selection();
    setCurrentIndex((prev) => (prev + 1) % allImages.length);
  }, [allImages.length]);

  // Navigation vers l'image précédente
  const handlePrev = useCallback(() => {
    if (allImages.length <= 1) return;
    haptic.selection();
    setCurrentIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  }, [allImages.length]);

  // Verrouiller le scroll du document et écouter le clavier
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === '+' || e.key === '=') {
        setScale((s) => Math.min(s + 0.5, 4));
      } else if (e.key === '-') {
        setScale((s) => Math.max(s - 0.5, 1));
      } else if (e.key === '0') {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      } else if (e.key === 'i' || e.key === 'I') {
        setShowInfoSheet((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClose, handleNext, handlePrev]);

  // Double-tap zoom logic
  const handleDoubleTap = (clientX: number, clientY: number) => {
    haptic.medium();
    if (scale > 1) {
      // Dézoom complet vers 1x
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    } else {
      // Zoom 2.5x centré sur le tap
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const tapX = clientX - rect.left - rect.width / 2;
        const tapY = clientY - rect.top - rect.height / 2;
        setScale(2.5);
        setTranslate({ x: -tapX * 0.8, y: -tapY * 0.8 });
      } else {
        setScale(2.5);
      }
    }
  };

  // Gestion des événements Pointer (touch & mouse unifiés)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    // Détection double-tap
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      lastTapRef.current = 0;
      handleDoubleTap(e.clientX, e.clientY);
      return;
    }
    lastTapRef.current = now;

    touchStartRef.current = { x: e.clientX, y: e.clientY, time: now };

    if (scale > 1) {
      panStartRef.current = {
        x: e.clientX - translate.x,
        y: e.clientY - translate.y,
      };
    } else {
      setIsPulling(true);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // Cas 1: Déplacement / Pan de l'image agrandie
    if (scale > 1 && panStartRef.current) {
      const maxTranslateX = (window.innerWidth * (scale - 1)) / 1.7;
      const maxTranslateY = (window.innerHeight * (scale - 1)) / 1.7;

      const rawX = e.clientX - panStartRef.current.x;
      const rawY = e.clientY - panStartRef.current.y;

      setTranslate({
        x: Math.max(-maxTranslateX, Math.min(maxTranslateX, rawX)),
        y: Math.max(-maxTranslateY, Math.min(maxTranslateY, rawY)),
      });
      return;
    }

    // Cas 2: Glissement vertical vers le bas pour fermer (Pull-to-dismiss) à 1x
    if (scale === 1 && touchStartRef.current && isPulling) {
      const deltaY = e.clientY - touchStartRef.current.y;
      if (deltaY > 0) {
        // Résistance élastique
        const dampedY = Math.pow(deltaY, 0.85);
        setPullY(dampedY);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    panStartRef.current = null;

    if (touchStartRef.current) {
      const deltaX = e.clientX - touchStartRef.current.x;
      const deltaY = e.clientY - touchStartRef.current.y;
      const duration = Date.now() - touchStartRef.current.time;

      // Si l'utilisateur a tiré vers le bas à 1x de plus de 90px -> Fermer
      if (scale === 1 && deltaY > 90) {
        haptic.light();
        onClose();
        return;
      }

      // Si swipe horizontal rapide à 1x -> Changer de photo
      if (scale === 1 && Math.abs(deltaX) > 60 && Math.abs(deltaY) < 40 && duration < 350) {
        if (deltaX < 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }

      // Tap simple dans le vide pour masquer/afficher l'interface
      if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && duration < 250) {
        setShowChrome((prev) => !prev);
      }
    }

    touchStartRef.current = null;
    setIsPulling(false);
    setPullY(0);
  };

  // Bascule du niveau de zoom pas-à-pas
  const cycleZoom = () => {
    haptic.selection();
    if (scale === 1) {
      setScale(2.5);
    } else if (scale < 3.5) {
      setScale(4);
    } else {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    }
  };

  // Copie ou partage de l'image
  const handleShare = async () => {
    haptic.light();
    if (navigator.share) {
      try {
        await navigator.share({
          title: eventTitle,
          text: `Affiche et visuels pour ${eventTitle} sur Gbaïgbancê`,
          url: currentImage,
        });
      } catch {
        // Ignorer si annulé par l'utilisateur
      }
    } else {
      navigator.clipboard.writeText(currentImage);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
      onToast?.({
        message: 'Lien du visuel copié dans le presse-papier !',
        type: 'success',
      });
    }
  };

  // Téléchargement direct du fichier haute définition
  const handleDownload = () => {
    haptic.success();
    const link = document.createElement('a');
    link.href = currentImage;
    link.download = `gbaigbance-${eventTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}-hd.jpg`;
    link.target = '_blank';
    link.rel = 'noreferrer noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onToast?.({
      message: 'Téléchargement du visuel haute précision lancé',
      type: 'success',
    });
  };

  // Calcul du style de transformation de l'image
  const imageTransform = scale > 1
    ? `translate(${translate.x}px, ${translate.y}px) scale(${scale})`
    : `translateY(${pullY}px) scale(${Math.max(0.85, 1 - pullY / 600)})`;

  // Opacité du fond lors du tirage vers le bas
  const backdropOpacity = Math.max(0.3, 1 - pullY / 300);

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Visionneuse d'image : ${eventTitle}`}
      className="fixed inset-0 z-[120] overflow-hidden select-none bg-[#07060D] touch-none transition-colors duration-200"
      style={{
        backgroundColor: `rgba(7, 6, 13, ${backdropOpacity})`,
      }}
    >
      {/* 
        HALO AMBIANT ADAPTATIF LIQUID GLASS (Apple Display Glow)
        Régénère l'ambiance colorimétrique derrière l'affiche
      */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-700"
        style={{ opacity: scale > 1 ? 0.15 : 0.4 }}
      >
        <img
          src={currentImage}
          alt=""
          className="w-full h-full object-cover blur-[100px] scale-125 saturate-200 brightness-75"
        />
        <div className="absolute inset-0 bg-radial from-transparent via-[#07060D]/70 to-[#07060D]" />
      </div>

      {/* 
        BARRE SUPÉRIEURE : EN-TÊTE LIQUID GLASS HAUTE PRÉCISION
        Positionnée scrupuleusement avec safe-area pour éviter TOUT conflit avec l'encoche
      */}
      <div
        className={`fixed left-0 right-0 z-30 pointer-events-none transition-all duration-300 ${
          showChrome ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
        }`}
        style={{
          top: 'max(0.75rem, calc(env(safe-area-inset-top, 0px) + 0.625rem))',
          paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
        }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 px-3">
          {/* Bouton Fermer (Circulaire 44px tactile iOS) */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fermer la vue précision"
            className="pointer-events-auto h-11 w-11 rounded-full bg-black/60 dark:bg-black/70 hover:bg-black/85 text-white backdrop-blur-2xl border border-white/20 flex items-center justify-center shadow-xl active:scale-90 transition-all cursor-pointer ring-1 ring-white/10"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Capsule centrale d'information */}
          <div className="pointer-events-auto min-w-0 max-w-[200px] sm:max-w-md px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-2xl border border-white/15 text-center shadow-xl flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#A855F7] shrink-0 hidden sm:block" />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-white truncate leading-tight">
                {eventTitle}
              </p>
              <p className="text-[10px] text-zinc-400 font-medium">
                {allImages.length > 1 ? `Visuel ${currentIndex + 1} sur ${allImages.length}` : 'Affiche officielle HD'}
              </p>
            </div>
          </div>

          {/* Cluster d'actions rapides (Zoom, Précision, Partage, Téléchargement) */}
          <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
            {/* Bouton Zoom pas-à-pas avec indicateur de pourcentage */}
            <button
              type="button"
              onClick={cycleZoom}
              aria-label={`Niveau de zoom actuel : ${Math.round(scale * 100)}%`}
              className="h-10 px-3 rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-2xl border border-white/15 flex items-center gap-1.5 shadow-lg active:scale-95 transition-all text-xs font-bold"
            >
              {scale === 1 ? (
                <ZoomIn className="w-4 h-4 text-purple-300" />
              ) : (
                <RotateCcw className="w-4 h-4 text-amber-300" />
              )}
              <span className="text-[11px] tabular-nums font-mono">{Math.round(scale * 100)}%</span>
            </button>

            {/* Fiche Précision (Info) */}
            <button
              type="button"
              onClick={() => {
                haptic.selection();
                setShowInfoSheet((prev) => !prev);
              }}
              aria-label="Afficher la fiche de précision"
              className={`h-10 w-10 rounded-full backdrop-blur-2xl border flex items-center justify-center shadow-lg active:scale-95 transition-all ${
                showInfoSheet
                  ? 'bg-[#6600FF] border-white/40 text-white shadow-[#6600FF]/40'
                  : 'bg-black/60 hover:bg-black/85 border-white/15 text-zinc-300'
              }`}
            >
              <Info className="w-4 h-4" />
            </button>

            {/* Partager */}
            <button
              type="button"
              onClick={handleShare}
              aria-label="Partager ce visuel"
              className="h-10 w-10 rounded-full bg-black/60 hover:bg-black/85 text-zinc-300 hover:text-white backdrop-blur-2xl border border-white/15 flex items-center justify-center shadow-lg active:scale-95 transition-all"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            {/* Télécharger */}
            <button
              type="button"
              onClick={handleDownload}
              aria-label="Télécharger en haute résolution"
              className="h-10 w-10 rounded-full bg-black/60 hover:bg-black/85 text-zinc-300 hover:text-white backdrop-blur-2xl border border-white/15 flex items-center justify-center shadow-lg active:scale-95 transition-all hidden sm:flex"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 
        ZONE CENTRALE D'AFFICHAGE ET MANIPULATION DE L'IMAGE
      */}
      <div
        className="w-full h-full flex items-center justify-center relative z-10"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImage}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full flex items-center justify-center p-3 sm:p-8"
          >
            <img
              src={currentImage}
              alt={alt || eventTitle}
              onLoad={handleImageLoad}
              draggable={false}
              className="max-w-full max-h-full object-contain select-none will-change-transform rounded-xl shadow-2xl transition-transform duration-75 ease-out"
              style={{
                transform: imageTransform,
                cursor: scale > 1 ? 'grab' : 'zoom-in',
                maxHeight: 'calc(100vh - 120px)',
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Chevrons latéraux de navigation (Visibles si plus d'une image) */}
        {allImages.length > 1 && showChrome && scale === 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              aria-label="Image précédente"
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-black/55 hover:bg-black/80 text-white backdrop-blur-2xl border border-white/15 flex items-center justify-center active:scale-90 transition-all shadow-2xl cursor-pointer ring-1 ring-white/10"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              aria-label="Image suivante"
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-black/55 hover:bg-black/80 text-white backdrop-blur-2xl border border-white/15 flex items-center justify-center active:scale-90 transition-all shadow-2xl cursor-pointer ring-1 ring-white/10"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </>
        )}
      </div>

      {/* 
        BARRE INFÉRIEURE : CARROUSEL FLOTTANT DE VIGNETTES
        Masqué lorsque l'utilisateur zoome pour préserver la précision visuelle
      */}
      {allImages.length > 1 && (
        <div
          className={`fixed left-0 right-0 z-30 pointer-events-none transition-all duration-300 flex justify-center px-4 ${
            showChrome && scale <= 1.2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
          }`}
          style={{
            bottom: 'max(1.25rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))',
          }}
        >
          <div className="pointer-events-auto max-w-md w-auto p-1.5 rounded-2xl bg-black/70 dark:bg-[#12101C]/85 backdrop-blur-2xl border border-white/15 shadow-2xl flex items-center gap-2 overflow-x-auto no-scrollbar ring-1 ring-white/10">
            {allImages.map((imgUrl, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <button
                  type="button"
                  key={imgUrl}
                  onClick={() => {
                    haptic.selection();
                    setCurrentIndex(idx);
                  }}
                  aria-label={`Aller au visuel ${idx + 1}`}
                  className={`relative shrink-0 h-14 w-14 sm:h-16 sm:w-16 rounded-xl overflow-hidden transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-[#7A1AFF] scale-105 shadow-[0_0_16px_rgba(122,26,255,0.7)]'
                      : 'opacity-55 hover:opacity-100 scale-95'
                  }`}
                >
                  <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                  {isSelected && (
                    <div className="absolute inset-0 bg-[#6600FF]/15 border border-white/30 rounded-xl" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 
        FICHE TECHNIQUE DE PRÉCISION (Feuille Liquid Glass coulissante)
      */}
      <AnimatePresence>
        {showInfoSheet && (
          <motion.div
            initial={{ y: 220, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 220, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="fixed left-0 right-0 z-40 flex justify-center px-4 pointer-events-none"
            style={{
              bottom: 'max(1rem, calc(env(safe-area-inset-bottom, 0px) + 0.625rem))',
            }}
          >
            <div className="pointer-events-auto w-full max-w-lg p-5 rounded-3xl bg-black/85 dark:bg-[#12101F]/90 backdrop-blur-3xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.75)] text-white space-y-4 ring-1 ring-white/10">
              {/* En-tête de la fiche */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#6600FF]/30 border border-[#6600FF]/50 flex items-center justify-center">
                    <Maximize2 className="w-3.5 h-3.5 text-purple-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white leading-tight">Fiche de Précision du Visuel</h3>
                    <p className="text-[11px] text-zinc-400">Qualité studio & métadonnées d'affichage</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    setShowInfoSheet(false);
                  }}
                  className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Grille de métadonnées visuelles */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-2xl bg-white/[0.05] border border-white/[0.08]">
                  <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Résolution native</p>
                  <p className="text-[13px] font-bold text-white mt-0.5 tabular-nums">
                    {imageMeta ? `${imageMeta.width} × ${imageMeta.height} px` : 'Chargement...'}
                  </p>
                  <span className="text-[10px] text-emerald-400 font-medium">
                    {imageMeta?.megaPixels || 'Qualité originale'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.05] border border-white/[0.08]">
                  <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Format d'affichage</p>
                  <p className="text-[13px] font-bold text-white mt-0.5">
                    {imageMeta?.aspectRatio || 'Proportions exactes'}
                  </p>
                  <span className="text-[10px] text-purple-300 font-medium">
                    Format : {imageMeta?.format || 'HD'}
                  </span>
                </div>
              </div>

              {/* Contexte de l'événement */}
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Visuel officiel certifié Gbaïgbancê</span>
                </div>
                <p className="text-xs font-bold text-white truncate">{eventTitle}</p>
                {(eventDate || eventLocation) && (
                  <p className="text-[11px] text-zinc-400 truncate">
                    {[eventDate, eventLocation].filter(Boolean).join(' • ')}
                  </p>
                )}
              </div>

              {/* Actions de la fiche */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(currentImage);
                    setCopiedLink(true);
                    haptic.success();
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedLink ? 'Lien copié !' : 'Copier le lien'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="py-2.5 px-3 rounded-xl bg-[#6600FF] hover:bg-[#5500DD] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-[#6600FF]/30"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger HD</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
