import { Home, Search, Ticket, Heart, Plus } from 'lucide-react';
import { useState } from 'react';

/**
 * Navigation principale de GBAIGBANCE.
 *
 * Direction visuelle :
 * - inspiration iOS / Liquid Glass ;
 * - barre flottante au-dessus du contenu ;
 * - icônes SF-like, simples et immédiatement reconnaissables ;
 * - sélection par "glass pill" plutôt qu'un gros bouton violet permanent ;
 * - animation douce et interruptible ;
 * - bouton central de création conservé, mais intégré à la hiérarchie visuelle.
 *
 * La structure respecte aussi la logique Apple :
 * une barre de navigation doit privilégier les zones principales
 * et rester lisible sans surcharger l'écran. [oai_citation:0‡Apple Developer](https://developer.apple.com/design/human-interface-guidelines/tab-views?utm_source=chatgpt.com)
 */

type Tab = 'home' | 'explore' | 'tickets' | 'favorites' | 'profile';

interface BottomNavProps {
  active: Tab;
  onNavigate: (tab: Tab) => void;
  onCreate: () => void;
  ticketCount?: number;
  canCreate?: boolean;
}

interface NavItem {
  id: Tab;
  icon: typeof Home;
  label: string;
}

const LEFT_ITEMS: NavItem[] = [
  {
    id: 'home',
    icon: Home,
    label: 'Accueil',
  },
  {
    id: 'explore',
    icon: Search,
    label: 'Explorer',
  },
];

const RIGHT_ITEMS: NavItem[] = [
  {
    id: 'tickets',
    icon: Ticket,
    label: 'Billets',
  },
  {
    id: 'favorites',
    icon: Heart,
    label: 'Favoris',
  },
];

