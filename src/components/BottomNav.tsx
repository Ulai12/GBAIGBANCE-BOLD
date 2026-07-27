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

export function BottomNav({ active, onNavigate, onCreate, ticketCount = 0, canCreate = false }: BottomNavProps) {
  const [pressed, setPressed] = useState<string | null>(null);
  const items: { id: Tab; icon: typeof Home; label?: string }[] = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'explore', icon: Search },
    { id: 'tickets', icon: Ticket, label: 'Tickets' },
    { id: 'favorites', icon: Heart },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4 px-4">
      <nav className="bottom-nav flex items-center gap-1 px-3 py-2.5">
        {items.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)} onMouseDown={() => setPressed(item.id)} onMouseUp={() => setPressed(null)} onMouseLeave={() => setPressed(null)} className={`relative flex items-center gap-2 px-4 py-2.5 transition-all duration-300 ${isActive ? 'nav-pill-active' : 'text-zinc-400 hover:text-zinc-600'} ${pressed === item.id ? 'scale-90' : 'scale-100'}`}>
              <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'text-white scale-110' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
              {isActive && item.label && <span className="text-sm font-bold text-white whitespace-nowrap animate-slide-in-right">{item.label}</span>}
            </button>
          );
        })}
        {canCreate ? (
          <button onClick={onCreate} onMouseDown={() => setPressed('create')} onMouseUp={() => setPressed(null)} onMouseLeave={() => setPressed(null)} className={`mx-1 w-12 h-12 rounded-full bg-gradient-to-br from-[#6600FF] to-[#9D4EDD] flex items-center justify-center shadow-lg shadow-[#6600FF]/30 hover:scale-110 active:scale-95 transition-transform animate-pulse-glow ${pressed === 'create' ? 'scale-90' : ''}`} aria-label="Créer un événement">
            <Plus className={`w-6 h-6 text-white transition-transform duration-300 ${pressed === 'create' ? 'rotate-135' : 'rotate-0'}`} strokeWidth={2.5} />
          </button>
        ) : <div className="mx-1 w-12 h-12" />}
        {items.slice(2).map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)} onMouseDown={() => setPressed(item.id)} onMouseUp={() => setPressed(null)} onMouseLeave={() => setPressed(null)} className={`relative flex items-center gap-2 px-4 py-2.5 transition-all duration-300 ${isActive ? 'nav-pill-active' : 'text-zinc-400 hover:text-zinc-600'} ${pressed === item.id ? 'scale-90' : 'scale-100'}`}>
              <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'text-white scale-110' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
              {isActive && item.label && <span className="text-sm font-bold text-white whitespace-nowrap animate-slide-in-right">{item.label}</span>}
              {item.id === 'tickets' && ticketCount > 0 && !isActive && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pop" />}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
