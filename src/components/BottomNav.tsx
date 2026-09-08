import { Home, Search, Ticket, Heart, Plus } from 'lucide-react';
import { useState } from 'react';

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
   * Important :
   * Les items ne dépendent PAS de l'existence du bouton "+".
   * Cela permet aux profils sans permission de création
   * de conserver exactement la même largeur de barre,
   * sans trou artificiel au centre.
   */
  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = active === item.id;
    const isPressed = pressed === item.id;

    const showBadge =
      item.id === 'tickets' &&
      ticketCount > 0 &&
      !isActive;

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
          'group',
          'relative',
          'flex',
          'items-center',
          'justify-center',
          'w-full',
          'h-[54px]',
          'rounded-full',
          'transition-all',
          'duration-300',
          'ease-[cubic-bezier(.22,1,.36,1)]',
          isPressed ? 'scale-[0.90]' : 'scale-100',
        ].join(' ')}
        style={{
          color: isActive
            ? '#FFFFFF'
            : 'rgba(82,82,91,0.90)',

          /**
           * L'état actif est une capsule indépendante.
           * On évite volontairement de faire ressembler toute
           * la navigation à un gros bouton violet.
           */
          background: isActive
            ? 'linear-gradient(145deg, rgba(139,92,246,0.98), rgba(102,0,255,0.94))'
            : 'transparent',

          border: isActive
            ? '1px solid rgba(255,255,255,0.30)'
            : '1px solid transparent',

          boxShadow: isActive
            ? [
                '0 10px 24px rgba(102,0,255,0.22)',
                'inset 0 1px 0 rgba(255,255,255,0.42)',
                'inset 0 -2px 5px rgba(56,0,120,0.10)',
              ].join(', ')
            : 'none',

          backdropFilter: isActive
            ? 'blur(18px) saturate(1.30)'
            : undefined,

          WebkitBackdropFilter: isActive
            ? 'blur(18px) saturate(1.30)'
            : undefined,
        }}
      >
        {/* 
          Petit halo derrière l'onglet actif.
          Il reste discret afin de conserver une esthétique
          proche d'iOS plutôt qu'un effet néon.
        */}
        <span
          aria-hidden="true"
          className={[
            'absolute',
            'inset-[-5px]',
            'rounded-full',
            'pointer-events-none',
            'transition-all',
            'duration-500',
            isActive
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-75',
          ].join(' ')}
          style={{
            background:
              'radial-gradient(circle, rgba(102,0,255,0.16), transparent 68%)',
            filter: 'blur(10px)',
          }}
        />

        {/* Icône principale */}
        <Icon
          className={[
            'relative',
            'z-10',
            'w-[22px]',
            'h-[22px]',
            'transition-all',
            'duration-300',
            'ease-[cubic-bezier(.22,1,.36,1)]',
            isActive
              ? 'scale-[1.05]'
              : 'scale-100 group-hover:scale-[1.04]',
          ].join(' ')}
          strokeWidth={isActive ? 2.5 : 2}
          fill={
            isActive && item.id === 'home'
              ? 'currentColor'
              : 'none'
          }
        />

        {/* 
          Badge de notification.
          Il reste positionné sur l'item lui-même :
          aucun déplacement provoqué par le "+".
        */}
        {showBadge && (
          <span
            aria-label={`${ticketCount} billet${
              ticketCount > 1 ? 's' : ''
            }`}
            className="absolute top-[6px] right-[22%] z-20"
          >
            <span
              className="block w-[9px] h-[9px] rounded-full"
              style={{
                background: '#FF3B30',
                border: '2px solid rgba(255,255,255,0.95)',
                boxShadow:
                  '0 2px 7px rgba(255,59,48,0.28)',
              }}
            />
          </span>
        )}

        {/* 
          Tooltip uniquement sur desktop.
          On ne l'affiche pas sur mobile afin de ne pas
          perturber les interactions tactiles.
        */}
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
            background: 'rgba(25,25,30,0.88)',
            color: '#FFFFFF',
            boxShadow:
              '0 8px 22px rgba(0,0,0,0.14)',
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
          /*
           * Respiration très légère du bouton "+".
           * L'animation est volontairement lente pour donner
           * une sensation de matériau vivant.
           */
          @keyframes gbaigbanceFabBreathing {
            0%,
            100% {
              transform: scale(1);
            }

            50% {
              transform: scale(1.025);
            }
          }

          /*
           * Reflet spéculaire du bouton "+".
           */
          @keyframes gbaigbanceFabSweep {
            0% {
              transform: translateX(-150%) rotate(20deg);
              opacity: 0;
            }

            25% {
              opacity: 0.35;
            }

            55% {
              opacity: 0.08;
            }

            100% {
              transform: translateX(170%) rotate(20deg);
              opacity: 0;
            }
          }

          /*
           * Respect du réglage système Reduce Motion.
           */
          @media (prefers-reduced-motion: reduce) {
            .gbaigbance-fab-motion,
            .gbaigbance-fab-sweep {
              animation: none !important;
              transition-duration: 0.01ms !important;
            }
          }
        `}
      </style>

      {/* 
        Conteneur flottant global.
        La safe-area est séparée du contenu de la barre
        afin que la navigation reste naturellement flottante.
      */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none">
        <nav
          aria-label="Navigation principale"
          className={[
            'pointer-events-auto',
            'relative',
            'flex',
            'items-center',
            'w-[calc(100%-28px)]',
            'max-w-[460px]',
            'h-[76px]',
            'mb-[10px]',
            'px-[10px]',
            'rounded-[38px]',
            'transition-all',
            'duration-500',
          ].join(' ')}
          style={{
            /**
             * Barre plus large que l'ancienne :
             *
             * Ancienne logique :
             * 5 éléments serrés dans une petite largeur.
             *
             * Nouvelle logique :
             * les 4 destinations disposent d'un vrai espace.
             */
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0.48))',

            border:
              '1px solid rgba(255,255,255,0.76)',

            boxShadow: [
              '0 22px 55px rgba(40,20,80,0.17)',
              '0 7px 20px rgba(40,20,80,0.08)',
              'inset 0 1px 0 rgba(255,255,255,0.95)',
              'inset 0 -1px 0 rgba(255,255,255,0.25)',
            ].join(', '),

            backdropFilter:
              'blur(30px) saturate(1.35)',

            WebkitBackdropFilter:
              'blur(30px) saturate(1.35)',

            /**
             * La safe-area est intégrée au déplacement de la barre,
             * pas dans la hauteur visuelle du composant.
             */
            marginBottom:
              'calc(10px + env(safe-area-inset-bottom))',
          }}
        >
          {/* Reflet supérieur du matériau */}
          <span
            aria-hidden="true"
            className="absolute left-[14%] right-[14%] top-0 h-px rounded-full pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.92), transparent)',
            }}
          />

          {/*
            ==========================================================
            CAS 1 — PROFIL AVEC PERMISSION DE CRÉATION
            ==========================================================

            Les quatre destinations restent réparties normalement.
            Le "+" est placé ABSOLUMENT au centre.

            Résultat :
            - aucun élément écrasé ;
            - aucun espace vide réservé ;
            - le "+" flotte au-dessus de la barre ;
            - esthétique beaucoup plus proche des interfaces Apple.
          */}
          {canCreate ? (
            <>
              {/* Groupe gauche */}
              <div className="grid grid-cols-2 flex-1 h-full gap-[2px]">
                {LEFT_ITEMS.map(renderItem)}
              </div>

              {/* 
                Espace visuel central volontairement très petit.
                Le bouton est en position absolute, donc ceci
                ne réserve PAS une colonne fantôme.
              */}
              <div
                aria-hidden="true"
                className="w-[10px] shrink-0"
              />

              {/* Groupe droit */}
              <div className="grid grid-cols-2 flex-1 h-full gap-[2px]">
                {RIGHT_ITEMS.map(renderItem)}
              </div>

              {/* 
                FAB CENTRAL
                --------------------
                Il ne participe PAS au layout.
                Il flotte donc au-dessus de celui-ci.
              */}
              <button
                type="button"
                onClick={onCreate}
                onPointerDown={() => setPressed('create')}
                onPointerUp={() => setPressed(null)}
                onPointerCancel={() => setPressed(null)}
                onPointerLeave={() => setPressed(null)}
                aria-label="Créer un événement"
                className={[
                  'gbaigbance-fab-motion',
                  'group',
                  'absolute',
                  'left-1/2',
                  'top-1/2',
                  '-translate-x-1/2',
                  '-translate-y-1/2',
                  'w-[54px]',
                  'h-[54px]',
                  'rounded-full',
                  'flex',
                  'items-center',
                  'justify-center',
                  'overflow-hidden',
                  'z-30',
                  'transition-all',
                  'duration-300',
                  'ease-[cubic-bezier(.22,1,.36,1)]',
                  pressed === 'create'
                    ? 'scale-[0.88]'
                    : 'scale-100',
                ].join(' ')}
                style={{
                  background:
                    'linear-gradient(145deg, #8B5CF6 0%, #6600FF 48%, #5500D4 100%)',

                  border:
                    '1px solid rgba(255,255,255,0.44)',

                  boxShadow: [
                    '0 12px 30px rgba(102,0,255,0.34)',
                    '0 4px 12px rgba(102,0,255,0.14)',
                    'inset 0 1px 0 rgba(255,255,255,0.50)',
                    'inset 0 -5px 10px rgba(42,0,100,0.12)',
                  ].join(', '),

                  animation:
                    'gbaigbanceFabBreathing 4.5s ease-in-out infinite',
                }}
              >
                {/* Halo externe */}
                <span
                  aria-hidden="true"
                  className="absolute inset-[-15px] rounded-full pointer-events-none opacity-45"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(124,58,237,0.25), transparent 68%)',
                    filter: 'blur(13px)',
                  }}
                />

                {/* Reflet animé */}
                <span
                  aria-hidden="true"
                  className="gbaigbance-fab-sweep absolute top-[-80%] left-0 w-[55%] h-[250%] pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, rgba(255,255,255,0.30), transparent)',
                    transform: 'rotate(20deg)',
                    animation:
                      'gbaigbanceFabSweep 4.8s ease-in-out infinite',
                  }}
                />

                {/* Lentille interne */}
                <span
                  className={[
                    'relative',
                    'z-10',
                    'w-[36px]',
                    'h-[36px]',
                    'rounded-full',
                    'flex',
                    'items-center',
                    'justify-center',
                    'transition-transform',
                    'duration-300',
                    pressed === 'create'
                      ? 'rotate-[135deg] scale-90'
                      : 'rotate-0 scale-100',
                    'group-hover:scale-[1.06]',
                    'group-hover:rotate-90',
                  ].join(' ')}
                  style={{
                    background:
                      'rgba(255,255,255,0.13)',

                    border:
                      '1px solid rgba(255,255,255,0.20)',

                    boxShadow:
                      'inset 0 1px 0 rgba(255,255,255,0.22)',
                  }}
                >
                  <Plus
                    className="w-[23px] h-[23px] text-white"
                    strokeWidth={2.45}
                  />
                </span>
              </button>
            </>
          ) : (
            /*
              ========================================================
              CAS 2 — PROFIL SANS PERMISSION DE CRÉATION
              ========================================================

              C'est ici que l'ancien composant avait le gros trou.

              AVANT :
                  Home | Explore | [  VIDE  ] | Tickets | Favorites

              MAINTENANT :
                  Home | Explore | Tickets | Favorites

              Les quatre éléments prennent réellement toute la largeur.
            */
            <div className="grid grid-cols-4 w-full h-full gap-[2px]">
              {[
                ...LEFT_ITEMS,
                ...RIGHT_ITEMS,
              ].map(renderItem)}
            </div>
          )}
        </nav>
      </div>
    </>
  );
}