import { useState, useEffect, useCallback, useRef } from 'react';
import { Ticket, Minus, Plus, Check, Loader2, AlertCircle, RotateCw } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useApp } from '@/hooks/useApp';
import { haptic } from '@/hooks/useHaptics';
import { fetchTicketOptions, bookTicket, isEventTerminated, subscribeToTicketInventory } from '@/services/events';
import { saveLocalStoredTicket, removeLocalStoredTicket } from '@/features/tickets/service';
import { saveCachedUserTickets, getSyncCachedUserTickets } from '@/services/cache';
import type { Event, Ticket as TicketTypeItem, TicketOption, TicketType } from '@/types';

interface BookingModalProps {
  open: boolean;
  event: Event | null;
  initialOptionId?: string | null;
  onClose: () => void;
  onSuccess: (qrCode: string) => void;
}

export function BookingModal({ open, event, initialOptionId, onClose, onSuccess }: BookingModalProps) {
  const { user } = useApp();
  const [options, setOptions] = useState<TicketOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [selectedOption, setSelectedOption] = useState<TicketOption | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const currentTicketIdRef = useRef<string | null>(null);

  const loadOptions = useCallback(() => {
    if (!event) return;
    setLoading(true);
    setFetchError(false);
    setError(null);
    fetchTicketOptions(event.id)
      .then((data) => {
        if (data && data.length > 0) {
          setOptions(data);
          const matched = initialOptionId ? data.find((o) => o.id === initialOptionId) : null;
          setSelectedOption(matched || data[0]);
        } else {
          setOptions([]);
          setSelectedOption(null);
        }
      })
      .catch(() => {
        setFetchError(true);
        setOptions([]);
        setSelectedOption(null);
      })
      .finally(() => setLoading(false));
  }, [event, initialOptionId]);

  useEffect(() => {
    if (!open || !event) return;
    setSelectedOption(null);
    setQuantity(1);
    setError(null);
    loadOptions();

    const unsub = subscribeToTicketInventory(event.id, (updatedOption) => {
      setOptions((prev) => {
        const idx = prev.findIndex((o) => o.id === updatedOption.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...updatedOption };
          return next;
        }
        return [...prev, updatedOption];
      });
      setSelectedOption((current) => {
        if (current && current.id === updatedOption.id) {
          return { ...current, ...updatedOption };
        }
        return current;
      });
    });

    return () => {
      unsub();
    };
  }, [open, event, loadOptions]);

  const totalPrice = selectedOption ? selectedOption.price * quantity : 0;
  const available = selectedOption ? selectedOption.quantity_total - selectedOption.quantity_sold : 0;
  const isTerminated = event ? isEventTerminated(event) : false;
  const eventUnavailable = !event || isTerminated || event.status === 'cancelled';
  const soldOut = options.length > 0 && options.every((option) => option.quantity_total - option.quantity_sold <= 0);

  const handleBook = () => {
    if (!event || !selectedOption) return;

    // 1. Immediate Face ID / Apple Pay tactile confirmation
    haptic.success();
    setError(null);

    // 2. Generate optimistic ticket representation with unique QR code
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const qrCode = `GBA-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
    const optimisticTicketId = `tkt_opt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    currentTicketIdRef.current = optimisticTicketId;

    const optimisticTicket: TicketTypeItem & { event?: Event } = {
      id: optimisticTicketId,
      event_id: event.id,
      user_id: user?.id || 'guest',
      ticket_type: selectedOption.ticket_type as TicketType,
      ticket_option_id: selectedOption.id,
      quantity,
      price_paid: totalPrice,
      currency: 'XOF',
      status: 'active',
      qr_code: qrCode,
      seat_info: null,
      created_at: new Date().toISOString(),
      event,
    };

    // 3. Persist optimistically to local storage & IndexedDB cache for instant offline access
    saveLocalStoredTicket(optimisticTicket as unknown as Record<string, unknown>);
    if (user?.id) {
      const prevTickets = getSyncCachedUserTickets(user.id);
      saveCachedUserTickets(user.id, [optimisticTicket, ...prevTickets.filter((t) => t.id !== optimisticTicketId)]).catch(() => {});
    }

    // 4. Instant decrement of inventory on screen
    const optionId = selectedOption.id;
    const bookedQty = quantity;
    setOptions((prev) =>
      prev.map((o) => (o.id === optionId ? { ...o, quantity_sold: o.quantity_sold + bookedQty } : o))
    );

    // 5. Broadcast optimistic booking so TicketsScreen updates instantly (0ms)
    window.dispatchEvent(
      new CustomEvent('gba-ticket-booked', {
        detail: { ticket: optimisticTicket },
      })
    );

    // 6. Transition immediately to celebratory success view without waiting for network
    setSuccess(true);
    setBooking(false);

    // 7. Background synchronization with backend/Supabase with transparent rollback
    bookTicket(event.id, optionId, bookedQty, {
      name: user?.name,
      email: user?.email || undefined,
    })
      .then((result) => {
        if (result.success && result.ticket) {
          const confirmed = result.ticket as TicketTypeItem & { event?: Event };
          // Reconcile optimistic ticket with server ID
          saveLocalStoredTicket({ ...confirmed, event });
          removeLocalStoredTicket(optimisticTicketId);

          if (user?.id) {
            const currentTickets = getSyncCachedUserTickets(user.id);
            const reconciled = currentTickets.map((t) =>
              t.id === optimisticTicketId ? { ...confirmed, event } : t
            );
            saveCachedUserTickets(user.id, reconciled).catch(() => {});
          }

          window.dispatchEvent(
            new CustomEvent('gba-ticket-synced', {
              detail: { oldId: optimisticTicketId, ticket: confirmed },
            })
          );
        } else {
          // Transparent rollback on rejection
          rollbackBooking(optimisticTicketId, optionId, bookedQty, result.error || 'Quota serveur atteint');
        }
      })
      .catch(() => {
        rollbackBooking(optimisticTicketId, optionId, bookedQty, 'Erreur de connexion serveur');
      });

    // 8. Timed progression to success callback
    setTimeout(() => {
      onSuccess(qrCode);
      onClose();
      setSuccess(false);
    }, 1500);
  };

  const rollbackBooking = (
    ticketId: string,
    optId: string,
    qty: number,
    reason: string
  ) => {
    haptic.error();
    // Revert inventory count
    setOptions((prev) =>
      prev.map((o) => (o.id === optId ? { ...o, quantity_sold: Math.max(0, o.quantity_sold - qty) } : o))
    );
    // Remove optimistic ticket
    removeLocalStoredTicket(ticketId);
    if (user?.id) {
      const current = getSyncCachedUserTickets(user.id);
      saveCachedUserTickets(user.id, current.filter((t) => t.id !== ticketId)).catch(() => {});
    }
    // Broadcast cancellation
    window.dispatchEvent(
      new CustomEvent('gba-ticket-cancelled', {
        detail: { ticketId },
      })
    );
    // Alert user via Dynamic Island
    window.dispatchEvent(
      new CustomEvent('gba-optimistic-rollback', {
        detail: {
          type: 'ticket',
          id: ticketId,
          message: `Réservation non validée : ${reason}. Vos billets n'ont pas été débités.`,
        },
      })
    );
  };

  if (!event) return null;

  if (success) {
    return (
      <Modal open={open} onClose={() => {}} title="">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center animate-bounce-in">
              <Check className="w-12 h-12 text-green-500" strokeWidth={3} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {['🎉', '✨', '🎊', '💫', '⭐', '🎈'].map((emoji, i) => (
                <span
                  key={i}
                  className="absolute text-2xl animate-confetti"
                  style={{
                    animationDelay: `${i * 0.1}s`,
                    transform: `rotate(${i * 60}deg) translateY(-40px)`,
                  }}
                >{emoji}</span>
              ))}
            </div>
          </div>
          <h3 className="text-xl font-extrabold text-[#1A1A2E] mt-6 animate-slide-up">Réservation confirmée !</h3>
          <p className="text-sm text-gray-500 mt-1 animate-slide-up">Votre billet vous attend dans l'onglet « Mes billets »</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Réserver un billet">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-[#6600FF]/5 rounded-2xl">
          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0">
            <img src={event.cover_url || ''} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-[#1A1A2E] text-sm line-clamp-1">{event.title}</h3>
            <p className="text-xs text-gray-500">{event.location_name} · {event.city}</p>
          </div>
        </div>

        {eventUnavailable ? (
          <div className="text-center py-8">
            <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#171726]">Réservation indisponible</p>
            <p className="text-xs text-gray-400 mt-1">{event.status === 'paused' ? 'Les ventes sont temporairement suspendues.' : event.status === 'suspended' ? 'Cet événement est momentanément suspendu.' : event.status === 'completed' ? 'Cet événement est terminé.' : event.status === 'cancelled' ? 'Cet événement a été annulé.' : 'Les ventes ne sont pas ouvertes.'}</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#6600FF] animate-spin" />
          </div>
        ) : fetchError ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#171726] dark:text-white">Inventaire indisponible</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto mb-5 leading-relaxed">
              Impossible de charger les billets en direct. Vérifiez votre connexion et réessayez.
            </p>
            <button
              type="button"
              onClick={loadOptions}
              className="px-6 py-2.5 rounded-full bg-[#6600FF] text-white text-xs font-black hover:bg-[#5200cc] transition-all inline-flex items-center gap-2 shadow-sm"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Réessayer
            </button>
          </div>
        ) : options.length === 0 ? (
          <div className="text-center py-8">
            <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Aucune option de billet disponible pour cet événement.</p>
            <p className="text-xs text-gray-400 mt-1">L'organisateur n'a pas encore configuré les billets.</p>
          </div>
        ) : soldOut ? (
          <div className="text-center py-8">
            <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#171726]">Complet</p>
            <p className="text-xs text-gray-400 mt-1">Tous les billets disponibles ont été vendus.</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#1A1A2E]">Choisissez votre billet</p>
              {options.map((opt) => {
                const optAvailable = opt.quantity_total - opt.quantity_sold;
                const isSelected = selectedOption?.id === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      haptic.selection();
                      setSelectedOption(opt);
                      setQuantity(1);
                    }}
                    disabled={optAvailable <= 0}
                    className={`glass-surface w-full p-4 rounded-2xl border-2 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSelected ? 'border-[#6600FF] bg-[#6600FF]/10' : 'border-transparent hover:border-[#6600FF]/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-[#6600FF] bg-[#6600FF]' : 'border-gray-300'}`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div>
                          <p className="font-bold text-[#1A1A2E] text-sm">{opt.label || opt.ticket_type.toUpperCase()}</p>
                          {opt.description && <p className="text-xs text-gray-500">{opt.description}</p>}
                          <p className="text-xs text-gray-400 mt-0.5">
                            {optAvailable > 0 ? `${optAvailable} disponibles` : 'Épuisé'}
                          </p>
                        </div>
                      </div>
                      <span className="font-extrabold text-[#6600FF]">
                        {opt.price === 0 ? 'Gratuit' : `${opt.price.toLocaleString('fr-FR')} F`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedOption && available > 0 && (
              <div className="glass-surface flex items-center justify-between p-4 rounded-2xl">
                <span className="text-sm font-semibold text-[#1A1A2E]">Quantité</span>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      haptic.selection();
                      setQuantity(Math.max(1, quantity - 1));
                    }}
                    aria-label="Diminuer la quantité"
                    className="glass-surface w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40 active:scale-90 transition-transform"
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4 text-[#1A1A2E]" />
                  </button>
                  <span className="text-lg font-extrabold text-[#1A1A2E] w-6 text-center">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => {
                      haptic.selection();
                      setQuantity(Math.min(available, quantity + 1));
                    }}
                    aria-label="Augmenter la quantité"
                    className="glass-surface w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40 active:scale-90 transition-transform"
                    disabled={quantity >= available}
                  >
                    <Plus className="w-4 h-4 text-[#1A1A2E]" />
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-2xl text-sm text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {selectedOption && available > 0 && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500">Total</span>
                  <span className="text-2xl font-extrabold text-[#1A1A2E]">
                    {totalPrice === 0 ? 'Gratuit' : `${totalPrice.toLocaleString('fr-FR')} F`}
                  </span>
                </div>
                <button
                  onClick={handleBook}
                  disabled={booking}
                  className="btn-purple w-full py-4 flex items-center justify-center gap-2"
                >
                  {booking ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Réservation...</>
                  ) : (
                    <><Ticket className="w-5 h-5" /> Confirmer la réservation</>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
