import React from 'react';
import { Ticket, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import type { TicketOption, Event } from '@/types';

/**
 * GBAIGBANCE — EventTicketsList (Liquid Glass Passes & Billetterie)
 * 
 * Affiche la liste des formules de pass avec :
 * - Design verre iOS avec liseré supérieur spéculaire
 * - Badge de catégorie de pass (VVIP, VIP, Pass Jour, etc.)
 * - Barre de progression des quotas (avec alerte ambre sous 20% restants)
 * - Badges des moyens de paiement d'Afrique de l'Ouest (Flooz, T-Money, MoMo, Carte)
 * - Gestion propre des états épuisé / complet et désactivation si événement terminé.
 */

interface EventTicketsListProps {
  event: Event;
  ticketOptions: TicketOption[];
  canBook: boolean;
  onSelectPass: (optionId: string) => void;
}

export const EventTicketsList: React.FC<EventTicketsListProps> = ({
  event,
  ticketOptions,
  canBook,
  onSelectPass,
}) => {
  const formatPrice = (price: number) => {
    if (price === 0) return 'Gratuit';
    return `${price.toLocaleString('fr-FR')} FCFA`;
  };

  return (
    <div className="pt-2 space-y-3.5">
      {/* En-tête de section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#1A1A2E] dark:text-white">
          <div className="w-8 h-8 rounded-xl bg-[#6600FF]/10 text-[#6600FF] dark:text-purple-400 flex items-center justify-center shrink-0">
            <Ticket className="w-4 h-4" />
          </div>
          <h2 className="text-base font-black tracking-tight">
            Pass & Billets disponibles
          </h2>
        </div>
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 px-2.5 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
          {ticketOptions.length} formule{ticketOptions.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Si aucune formule spécifique n'est configurée, affichage du tarif de base */}
      {ticketOptions.length === 0 ? (
        <div className="p-5 rounded-[22px] glass-ios text-center space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">
            Tarif d'entrée générale
          </p>
          <p className="text-xl font-black text-[#1A1A2E] dark:text-white">
            {formatPrice(event.price_min)}
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Placement libre lors de l'accès au site</span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {ticketOptions.map((opt, index) => {
            const total = opt.quantity_total || 100;
            const sold = opt.quantity_sold || 0;
            const remaining = Math.max(0, total - sold);
            const percentRemaining = total > 0 ? (remaining / total) * 100 : 0;
            const isSoldOut = remaining <= 0;
            const isLowStock = !isSoldOut && percentRemaining <= 20;
            // Met en avant la première formule ou celle marquée populaire
            const isPopular = index === 0 && ticketOptions.length > 1;

            return (
              <div
                key={opt.id}
                className={`relative p-4 sm:p-5 rounded-[24px] transition-all overflow-hidden ${
                  isSoldOut
                    ? 'bg-gray-100/70 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 opacity-65'
                    : 'glass-ios hover:border-[#6600FF]/50 dark:hover:border-[#6600FF]/50 shadow-sm'
                }`}
              >
                {/* Ruban Populaire optionnel */}
                {isPopular && !isSoldOut && (
                  <div className="absolute top-0 right-6 -translate-y-1/2">
                    <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm">
                      <Sparkles className="w-2.5 h-2.5" />
                      Populaire
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-extrabold text-[#1A1A2E] dark:text-white">
                        {opt.label}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#6600FF]/10 dark:bg-[#6600FF]/25 text-[#6600FF] dark:text-purple-300 border border-[#6600FF]/20">
                        {opt.ticket_type}
                      </span>
                    </div>

                    {opt.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed pr-2">
                        {opt.description}
                      </p>
                    )}
                  </div>

                  {/* Prix du pass */}
                  <div className="text-right shrink-0">
                    <p className="text-lg font-black text-[#1A1A2E] dark:text-white">
                      {formatPrice(opt.price)}
                    </p>
                    {/* Moyens de paiement locaux acceptés */}
                    <div className="flex items-center justify-end gap-1 mt-1 text-[9px] font-bold text-gray-400 dark:text-gray-400 uppercase">
                      <span className="px-1 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.06]">T-Money</span>
                      <span className="px-1 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.06]">Flooz</span>
                      <span className="px-1 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.06]">MoMo</span>
                    </div>
                  </div>
                </div>

                {/* Jauge des places restantes */}
                <div className="mt-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    {isSoldOut ? (
                      <span className="font-bold text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Guichet complet / Épuisé
                      </span>
                    ) : (
                      <span
                        className={`font-bold flex items-center gap-1.5 ${
                          isLowStock
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {remaining} place{remaining > 1 ? 's' : ''} restante{remaining > 1 ? 's' : ''}
                        </span>
                        {isLowStock && (
                          <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10">
                            Dernières places !
                          </span>
                        )}
                      </span>
                    )}

                    <span className="text-[11px] font-medium text-gray-400">
                      sur {total}
                    </span>
                  </div>

                  {/* Barre de progression des stocks */}
                  {!isSoldOut && (
                    <div className="w-full h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isLowStock
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                            : 'bg-[#6600FF]'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(8, percentRemaining))}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Bouton d'action Réserver */}
                <div className="mt-4 pt-3 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    Billet électronique avec QR Code sécurisé
                  </span>

                  <button
                    type="button"
                    disabled={!canBook || isSoldOut}
                    onClick={() => onSelectPass(opt.id)}
                    className="min-h-[44px] px-5 rounded-full bg-[#6600FF] hover:bg-[#5200cc] text-white text-xs font-bold transition-all shadow-md shadow-[#6600FF]/25 active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center gap-1.5"
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    <span>{isSoldOut ? 'Épuisé' : 'Réserver ce pass'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
