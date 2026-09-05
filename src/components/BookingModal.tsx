import { useState, useEffect } from 'react';
import { Ticket, Minus, Plus, Check, Loader2, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { fetchTicketOptions, bookTicket } from '@/services/events';
import type { Event, TicketOption } from '@/types';

interface BookingModalProps {
  open: boolean;
  event: Event | null;
  onClose: () => void;
  onSuccess: (qrCode: string) => void;
}

export function BookingModal({ open, event, onClose, onSuccess }: BookingModalProps) {
  const [options, setOptions] = useState<TicketOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<TicketOption | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open || !event) return;
    setLoading(true);
    setError(null);
    setSelectedOption(null);
    setQuantity(1);
    fetchTicketOptions(event.id)
      .then((data) => {
        setOptions(data);
        if (data.length > 0) setSelectedOption(data[0]);
      })
      .catch(() => setError('Impossible de charger les billets'))
      .finally(() => setLoading(false));
  }, [open, event]);

  const totalPrice = selectedOption ? selectedOption.price * quantity : 0;
  const available = selectedOption ? selectedOption.quantity_total - selectedOption.quantity_sold : 0;

  const handleBook = async () => {
    if (!event || !selectedOption) return;
    setBooking(true);
    setError(null);
    try {
      const result = await bookTicket(event.id, selectedOption.id, quantity);
      if (result.success) {
        const ticket = result.ticket as { qr_code?: string };
        setSuccess(true);
        setTimeout(() => {
          onSuccess(ticket?.qr_code || '');
          onClose();
          setSuccess(false);
        }, 1500);
      } else {
        setError(result.error || 'Erreur lors de la réservation');
      }
    } catch {
      setError('Erreur réseau. Réessayez.');
    } finally {
      setBooking(false);
    }
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

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#6600FF] animate-spin" />
          </div>
        ) : options.length === 0 ? (
          <div className="text-center py-8">
            <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Aucune option de billet disponible pour cet événement.</p>
            <p className="text-xs text-gray-400 mt-1">L'organisateur n'a pas encore configuré les billets.</p>
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
                    onClick={() => { setSelectedOption(opt); setQuantity(1); }}
                    className={`glass-surface w-full p-4 rounded-2xl border-2 transition-all text-left ${
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
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="glass-surface w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40"
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4 text-[#1A1A2E]" />
                  </button>
                  <span className="text-lg font-extrabold text-[#1A1A2E] w-6 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(available, quantity + 1))}
                    className="glass-surface w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40"
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
