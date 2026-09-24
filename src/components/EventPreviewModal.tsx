import { useState } from 'react';
import {
  X,
  Eye,
  Calendar,
  Clock,
  MapPin,
  MessageCircle,
  ExternalLink,
  Check,
  Users,
  Smartphone,
  Layers,
  ListOrdered,
} from 'lucide-react';
import type { Event } from '@/types';
import { EventCard } from '@/components/EventCard';
import { formatFullDate, formatTime } from '@/utils/format';

interface EventPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  ticketOptions?: { ticket_type: string; label: string; price: number; quantity_total: number }[];
  scheduleItems?: { title: string; start_time: string; day_label?: string }[];
  collaborators?: { name: string; role: string; type: string }[];
}

export function EventPreviewModal({
  isOpen,
  onClose,
  event,
  ticketOptions = [],
  scheduleItems = [],
  collaborators = [],
}: EventPreviewModalProps) {
  const [viewMode, setViewMode] = useState<'card' | 'page'>('card');

  if (!isOpen) return null;

  const startsDate = event.starts_at ? new Date(event.starts_at) : new Date();
  const endsDate = event.ends_at ? new Date(event.ends_at) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-[#F8F8FC] dark:bg-[#12111A] rounded-[28px] border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-[#1A1829]/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#6600FF]/10 text-[#6600FF] dark:text-purple-300 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h2 id="preview-modal-title" className="text-sm font-black text-[#17131D] dark:text-white">
                Aperçu en direct
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Rendu de votre événement avant publication
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
            aria-label="Fermer la prévisualisation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View Mode Segmented Control */}
        <div className="p-3 bg-white/50 dark:bg-[#1A1829]/50 border-b border-black/[0.04] dark:border-white/[0.06] shrink-0">
          <div className="flex p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-2xl">
            <button
              type="button"
              onClick={() => setViewMode('card')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                viewMode === 'card'
                  ? 'bg-white dark:bg-[#201D33] text-[#6600FF] dark:text-purple-300 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Carte Feed</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('page')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                viewMode === 'page'
                  ? 'bg-white dark:bg-[#201D33] text-[#6600FF] dark:text-purple-300 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Fiche Complète</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {viewMode === 'card' ? (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-[#6600FF]/5 dark:bg-[#6600FF]/15 border border-[#6600FF]/20 text-xs text-[#17131D] dark:text-purple-200">
                ✨ <strong>Rendu dans le fil d'actualité :</strong> Voici comment votre événement sera vu par les festivaliers et spectateurs sur la page d'accueil et les recherches.
              </div>

              {/* Simulation Smartphone Container for Card */}
              <div className="max-w-[340px] mx-auto p-2 rounded-[28px] bg-white dark:bg-[#1A1829] border border-black/10 dark:border-white/10 shadow-lg">
                <EventCard event={event} />
              </div>
            </div>
          ) : (
            /* Simulation Full Event Detail Page */
            <div className="space-y-4 bg-white dark:bg-[#1A1829] rounded-[24px] border border-black/10 dark:border-white/10 p-4 shadow-sm">
              {/* Cover Banner */}
              <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-gray-900">
                <img
                  src={event.cover_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200'}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-full bg-[#6600FF]/80 backdrop-blur-md text-white text-[10px] font-extrabold uppercase tracking-wide">
                    {event.category}
                  </span>
                  {event.access_type === 'whatsapp' && (
                    <span className="px-2.5 py-1 rounded-full bg-[#25D366] text-white text-[10px] font-extrabold flex items-center gap-1 shadow-xs">
                      <MessageCircle className="w-2.5 h-2.5" /> WhatsApp
                    </span>
                  )}
                  {event.access_type === 'external' && (
                    <span className="px-2.5 py-1 rounded-full bg-blue-600 text-white text-[10px] font-extrabold flex items-center gap-1 shadow-xs">
                      <ExternalLink className="w-2.5 h-2.5" /> Site externe
                    </span>
                  )}
                  {event.access_type === 'free' && (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold shadow-xs">
                      Entrée libre
                    </span>
                  )}
                </div>

                {/* Bottom title in cover */}
                <div className="absolute bottom-3 inset-x-3 text-white">
                  <h3 className="text-lg font-black leading-tight line-clamp-2">
                    {event.title || 'Titre de l’événement'}
                  </h3>
                  <p className="text-xs text-white/80 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-[#6600FF]" />
                    <span>{event.location_name || 'Lieu à définir'}, {event.city}</span>
                  </p>
                </div>
              </div>

              {/* Date & Time info box */}
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.08] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#6600FF]/10 text-[#6600FF] dark:text-purple-300 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-[#17131D] dark:text-white">
                      {startsDate ? formatFullDate(startsDate) : 'Date à définir'}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>
                        {startsDate ? formatTime(startsDate) : ''}
                        {endsDate ? ` - ${formatTime(endsDate)}` : ''}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Tarif</span>
                  <span className="text-sm font-black text-[#6600FF] dark:text-purple-300">
                    {event.access_type === 'free' || event.price_min === 0
                      ? 'Gratuit'
                      : `${Number(event.price_min).toLocaleString('fr-FR')} FCFA`}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">À propos</h4>
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {event.description || 'Aucune description rédigée pour le moment.'}
                </p>
              </div>

              {/* Access Mode Dedicated Widget */}
              <div className="p-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-gray-50/50 dark:bg-white/[0.02] space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Modalité d'accès & Billetterie
                </h4>

                {event.access_type === 'whatsapp' ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <MessageCircle className="w-4 h-4 text-[#25D366]" />
                      <span>Réservation obligatoire via WhatsApp</span>
                    </div>
                    {event.whatsapp_number && (
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        Contact officiel : <strong>{event.whatsapp_number}</strong>
                      </p>
                    )}
                    <button
                      type="button"
                      disabled
                      className="w-full py-3 rounded-xl bg-[#25D366] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm opacity-90 cursor-default"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Bouton WhatsApp actif après publication</span>
                    </button>
                  </div>
                ) : event.access_type === 'external' ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#6600FF] dark:text-purple-300">
                      <ExternalLink className="w-4 h-4" />
                      <span>Billetterie gérée sur un site externe</span>
                    </div>
                    {event.external_ticket_url && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        Lien : {event.external_ticket_url}
                      </p>
                    )}
                    <button
                      type="button"
                      disabled
                      className="w-full py-3 rounded-xl bg-[#6600FF] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm opacity-90 cursor-default"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Accéder au site officiel</span>
                    </button>
                  </div>
                ) : event.access_type === 'free' ? (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-xs text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>Entrée libre et gratuite pour tous sans réservation.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {ticketOptions.length > 0 ? (
                      ticketOptions.map((opt, i) => (
                        <div key={i} className="flex justify-between items-center py-1.5 border-b border-black/[0.04] dark:border-white/[0.06] last:border-0 text-xs">
                          <span className="font-semibold text-[#17131D] dark:text-white">{opt.label || 'Pass'}</span>
                          <span className="font-bold text-[#6600FF] dark:text-purple-300">
                            {Number(opt.price) === 0 ? 'Gratuit' : `${Number(opt.price).toLocaleString('fr-FR')} FCFA`}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500">Billet Standard à définir</p>
                    )}
                  </div>
                )}
              </div>

              {/* Programme / Schedule items */}
              {scheduleItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>Programme ({scheduleItems.length} temps forts)</span>
                  </h4>
                  <div className="space-y-1.5">
                    {scheduleItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{item.title}</span>
                        <span className="text-gray-500 font-mono text-[11px]">{item.start_time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Collaborators preview */}
              {collaborators.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Artistes & Collaborateurs</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {collaborators.map((c, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/30 text-[#6600FF] dark:text-purple-300 text-xs font-medium"
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-[#1A1829]/80 backdrop-blur-md flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full bg-[#6600FF] text-white text-xs font-bold cursor-pointer hover:bg-[#5200cc] transition-colors"
          >
            Fermer l'aperçu
          </button>
        </div>
      </div>
    </div>
  );
}
