import {
  Home,
  Search,
  Ticket,
  Heart,
  Plus,
} from 'lucide-react';
import { useState } from 'react';

/**
 * GBAIGBANCE — Bottom Navigation
 *
 * Architecture inspirée de l'approche iOS 26 :
 *
 * ┌──────────────────────────────────────────┐
 * │   Home    Explore    Tickets    Favorites│  ← navigation
 * └──────────────────────────────────────────┘
 *                    ╭──────╮
 *                    │  ＋   │                 ← action
 *                    ╰──────╯
 *
 * Le bouton "+" n'est PAS une destination de navigation.
 * Il est traité comme une action indépendante, flottante
 * au-dessus de la Tab Bar.
 *
 * Conséquences :
 * - 4 onglets toujours parfaitement répartis ;
 * - aucune colonne réservée au "+" ;
 * - aucun "trou" lorsque canCreate === false ;
 * - le layout de la navigation reste identique selon le rôle ;
 * - l'action de création peut être ajoutée/retirée sans
 *   provoquer de déplacement brutal des onglets.
 */

type Tab =
  | 'home'
  | 'explore'
  | 'tickets'
  | 'favorites'
  | 'profile';

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

/**
 * Navigation principale.
 *
 * IMPORTANT :
 * Le bouton profile n'est volontairement pas ajouté ici,
 * car ton système actuel utilise quatre destinations principales.
 *
 * Si "profile" doit devenir un onglet principal plus tard,
 * ajoute-le ici et passe la navigation à 5 items.
 */