export function BottomNav({
  active,
  onNavigate,
  onCreate,
  ticketCount = 0,
  canCreate = false,
}: BottomNavProps) {
  const [pressed, setPressed] = useState<string | null>(null);

  /**
   * Rend un item de navigation.
   *
   * L'état actif ne remplit plus simplement tout le bouton :
   * on crée une petite capsule "Liquid Glass" qui laisse davantage
   * respirer les autres icônes.
   */
  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = active === item.id;
    const showBadge =
      item.id === 'tickets' &&
      ticketCount > 0 &&
      !isActive;

    const isPressed = pressed === item.id;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onNavigate(item.id)}
        onPointerDown={() => setPressed(item.id)}
        onPointerUp={() => setPressed(null)}
        onPointerCancel={() => setPressed(null)}
        onPointerLeave={() => setPressed(null)}
        aria-current={isActive ? 'page' : undefined}
        aria-label={item.label}
        className={[
          'relative',
          'group',
          'w-[46px]',
          'h-[46px]',
          'rounded-full',
          'flex',
          'items-center',
          'justify-center',
          'transition-all',
          'duration-300',
          'ease-[cubic-bezier(.22,1,.36,1)]',
          isActive
            ? 'text-white'
            : 'text-zinc-500 hover:text-zinc-800',
          isPressed ? 'scale-[0.88]' : 'scale-100',
        ].join(' ')}
        style={{
          /**
           * On utilise une vraie sensation de matériau plutôt qu'une
           * couleur opaque : le contenu situé derrière peut légèrement
           * influencer la perception du verre.
           */
          background: isActive
            ? 'linear-gradient(145deg, rgba(102,0,255,0.94), rgba(124,58,237,0.82))'
            : 'rgba(255,255,255,0.16)',

          border: isActive
            ? '1px solid rgba(255,255,255,0.32)'
            : '1px solid transparent',

          boxShadow: isActive
            ? [
                '0 10px 26px rgba(102,0,255,0.22)',
                'inset 0 1px 0 rgba(255,255,255,0.38)',
                'inset 0 -1px 0 rgba(0,0,0,0.06)',
              ].join(', ')
            : 'none',

          backdropFilter: isActive
            ? 'blur(18px) saturate(1.35)'
            : 'blur(10px) saturate(1.15)',

          WebkitBackdropFilter: isActive
            ? 'blur(18px) saturate(1.35)'
            : 'blur(10px) saturate(1.15)',
        }}
      >
        {/* Halo très subtil lorsque l'élément devient actif */}
        <span
          aria-hidden="true"
          className={[
            'absolute',
            'inset-[-4px]',
            'rounded-full',
            'pointer-events-none',
            'transition-all',
            'duration-500',
            'ease-out',
            isActive
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-75',
          ].join(' ')}
          style={{
            background:
              'radial-gradient(circle, rgba(102,0,255,0.15), transparent 68%)',
            filter: 'blur(8px)',
          }}
        />

        <Icon
          className={[
            'relative',
            'z-10',
            'w-[21px]',
            'h-[21px]',
            'transition-all',
            'duration-300',
            'ease-[cubic-bezier(.22,1,.36,1)]',
            isActive
              ? 'scale-[1.06]'
              : 'scale-100 group-hover:scale-[1.04]',
          ].join(' ')}
          strokeWidth={isActive ? 2.45 : 2}
          fill={isActive && item.id === 'home' ? 'currentColor' : 'none'}
        />

        {/* Petit indicateur pour les billets non consultés */}
        {showBadge && (
          <span
            aria-label={`${ticketCount} nouveau${ticketCount > 1 ? 'x' : ''} billet${ticketCount > 1 ? 's' : ''}`}
            className="absolute top-[3px] right-[2px] z-20"
          >
            <span
              className="block w-[9px] h-[9px] rounded-full"
              style={{
                background: '#FF3B30',
                border: '2px solid rgba(255,255,255,0.92)',
                boxShadow: '0 2px 7px rgba(255,59,48,0.30)',
              }}
            />
          </span>
        )}

        {/* Tooltip desktop : volontairement discret et non intrusif */}
        <span
          className={[
            'pointer-events-none',
            'absolute',
            'bottom-[calc(100%+10px)]',
            'left-1/2',
            '-translate-x-1/2',
            'whitespace-nowrap',
            'rounded-full',
            'px-3',
            'py-1.5',
            'text-[11px]',
            'font-semibold',
            'opacity-0',
            'translate-y-1',
            'group-hover:opacity-100',
            'group-hover:translate-y-0',
            'transition-all',
            'duration-200',
            'hidden',
            'md:block',
          ].join(' ')}
          style={{
            background: 'rgba(24,24,30,0.86)',
            color: '#fff',
            boxShadow: '0 8px 22px rgba(0,0,0,0.14)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
          }}
        >
          {item.label}
        </span>
      </button>
    );
  };

  return (
    <>
      <style>
        {`
          /**
           * Animation du bouton central.
           *
           * Elle reste lente et organique : l'objectif est une impression
           * de matériau vivant, pas un bouton qui "clignote".
           */
          @keyframes gbaigbanceFabBreath {
            0%,
            100% {
              transform: scale(1);
            }

            50% {
              transform: scale(1.025);
            }
          }

          /**
           * Rotation très légère de l'icône "+" pendant le hover.
           */
          @keyframes gbaigbancePlusReveal {
            from {
              transform: rotate(0deg) scale(1);
            }

            to {
              transform: rotate(90deg) scale(1.04);
            }
          }

          /**
           * Éclat spéculaire du bouton central.
           */
          @keyframes gbaigbanceGlassSweep {
            0% {
              transform: translateX(-140%) rotate(20deg);
              opacity: 0;
            }

            25% {
              opacity: 0.32;
            }

            55% {
              opacity: 0.08;
            }

            100% {
              transform: translateX(160%) rotate(20deg);
              opacity: 0;
            }
          }

          /**
           * Respect de "Reduce Motion".
           * Apple recommande d'adapter les animations lorsque
           * l'utilisateur demande une expérience moins animée.
           */
          @media (prefers-reduced-motion: reduce) {
            .gbaigbance-nav-motion,
            .gbaigbance-nav-motion *,
            .gbaigbance-nav-sweep {
              animation: none !important;
              transition-duration: 0.01ms !important;
            }
          }
        `}
      </style>

      {/* 
        Conteneur fixe :
        - la barre flotte réellement au-dessus du contenu ;
        - elle ne colle pas directement au bord inférieur ;
        - prise en compte de la safe-area iOS.
      */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none">
        <nav
          aria-label="Navigation principale"
          className={[
            'gbaigbance-nav-motion',
            'pointer-events-auto',
            'relative',
            'flex',
            'items-center',
            'justify-center',
            'gap-[2px]',
            'px-[7px]',
            'py-[7px]',
            'mb-[10px]',
            'mx-4',
            'rounded-[30px]',
            'transition-all',
            'duration-500',
          ].join(' ')}
          style={{
            /**
             * Le matériau reprend la philosophie Liquid Glass :
             * translucide, dynamique, avec blur et highlights.
             * On évite volontairement un simple rectangle violet.
             */
            background: [
              'linear-gradient(',
              '180deg,',
              'rgba(255,255,255,0.68) 0%,',
              'rgba(255,255,255,0.43) 100%',
              ')',
            ].join(' '),

            border: '1px solid rgba(255,255,255,0.72)',

            boxShadow: [
              '0 18px 50px rgba(40,20,80,0.18)',
              '0 4px 14px rgba(40,20,80,0.08)',
              'inset 0 1px 0 rgba(255,255,255,0.94)',
              'inset 0 -1px 0 rgba(255,255,255,0.28)',
            ].join(', '),

            backdropFilter:
              'blur(28px) saturate(1.35)',

            WebkitBackdropFilter:
              'blur(28px) saturate(1.35)',

            /**
             * Important sur mobile :
             * on ne laisse jamais le contenu se retrouver sous
             * l'indicateur système de l'iPhone.
             */
            paddingBottom:
              'calc(7px + env(safe-area-inset-bottom))',
          }}
        >
          {/* 
            Reflet supérieur du verre.
            Il est volontairement très léger pour ne pas transformer
            la navigation en composant "bling".
          */}
          <span
            aria-hidden="true"
            className="absolute inset-x-[13%] top-0 h-px rounded-full pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.90), transparent)',
            }}
          />

          {LEFT_ITEMS.map(renderItem)}

          {/* 
            Séparation centrale.
            Cela donne au bouton de création un espace visuel clair
            sans casser la continuité de la barre.
          */}
          <div
            aria-hidden="true"
            className="w-[5px] shrink-0"
          />

          {canCreate ? (
            <button
              type="button"
              onClick={onCreate}
              onPointerDown={() => setPressed('create')}
              onPointerUp={() => setPressed(null)}
              onPointerCancel={() => setPressed(null)}
              onPointerLeave={() => setPressed(null)}
              aria-label="Créer un événement"
              className={[
                'gbaigbance-nav-motion',
                'group',
                'relative',
                'shrink-0',
                'w-[52px]',
                'h-[52px]',
                'mx-[2px]',
                'rounded-full',
                'flex',
                'items-center',
                'justify-center',
                'overflow-hidden',
                'transition-all',
                'duration-300',
                'ease-[cubic-bezier(.22,1,.36,1)]',
                pressed === 'create'
                  ? 'scale-[0.88]'
                  : 'scale-100',
              ].join(' ')}
              style={{
                /**
                 * Pas un simple fond #6600FF :
                 * plusieurs couches créent une profondeur proche
                 * d'un matériau physique.
                 */
                background: [
                  'linear-gradient(',
                  '145deg,',
                  '#8B5CF6 0%,',
                  '#6600FF 48%,',
                  '#5500D4 100%',
                  ')',
                ].join(' '),

                border:
                  '1px solid rgba(255,255,255,0.42)',

                boxShadow: [
                  '0 10px 28px rgba(102,0,255,0.34)',
                  '0 3px 10px rgba(102,0,255,0.16)',
                  'inset 0 1px 0 rgba(255,255,255,0.48)',
                  'inset 0 -4px 9px rgba(42,0,100,0.12)',
                ].join(', '),

                animation:
                  'gbaigbanceFabBreath 4.5s ease-in-out infinite',
              }}
            >
              {/* 
                Halo arrière du FAB.
              */}
              <span
                aria-hidden="true"
                className="absolute inset-[-14px] rounded-full pointer-events-none opacity-40"
                style={{
                  background:
                    'radial-gradient(circle, rgba(124,58,237,0.28), transparent 68%)',
                  filter: 'blur(13px)',
                }}
              />

              {/* 
                Reflet animé :
                une ligne lumineuse traverse lentement le verre.
              */}
              <span
                aria-hidden="true"
                className="gbaigbance-nav-sweep absolute top-[-70%] left-0 w-[55%] h-[240%] pointer-events-none"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)',
                  transform: 'rotate(20deg)',
                  animation:
                    'gbaigbanceGlassSweep 4.8s ease-in-out infinite',
                }}
              />

              {/* 
                Cercle intérieur :
                donne l'impression que le "+" est inscrit
                dans une lentille plutôt que posé sur le bouton.
              */}
              <span
                className="relative z-10 w-[34px] h-[34px] rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.04]"
                style={{
                  background:
                    'rgba(255,255,255,0.12)',
                  border:
                    '1px solid rgba(255,255,255,0.18)',
                  boxShadow:
                    'inset 0 1px 0 rgba(255,255,255,0.20)',
                }}
              >
                <Plus
                  className={[
                    'w-[22px]',
                    'h-[22px]',
                    'text-white',
                    'transition-transform',
                    'duration-300',
                    'ease-[cubic-bezier(.22,1,.36,1)]',
                    pressed === 'create'
                      ? 'rotate-[135deg]'
                      : 'rotate-0',
                    'group-hover:rotate-90',
                  ].join(' ')}
                  strokeWidth={2.45}
                />
              </span>
            </button>
          ) : (
            /**
             * Même largeur occupée quand la création est désactivée :
             * cela empêche les quatre items de se déplacer brusquement.
             */
            <div
              aria-hidden="true"
              className="w-[52px] h-[52px] mx-[2px] shrink-0"
            />
          )}

          <div
            aria-hidden="true"
            className="w-[5px] shrink-0"
          />

          {RIGHT_ITEMS.map(renderItem)}
        </nav>
      </div>
    </>
  );
}