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
  { id: 'home', icon: Home, label: 'Accueil' },
  { id: 'explore', icon: Search, label: 'Explorer' },
];

const RIGHT_ITEMS: NavItem[] = [
  { id: 'tickets', icon: Ticket, label: 'Billets' },
  { id: 'favorites', icon: Heart, label: 'Favoris' },
];

export function BottomNav({ active, onNavigate, onCreate, ticketCount = 0, canCreate = false }: BottomNavProps) {
  const [pressed, setPressed] = useState<string | null>(null);

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = active === item.id;
    const showBadge = item.id === 'tickets' && ticketCount > 0 && !isActive;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onNavigate(item.id)}
        onPointerDown={() => setPressed(item.id)}
        onPointerUp={() => setPressed(null)}
        onPointerLeave={() => setPressed(null)}
        aria-current={isActive ? 'page' : undefined}
        aria-label={item.label}
        className={`relative flex items-center justify-center min-w-11 min-h-11 w-11 h-11 rounded-full transition-all duration-300 ${
          isActive ? 'nav-pill-active' : 'text-zinc-400 hover:text-zinc-600'
        } ${pressed === item.id ? 'scale-90' : 'scale-100'}`}
      >
        <Icon
          className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'text-white scale-110' : ''}`}
          strokeWidth={isActive ? 2.5 : 2}
        />
        {showBadge && (
          <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pop" />
        )}
      </button>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
      <nav className="bottom-nav flex items-center gap-1 px-2.5 py-2">
        {LEFT_ITEMS.map(renderItem)}

        {canCreate ? (
          <button
            type="button"
            onClick={onCreate}
            onPointerDown={() => setPressed('create')}
            onPointerUp={() => setPressed(null)}
            onPointerLeave={() => setPressed(null)}
            aria-label="Créer un événement"
            className={`nav-fab mx-2 w-12 h-12 rounded-full flex items-center justify-center animate-pulse-glow transition-transform duration-200 ${
              pressed === 'create' ? 'scale-90' : ''
            }`}
          >
            <Plus
              className={`w-6 h-6 text-white transition-transform duration-300 ${
                pressed === 'create' ? 'rotate-[135deg]' : 'rotate-0'
              }`}
              strokeWidth={2.5}
            />
          </button>
        ) : (
          <div className="mx-2 w-12 h-12" aria-hidden="true" />
        )}

        {RIGHT_ITEMS.map(renderItem)}
      </nav>
    </div>
  );
}
