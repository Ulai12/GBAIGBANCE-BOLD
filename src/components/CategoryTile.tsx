import type { LucideIcon } from 'lucide-react';

interface CategoryTileProps {
  Icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}

/**
 * Tuile de catégorie parente : conserve la présentation verticale sur les
 * écrans très étroits et passe en ligne dès que la largeur le permet.
 */
export function CategoryTile({ Icon, label, active, onClick }: CategoryTileProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex min-h-11 w-full max-w-[280px] min-w-0 flex-col items-center justify-center gap-1 justify-self-center rounded-2xl border px-2 py-1.5 text-center transition-[background-color,color,transform,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none active:scale-[0.98] motion-reduce:active:scale-100 min-[380px]:flex-row min-[380px]:justify-start min-[380px]:gap-2 min-[380px]:px-3 min-[380px]:text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#17131d] cursor-pointer ${
        active
          ? 'border-transparent bg-[#6600FF] text-white shadow-[0_6px_18px_rgba(102,0,255,0.22)]'
          : 'border-black/5 bg-white/90 text-[#6600FF] dark:border-white/10 dark:bg-white/10 dark:text-purple-300'
      }`}
    >
      <Icon
        aria-hidden="true"
        className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-[#6600FF] dark:text-purple-300'}`}
        strokeWidth={1.8}
      />
      <span
        className={`max-w-full min-w-0 break-words text-center text-[11px] font-semibold leading-tight min-[380px]:flex-1 min-[380px]:text-left sm:text-xs ${
          active ? 'text-white' : 'text-[#171726] dark:text-white'
        }`}
      >
        {label}
      </span>
    </button>
  );
}