const NAV_ITEMS: NavItem[] = [
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
  /**
   * Permet de donner un retour tactile visuel immédiat
   * sans dépendre d'une grosse animation.
   */
  const [pressed, setPressed] = useState<string | null>(null);

  /**
   * Rend un onglet de navigation.
   *
   * Chaque item occupe exactement la même largeur :
   *
   * 25% | 25% | 25% | 25%
   *
   * Le bouton "+" ne participe jamais à ce calcul.
   */
  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = active === item.id;
    const isPressed = pressed === item.id;

    /**
     * Le badge est affiché uniquement lorsqu'il y a
     * effectivement quelque chose de nouveau à signaler.
     */
    const showTicketBadge =
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
        aria-label={item.label}
        aria-current={isActive ? 'page' : undefined}
        className={[
          'relative',
          'flex-1',
          'min-w-0',
          'h-full',
          'flex',
          'items-center',
          'justify-center',
          'rounded-full',
          'transition-all',
          'duration-300',
          'ease-[cubic-bezier(.22,1,.36,1)]',
          'touch-manipulation',
          isPressed ? 'scale-[0.91]' : 'scale-100',
        ].join(' ')}
      >
        {/*
          ------------------------------------------------------------
          INDICATEUR ACTIF
          ------------------------------------------------------------

          On utilise une petite capsule Liquid Glass à l'intérieur
          de la Tab Bar plutôt qu'une grosse zone violette occupant
          toute la hauteur de la navigation.
        */}
        <span
          aria-hidden="true"
          className={[
            'absolute',
            'inset-[3px]',
            'rounded-full',
            'pointer-events-none',
            'transition-all',
            'duration-300',
            'ease-[cubic-bezier(.22,1,.36,1)]',
            isActive
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-[0.72]',
          ].join(' ')}
          style={{
            background: isActive
              ? 'linear-gradient(145deg, rgba(139,92,246,0.96), rgba(102,0,255,0.92))'
              : 'transparent',

            border: isActive
              ? '1px solid rgba(255,255,255,0.38)'
              : '1px solid transparent',

            boxShadow: isActive
              ? [
                  '0 7px 18px rgba(102,0,255,0.18)',
                  'inset 0 1px 0 rgba(255,255,255,0.46)',
                  'inset 0 -2px 5px rgba(45,0,95,0.10)',
                ].join(', ')
              : 'none',
          }}
        />

        {/*
          ------------------------------------------------------------
          HALO TRÈS LÉGER
          ------------------------------------------------------------

          Donne de la profondeur à l'état actif sans tomber
          dans l'effet "neon glow".
        */}
        <span
          aria-hidden="true"
          className={[
            'absolute',
            'inset-[-5px]',
            'rounded-full',
            'pointer-events-none',
            'transition-opacity',
            'duration-500',
            isActive
              ? 'opacity-100'
              : 'opacity-0',
          ].join(' ')}
          style={{
            background:
              'radial-gradient(circle, rgba(102,0,255,0.13), transparent 68%)',
            filter: 'blur(9px)',
          }}
        />

        {/*
          ------------------------------------------------------------
          ICÔNE
          ------------------------------------------------------------
        */}
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
              ? 'text-white scale-[1.04]'
              : 'text-zinc-500 scale-100 group-hover:text-zinc-800',
          ].join(' ')}
          strokeWidth={isActive ? 2.45 : 2}
          fill={
            isActive && item.id === 'home'
              ? 'currentColor'
              : 'none'
          }
        />

        {/*
          ------------------------------------------------------------
          BADGE BILLETS
          ------------------------------------------------------------

          Le badge est indépendant de l'état actif.
          Il ne change donc jamais la géométrie de la Tab Bar.
        */}
        {showTicketBadge && (
          <span
            aria-label={`${ticketCount} billet${
              ticketCount > 1 ? 's' : ''
            }`}
            className="absolute top-[7px] right-[24%] z-20"
          >
            <span
              className="block w-[9px] h-[9px] rounded-full"
              style={{
                background: '#FF3B30',
                border:
                  '2px solid rgba(255,255,255,0.96)',
                boxShadow:
                  '0 2px 7px rgba(255,59,48,0.25)',
              }}
            />
          </span>
        )}

        {/*
          ------------------------------------------------------------
          TOOLTIP DESKTOP
          ------------------------------------------------------------

          Invisible sur mobile.
        */}
        <span
          className={[
            'pointer-events-none',
            'absolute',
            'bottom-[calc(100%+12px)]',
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
            background:
              'rgba(26,26,32,0.88)',
            color: '#FFFFFF',
            boxShadow:
              '0 8px 24px rgba(0,0,0,0.14)',
            backdropFilter:
              'blur(14px)',
            WebkitBackdropFilter:
              'blur(14px)',
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
           * =========================================================
           * CREATE ACTION — iOS 26 INSPIRED MOTION
           * =========================================================
           *
           * Le bouton de création reste subtilement "vivant".
           * Il ne pulse pas rapidement : le mouvement doit donner
           * une sensation de matériau, pas attirer constamment
           * l'attention de l'utilisateur.
           */

          @keyframes gbaigbanceCreateBreathing {
            0%,
            100% {
              transform:
                translate(-50%, -50%)
                scale(1);
            }

            50% {
              transform:
                translate(-50%, -50%)
                scale(1.025);
            }
          }

          /*
           * Reflet spéculaire.
           *
           * Le reflet passe lentement sur la surface du bouton
           * comme une lumière qui glisse sur du verre.
           */
          @keyframes gbaigbanceCreateReflection {
            0% {
              transform:
                translateX(-160%)
                rotate(20deg);
              opacity: 0;
            }

            20% {
              opacity: 0.28;
            }

            50% {
              opacity: 0.08;
            }

            100% {
              transform:
                translateX(190%)
                rotate(20deg);
              opacity: 0;
            }
          }

          /*
           * Petite rotation du "+" lorsque l'utilisateur survole
           * le bouton sur desktop.
           */
          @keyframes gbaigbancePlusHover {
            from {
              transform:
                rotate(0deg)
                scale(1);
            }

            to {
              transform:
                rotate(90deg)
                scale(1.04);
            }
          }

          /*
           * Accessibilité :
           * les animations sont réduites lorsque le système demande
           * explicitement moins de mouvement.
           */
          @media (prefers-reduced-motion: reduce) {
            .gbaigbance-create-motion,
            .gbaigbance-create-reflection {
              animation: none !important;
              transition-duration: 0.01ms !important;
            }
          }
        `}
      </style>

      {/*
        ==============================================================
        CONTENEUR DE NAVIGATION
        ==============================================================

        La barre est flottante au-dessus du contenu.
        On ne l'étend volontairement PAS jusqu'aux bords de l'écran :
        cela donne une lecture plus proche d'une surface système
        flottante que d'une barre web collée au viewport.
      */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none">
        <nav
          aria-label="Navigation principale"
          className={[
            'relative',
            'pointer-events-auto',
            'w-[calc(100%-24px)]',
            'max-w-[500px]',
            'h-[78px]',
            'mb-[10px]',
            'px-[8px]',
            'py-[8px]',
            'rounded-[39px]',
            'flex',
            'items-center',
            'transition-all',
            'duration-500',
          ].join(' ')}
          style={{
            /*
             * --------------------------------------------------------
             * LIQUID GLASS
             * --------------------------------------------------------
             *
             * On réutilise les variables globales lorsqu'elles
             * existent dans l'index.css de GBAIGBANCE.
             *
             * Aucun violet ici :
             * le matériau lui-même doit rester neutre.
             */
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.74), rgba(255,255,255,0.47))',

            border:
              '1px solid rgba(255,255,255,0.80)',

            backdropFilter:
              'blur(30px) saturate(1.35)',

            WebkitBackdropFilter:
              'blur(30px) saturate(1.35)',

            boxShadow: [
              '0 22px 60px rgba(38,20,70,0.16)',
              '0 5px 18px rgba(38,20,70,0.07)',
              'inset 0 1px 0 rgba(255,255,255,0.96)',
              'inset 0 -1px 0 rgba(255,255,255,0.28)',
            ].join(', '),

            /*
             * La safe area ne modifie pas la géométrie interne.
             */
            marginBottom:
              'calc(10px + env(safe-area-inset-bottom))',
          }}
        >
          {/*
            ==========================================================
            HIGHLIGHT SUPÉRIEUR
            ==========================================================

            Une seule ligne de lumière.
            Cela permet de comprendre immédiatement que la surface
            est translucide.
          */}
          <span
            aria-hidden="true"
            className="absolute left-[15%] right-[15%] top-0 h-px rounded-full pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.92), transparent)',
            }}
          />

          {/*
            ==========================================================
            NAVIGATION — TOUJOURS 4 ITEMS
            ==========================================================

            C'est le cœur de la correction.

            Le grid reste 4 colonnes dans TOUS les rôles :

            ┌────┬────┬────┬────┐
            │ 25 │ 25 │ 25 │ 25 │
            └────┴────┴────┴────┘

            Le "+" n'occupe aucune de ces colonnes.
          */}
          <div
            className="grid grid-cols-4 w-full h-full gap-[2px]"
          >
            {NAV_ITEMS.map(renderNavItem)}
          </div>

          {/*
            ==========================================================
            CREATE ACTION / TAB BAR ACCESSORY
            ==========================================================

            Le bouton est un ACCESSOIRE FLOATING.
            Il est positionné en dehors du flux du grid.

            Donc :
              canCreate = true
                → les 4 onglets gardent exactement leur géométrie

              canCreate = false
                → le bouton disparaît complètement

            AUCUN espace blanc.
            AUCUNE colonne fantôme.
            AUCUN déplacement des onglets.
          */}
          {canCreate && (
            <button
              type="button"
              onClick={onCreate}
              onPointerDown={() => setPressed('create')}
              onPointerUp={() => setPressed(null)}
              onPointerCancel={() => setPressed(null)}
              onPointerLeave={() => setPressed(null)}
              aria-label="Créer un événement"
              className={[
                'gbaigbance-create-motion',
                'group',
                'absolute',
                'left-1/2',
                'top-[50%]',
                '-translate-x-1/2',
                '-translate-y-1/2',
                'w-[56px]',
                'h-[56px]',
                'rounded-full',
                'z-40',
                'flex',
                'items-center',
                'justify-center',
                'overflow-hidden',
                'touch-manipulation',
                'transition-all',
                'duration-250',
                'ease-[cubic-bezier(.22,1,.36,1)]',
                pressed === 'create'
                  ? 'scale-[0.86]'
                  : 'scale-100',
              ].join(' ')}
              style={{
                /*
                 * Couleur réservée exclusivement à l'action primaire.
                 */
                background:
                  'linear-gradient(145deg, #8B5CF6 0%, #6600FF 48%, #5500D4 100%)',

                border:
                  '1px solid rgba(255,255,255,0.44)',

                boxShadow: [
                  '0 14px 34px rgba(102,0,255,0.34)',
                  '0 5px 13px rgba(102,0,255,0.14)',
                  'inset 0 1px 0 rgba(255,255,255,0.52)',
                  'inset 0 -5px 10px rgba(40,0,95,0.12)',
                ].join(', '),

                animation:
                  'gbaigbanceCreateBreathing 4.8s ease-in-out infinite',
              }}
            >
              {/*
                Halo externe.
              */}
              <span
                aria-hidden="true"
                className="absolute inset-[-16px] rounded-full pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle, rgba(124,58,237,0.24), transparent 68%)',
                  filter: 'blur(14px)',
                }}
              />

              {/*
                Reflet animé du Liquid Glass.
              */}
              <span
                aria-hidden="true"
                className="gbaigbance-create-reflection absolute top-[-80%] left-0 w-[52%] h-[260%] pointer-events-none"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(255,255,255,0.30), transparent)',
                  animation:
                    'gbaigbanceCreateReflection 5s ease-in-out infinite',
                }}
              />

              {/*
                Lentille interne.
                Elle donne au "+" une profondeur supplémentaire.
              */}
              <span
                className={[
                  'relative',
                  'z-10',
                  'w-[37px]',
                  'h-[37px]',
                  'rounded-full',
                  'flex',
                  'items-center',
                  'justify-center',
                  'transition-all',
                  'duration-300',
                  'ease-[cubic-bezier(.22,1,.36,1)]',
                  pressed === 'create'
                    ? 'scale-[0.90] rotate-[135deg]'
                    : 'scale-100 rotate-0',
                  'group-hover:scale-[1.05]',
                  'group-hover:rotate-90',
                ].join(' ')}
                style={{
                  background:
                    'rgba(255,255,255,0.13)',

                  border:
                    '1px solid rgba(255,255,255,0.22)',

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
          )}
        </nav>
      </div>
    </>
  );
}