import {
  Home,
  Search,
  Ticket,
  Heart,
  Plus,
} from 'lucide-react';
import { useState } from 'react';
import { prefetchCreateEvent } from '@/utils/prefetchRoutes';
import { useApp } from '@/hooks/useApp';

/**
 * GBAIGBANCE — Navigation Dock (iOS 27 Fluid Architecture)
 *
 * Logique de rôle & ergonomie psychologique :
 * - Participants (canCreate === false) :
 *   Dock équilibré à 4 destinations réparties à 25% chacune :
 *   [Accueil] [Explorer] [Billets] [Favoris]
 *
 * - Créateurs & Artistes (canCreate === true) :
 *   Dock intégré à 5 colonnes avec le joyau d'action central dédié :
 *   [Accueil] [Explorer] [  (＋) Créer  ] [Billets] [Favoris]
 *   Le bouton central n'est PLUS superposé à l'aveugle sur les autres onglets.
 *   Il possède sa propre colonne, sa propre zone tactile et une élévation
 *   organique Apple Liquid Glass.
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
  labelFr: string;
  labelEn: string;
}

const NAV_ITEMS_LEFT: NavItem[] = [
  {
    id: 'home',
    icon: Home,
    labelFr: 'Accueil',
    labelEn: 'Home',
  },
  {
    id: 'explore',
    icon: Search,
    labelFr: 'Explorer',
    labelEn: 'Explore',
  },
];

const NAV_ITEMS_RIGHT: NavItem[] = [
  {
    id: 'tickets',
    icon: Ticket,
    labelFr: 'Billets',
    labelEn: 'Tickets',
  },
  {
    id: 'favorites',
    icon: Heart,
    labelFr: 'Favoris',
    labelEn: 'Favorites',
  },
];

export function BottomNav({
  active,
  onNavigate,
  onCreate,
  ticketCount = 0,
  canCreate = false,
}: BottomNavProps) {
  const { language, theme } = useApp();
  const [pressed, setPressed] = useState<string | null>(null);
  const isDark = theme === 'dark';

  const renderTabButton = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = active === item.id;
    const isPressed = pressed === item.id;
    const label = language === 'en' ? item.labelEn : item.labelFr;

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
        aria-label={label}
        aria-current={isActive ? 'page' : undefined}
        className={[
          'group relative flex-1 min-w-0 h-full flex flex-col items-center justify-center py-1 rounded-2xl select-none',
          'touch-manipulation transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] cursor-pointer',
          isPressed ? 'scale-[0.91]' : 'scale-100',
        ].join(' ')}
      >
        {/* Capsule active Liquid Glass */}
        <span
          aria-hidden="true"
          className={[
            'absolute inset-x-1 inset-y-1 rounded-xl pointer-events-none transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)]',
            isActive
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-75',
          ].join(' ')}
          style={{
            background: isDark
              ? 'linear-gradient(145deg, rgba(102,0,255,0.40), rgba(139,92,246,0.25))'
              : 'linear-gradient(145deg, rgba(102,0,255,0.12), rgba(139,92,246,0.06))',
            border: isDark
              ? '1px solid rgba(255,255,255,0.14)'
              : '1px solid rgba(102,0,255,0.18)',
            boxShadow: isDark
              ? '0 4px 14px rgba(102,0,255,0.25), inset 0 1px 0 rgba(255,255,255,0.2)'
              : '0 4px 12px rgba(102,0,255,0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        />

        {/* Halo ambiant actif */}
        {isActive && (
          <span
            aria-hidden="true"
            className="absolute -inset-1 rounded-full pointer-events-none blur-md transition-opacity duration-300"
            style={{
              background: 'radial-gradient(circle, rgba(102,0,255,0.20), transparent 70%)',
            }}
          />
        )}

        {/* Conteneur d'icône & badge */}
        <div className="relative z-10 flex items-center justify-center">
          <Icon
            className={[
              'w-5 h-5 transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)]',
              isActive
                ? 'text-[#6600FF] dark:text-purple-300 scale-110'
                : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200',
            ].join(' ')}
            strokeWidth={isActive ? 2.5 : 2}
            fill={isActive && (item.id === 'home' || item.id === 'favorites') ? 'currentColor' : 'none'}
          />

          {showTicketBadge && (
            <span
              aria-label={`${ticketCount} billet${ticketCount > 1 ? 's' : ''}`}
              className="absolute -top-1 -right-1 z-20 flex h-2.5 w-2.5"
            >
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 ring-2 ring-white dark:ring-[#14121E]" />
            </span>
          )}
        </div>

        {/* Micro-label ergonomique */}
        <span
          className={[
            'relative z-10 mt-1 text-[10px] font-bold tracking-tight transition-all duration-300 leading-none truncate max-w-full px-1',
            isActive
              ? 'text-[#6600FF] dark:text-purple-300 font-extrabold'
              : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300',
          ].join(' ')}
        >
          {label}
        </span>
      </button>
    );
  };

  const createLabel = language === 'en' ? 'Create' : 'Créer';

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center pointer-events-none px-4 pb-2.5">
      <nav
        aria-label="Navigation principale"
        className={[
          'relative pointer-events-auto w-full max-w-md h-[68px] px-2 py-1.5 rounded-[2.25rem]',
          'flex items-center transition-all duration-500 shadow-2xl backdrop-blur-2xl',
        ].join(' ')}
        style={{
          background: isDark
            ? 'linear-gradient(180deg, rgba(24,21,36,0.88), rgba(16,14,26,0.95))'
            : 'linear-gradient(180deg, rgba(255,255,255,0.92), rgba(245,243,255,0.85))',
          border: isDark
            ? '1px solid rgba(255,255,255,0.10)'
            : '1px solid rgba(255,255,255,0.85)',
          boxShadow: isDark
            ? '0 16px 40px rgba(0,0,0,0.45), 0 4px 12px rgba(102,0,255,0.15), inset 0 1px 0 rgba(255,255,255,0.15)'
            : '0 16px 36px rgba(102,0,255,0.12), 0 4px 14px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.95)',
          marginBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Filet de lumière supérieur */}
        <span
          aria-hidden="true"
          className="absolute left-[12%] right-[12%] top-0 h-px rounded-full pointer-events-none"
          style={{
            background: isDark
              ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)'
              : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent)',
          }}
        />

        {/* Grille dynamique proportionnée */}
        <div className={`w-full h-full grid ${canCreate ? 'grid-cols-5' : 'grid-cols-4'} items-center gap-1`}>
          {NAV_ITEMS_LEFT.map(renderTabButton)}

          {/* Bouton Créer intégré (Uniquement si Organisateur ou Artiste) */}
          {canCreate && (
            <div className="flex flex-col items-center justify-center h-full px-0.5">
              <button
                type="button"
                onClick={onCreate}
                onMouseEnter={prefetchCreateEvent}
                onTouchStart={prefetchCreateEvent}
                onPointerDown={() => setPressed('create')}
                onPointerUp={() => setPressed(null)}
                onPointerCancel={() => setPressed(null)}
                onPointerLeave={() => setPressed(null)}
                aria-label={createLabel}
                className={[
                  'group relative w-10 h-10 rounded-2xl flex items-center justify-center cursor-pointer select-none',
                  'transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] touch-manipulation',
                  pressed === 'create'
                    ? 'scale-[0.88] brightness-90'
                    : 'scale-100 hover:scale-105 active:scale-95',
                ].join(' ')}
                style={{
                  background: 'linear-gradient(135deg, #7C3AED 0%, #6600FF 55%, #4C1D95 100%)',
                  boxShadow: isDark
                    ? '0 6px 18px rgba(102,0,255,0.40), inset 0 1px 0 rgba(255,255,255,0.45)'
                    : '0 6px 16px rgba(102,0,255,0.30), inset 0 1px 0 rgba(255,255,255,0.55)',
                  border: '1px solid rgba(255,255,255,0.35)',
                }}
              >
                {/* Lueur d'ambiance */}
                <span
                  aria-hidden="true"
                  className="absolute -inset-1 rounded-2xl pointer-events-none opacity-60 blur-md"
                  style={{
                    background: 'radial-gradient(circle, rgba(124,58,237,0.4), transparent 70%)',
                  }}
                />

                <Plus
                  className="w-5 h-5 text-white transition-transform duration-300 group-hover:rotate-90"
                  strokeWidth={2.6}
                />
              </button>

              <span className="text-[9px] font-extrabold tracking-tight text-[#6600FF] dark:text-purple-300 mt-0.5 leading-none">
                {createLabel}
              </span>
            </div>
          )}

          {NAV_ITEMS_RIGHT.map(renderTabButton)}
        </div>
      </nav>
    </div>
  );
}
