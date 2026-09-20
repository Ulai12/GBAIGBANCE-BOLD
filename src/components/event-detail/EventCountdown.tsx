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
}

export const EventCountdown: React.FC<CountdownProps> = ({
  days,
  hours,
  minutes,
  seconds,
  isLiveNow = false,
  hasEnded = false,
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

  const units = [
    { label: 'Jours', value: days, isSec: false },
    { label: 'Heures', value: hours, isSec: false },
    { label: 'Min', value: minutes, isSec: false },
    { label: 'Sec', value: seconds, isSec: true },
  ];

  return (
    <div className="p-3.5 sm:p-4 rounded-[24px] bg-[#1A1A2E]/92 dark:bg-[#120F24]/92 backdrop-blur-2xl border border-white/15 shadow-xl">
      <div className="grid grid-cols-4 gap-2 sm:gap-2.5 text-center">
        {units.map((unit) => (
          <div
            key={unit.label}
            className="py-2 sm:py-2.5 px-1 rounded-2xl bg-white/[0.07] border border-white/[0.08] flex flex-col items-center justify-center transition-all"
          >
            <p
              key={unit.isSec ? unit.value : undefined}
              className={`text-xl sm:text-2xl font-black text-white tabular-nums tracking-tight transition-transform duration-200 ${
                unit.isSec ? 'scale-[1.02]' : ''
              }`}
            >
              {String(unit.value).padStart(2, '0')}
            </p>
            <p className="text-[10px] font-bold text-purple-200/75 uppercase mt-0.5 tracking-wider">
              {unit.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
