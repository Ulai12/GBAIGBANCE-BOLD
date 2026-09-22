import React from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';

/**
 * GBAIGBANCE — EventCountdown (Tuiles en Verre Sombre Apple)
 * 
 * 4 tuiles élégantes en verre teinté sombre avec chiffres tabulaires (tabular-nums),
 * animation d'impulsion subtile sur les secondes à chaque tick,
 * et affichage soigné pour les événements « En cours » ou « Terminé ».
 */

interface CountdownProps {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isLiveNow?: boolean;
  hasEnded?: boolean;
  isValid?: boolean;
}

export const EventCountdown: React.FC<CountdownProps> = ({
  days,
  hours,
  minutes,
  seconds,
  isLiveNow = false,
  hasEnded = false,
  isValid = true,
}) => {
  if (hasEnded) {
    return (
      <div className="p-4 rounded-2xl bg-[#1A1A2E]/90 dark:bg-[#151226]/90 backdrop-blur-xl border border-white/10 text-white shadow-lg flex items-center justify-center gap-2.5">
        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        <span className="text-sm font-bold text-gray-200">
          Cet événement est désormais terminé.
        </span>
      </div>
    );
  }

  if (isLiveNow) {
    return (
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#6600FF]/30 via-[#1A1A2E]/90 to-[#6600FF]/30 backdrop-blur-xl border border-[#6600FF]/40 text-white shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <p className="text-sm font-black tracking-wide text-white uppercase">
            Événement en direct actuellement
          </p>
        </div>
        <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" />
      </div>
    );
  }

  const safeDays = Number.isFinite(days) ? Math.max(0, days) : 0;
  const safeHours = Number.isFinite(hours) ? Math.max(0, hours) : 0;
  const safeMinutes = Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;

  const units = [
    { label: 'Jours', value: safeDays, isSec: false },
    { label: 'Heures', value: safeHours, isSec: false },
    { label: 'Min', value: safeMinutes, isSec: false },
    { label: 'Sec', value: safeSeconds, isSec: true },
  ];

  return (
    <div className="p-3.5 sm:p-4 rounded-[24px] bg-white dark:bg-gradient-to-br dark:from-[#18132C] dark:via-[#110D24] dark:to-[#0B0818] text-[#1A1A2E] dark:text-white border border-black/10 dark:border-white/20 shadow-xl shadow-black/5 dark:shadow-black/20">
      <div className="flex items-center justify-between px-1 mb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#6600FF] dark:text-purple-200">
          <Sparkles className="w-3.5 h-3.5 text-[#6600FF] dark:text-[#A78BFA] animate-pulse" />
          <span>Début de l'événement dans</span>
        </div>
        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#6600FF]/10 text-[#6600FF] dark:bg-white/10 dark:text-purple-200 border border-[#6600FF]/15 dark:border-white/10">
          Temps réel
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:gap-2.5 text-center">
        {units.map((unit) => (
          <div
            key={unit.label}
            className="py-2.5 sm:py-3 px-1 rounded-2xl bg-zinc-50 dark:bg-white/[0.08] hover:bg-zinc-100 dark:hover:bg-white/[0.12] border border-black/5 dark:border-white/15 flex flex-col items-center justify-center transition-all shadow-2xs dark:shadow-inner"
          >
            <p
              key={unit.isSec ? unit.value : undefined}
              className={`text-2xl sm:text-3xl font-black text-[#1A1A2E] dark:text-white tabular-nums tracking-tight transition-transform duration-200 ${
                unit.isSec ? 'scale-[1.02]' : ''
              }`}
            >
              {isValid ? String(unit.value).padStart(2, '0') : '--'}
            </p>
            <p className="text-[11px] font-extrabold text-[#6600FF] dark:text-[#C084FC] uppercase mt-0.5 tracking-wider">
              {unit.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
