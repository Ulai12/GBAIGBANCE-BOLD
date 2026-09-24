import { useState, useEffect, useCallback } from 'react';
import { 
  Ticket, 
  Minus, 
  Plus, 
  Check, 
  Loader2, 
  AlertCircle, 
  RotateCw, 
  Users, 
  Phone, 
  Smartphone,
  Share2
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useApp } from '@/hooks/useApp';
import { haptic } from '@/hooks/useHaptics';
import { fetchTicketOptions, isEventTerminated, subscribeToTicketInventory } from '@/services/events';
import { purchaseTicketsMulti, type TicketRecipientInput } from '@/features/tickets/service';
import type { Event, TicketOption, PaymentProvider } from '@/types';

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
  
  // Quantité et configuration des bénéficiaires
  const [quantity, setQuantity] = useState(1);
  const [recipients, setRecipients] = useState<TicketRecipientInput[]>([
    { recipient_name: user?.name || 'Moi-même', recipient_phone: user?.phone || '', is_for_me: true },
  ]);

  // Paiement Mobile Money
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('tmoney');
  const [paymentPhone, setPaymentPhone] = useState(user?.phone || '');

  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdTicketsSummary, setCreatedTicketsSummary] = useState<Array<{
    ticket_id: string;
    qr_code: string;
    is_for_me: boolean;
    recipient_name?: string;
    claim_token?: string;
  }>>([]);

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
    setRecipients([
      { recipient_name: user?.name || 'Moi-même', recipient_phone: user?.phone || '', is_for_me: true },
    ]);
    setPaymentPhone(user?.phone || '');
    setError(null);
    setSuccess(false);
    setCreatedTicketsSummary([]);
    loadOptions();
  }, [open, event, loadOptions, user]);

  // Synchronisation du tableau des bénéficiaires avec la quantité
  const handleQuantityChange = (newQty: number) => {
    setQuantity(newQty);
    setRecipients((prev) => {
      const next = [...prev];
      if (newQty > next.length) {
        for (let i = next.length; i < newQty; i++) {
          next.push({
            recipient_name: `Ami #${i + 1}`,
            recipient_phone: '',
            is_for_me: false,
          });
        }
      } else {
        next.splice(newQty);
      }
      return next;
    });
  };

  const handleUpdateRecipient = (index: number, field: keyof TicketRecipientInput, value: unknown) => {
    setRecipients((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Temps réel d'inventaire
  useEffect(() => {
    if (!open || !event?.id) return;
    const unsub = subscribeToTicketInventory(event.id, (payload) => {
      if (payload.eventType === 'UPDATE' && payload.new) {
        setOptions((prev) =>
          prev.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new } : o))
        );
      }
    });
    return () => unsub();
  }, [open, event?.id]);

  const available = selectedOption ? selectedOption.quantity_total - selectedOption.quantity_sold : 0;
  const soldOut = options.length > 0 && options.every((o) => o.quantity_sold >= o.quantity_total);
  const eventUnavailable = isEventTerminated(event);
  const unitPrice = selectedOption ? selectedOption.price : 0;
  const totalPrice = unitPrice * quantity;

  const handleBook = async () => {
    if (!selectedOption || !event) return;
    if (quantity > available) {
      setError('Quantité demandée supérieure au stock disponible.');
      return;
    }
    if (!paymentPhone.trim() || paymentPhone.trim().length < 8) {
      setError('Veuillez renseigner un numéro de téléphone Mobile Money valide.');
      return;
    }

    haptic.impactMedium();
    setError(null);
    setBooking(true);

    try {
      const callerUserId = user?.id || `guest-${Date.now()}`;
      const res = await purchaseTicketsMulti({
        eventId: event.id,
        ticketOptionId: selectedOption.id,
        recipients,
        paymentProvider,
        paymentPhone: paymentPhone.trim(),
        userId: callerUserId,
      });

      if (!res.success) {
        setError(res.error || 'Échec de la commande');
        setBooking(false);
        return;
      }

      setCreatedTicketsSummary(res.tickets || []);
      setSuccess(true);
      setBooking(false);

      // Met à jour l'inventaire en local
      setOptions((prev) =>
        prev.map((o) =>
          o.id === selectedOption.id
            ? { ...o, quantity_sold: o.quantity_sold + quantity }
            : o
        )
      );

      // Notifie les autres écrans
      window.dispatchEvent(new CustomEvent('gba-ticket-booked'));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur inattendue est survenue');
      setBooking(false);
    }
  };

  if (!event) return null;

  if (success) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return (
      <Modal open={open} onClose={() => {}} title="">
        <div className="flex flex-col items-center justify-center py-6 text-center text-[#1A1A2E] space-y-4">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
            <Check className="w-10 h-10 text-emerald-600" strokeWidth={3} />
          </div>
          <div>
            <h3 className="text-xl font-black">Commande Validée !</h3>
            <p className="text-xs text-gray-500 mt-1">
              {quantity === 1
                ? 'Votre billet est prêt dans votre espace « Mes billets »'
                : `${quantity} billets générés avec succès.`}
            </p>
          </div>

          {/* Récapitulatif des billets et liens amis */}
          {createdTicketsSummary.length > 0 && (
            <div className="w-full space-y-2 text-left text-xs max-h-56 overflow-y-auto pr-1">
              {createdTicketsSummary.map((t) => (
                <div
                  key={t.ticket_id}
                  className="p-3 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-gray-800 block">
                      {t.is_for_me ? 'Billet pour moi' : `Billet : ${t.recipient_name || 'Ami'}`}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      QR: {t.qr_code}
                    </span>
                  </div>

                  {!t.is_for_me && t.claim_token && (
                    <button
                      type="button"
                      onClick={() => {
                        const link = `${origin}/#claim=${t.claim_token}`;
                        navigator.clipboard.writeText(link);
                        haptic.selection();
                        alert('Lien de réclamation copié !');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-[#6600FF]/10 text-[#6600FF] font-semibold text-[11px] flex items-center gap-1 active:scale-95 transition-transform"
                    >
                      <Share2 className="w-3 h-3" />
                      Copier le lien
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => {
              const firstQr = createdTicketsSummary[0]?.qr_code || 'GBC-OK';
              onSuccess(firstQr);
              onClose();
              setSuccess(false);
            }}
            className="w-full py-3.5 rounded-2xl bg-[#6600FF] text-white font-bold text-sm active:scale-98 transition-transform shadow-lg shadow-purple-900/20"
          >
            Accéder à mes billets
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Réserver des billets">
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        {/* En-tête de l'événement */}
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
            <p className="text-xs text-gray-400 mt-1">Les ventes ne sont pas ouvertes pour cet événement.</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#6600FF] animate-spin" />
          </div>
        ) : fetchError ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#171726]">Inventaire indisponible</p>
            <button
              type="button"
              onClick={loadOptions}
              className="mt-3 px-6 py-2 rounded-full bg-[#6600FF] text-white text-xs font-bold inline-flex items-center gap-2"
            >
              <RotateCw className="w-3.5 h-3.5" /> Réessayer
            </button>
          </div>
        ) : options.length === 0 ? (
          <div className="text-center py-8">
            <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Aucune option de billet configurée.</p>
          </div>
        ) : soldOut ? (
          <div className="text-center py-8">
            <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#171726]">Complet</p>
            <p className="text-xs text-gray-400 mt-1">Tous les billets disponibles ont été vendus.</p>
          </div>
        ) : (
          <>
            {/* Choix de l'option de billet */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">1. Catégorie de pass</p>
              {options.map((opt) => {
                const optAvailable = opt.quantity_total - opt.quantity_sold;
                const isSelected = selectedOption?.id === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      haptic.selection();
                      setSelectedOption(opt);
                      handleQuantityChange(1);
                    }}
                    disabled={optAvailable <= 0}
                    className={`w-full p-3.5 rounded-2xl border-2 transition-all text-left flex items-center justify-between ${
                      isSelected
                        ? 'border-[#6600FF] bg-[#6600FF]/10'
                        : 'border-gray-200 hover:border-[#6600FF]/30'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-sm text-[#1A1A2E]">{opt.label || opt.ticket_type.toUpperCase()}</p>
                      <p className="text-[11px] text-gray-500">{optAvailable > 0 ? `${optAvailable} disponibles` : 'Complet'}</p>
                    </div>
                    <span className="font-extrabold text-[#6600FF] text-sm">
                      {opt.price === 0 ? 'Gratuit' : `${opt.price.toLocaleString('fr-FR')} F`}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sélecteur de Quantité */}
            {selectedOption && available > 0 && (
              <div className="p-4 rounded-2xl bg-gray-50 flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-[#1A1A2E] block">Quantité de billets</span>
                  <span className="text-xs text-gray-500">Achetez pour vous et/ou vos amis</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="w-8 h-8 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center disabled:opacity-40"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-sm w-4 text-center">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(Math.min(available, quantity + 1))}
                    disabled={quantity >= available || quantity >= 20}
                    className="w-8 h-8 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Configuration des bénéficiaires (Moi / Un ami) */}
            {selectedOption && quantity > 1 && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> 2. Titulaires des billets (1 QR unique par place)
                </p>
                <div className="space-y-2">
                  {recipients.map((r, i) => (
                    <div key={i} className="p-3 rounded-2xl border border-gray-200 bg-white space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-700">Place #{i + 1}</span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateRecipient(i, 'is_for_me', true)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                              r.is_for_me ? 'bg-[#6600FF] text-white' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            Pour moi
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateRecipient(i, 'is_for_me', false)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                              !r.is_for_me ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            Pour un ami
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        value={r.recipient_name}
                        onChange={(e) => handleUpdateRecipient(i, 'recipient_name', e.target.value)}
                        placeholder="Nom ou prénom du bénéficiaire"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-[#6600FF]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Paiement Mobile Money */}
            {selectedOption && available > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" /> 3. Règlement Mobile Money
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'tmoney', name: 'T-Money' },
                    { id: 'flooz', name: 'Flooz' },
                    { id: 'mtn', name: 'MTN MoMo' },
                  ].map((op) => (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setPaymentProvider(op.id as PaymentProvider)}
                      className={`py-2 px-2 rounded-xl border text-xs text-center font-bold transition-all ${
                        paymentProvider === op.id
                          ? 'border-[#6600FF] bg-[#6600FF]/10 text-[#6600FF]'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {op.name}
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-600 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-[#6600FF]" /> Numéro de débit
                  </label>
                  <input
                    type="tel"
                    value={paymentPhone}
                    onChange={(e) => setPaymentPhone(e.target.value)}
                    placeholder="Ex: 90123456"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:border-[#6600FF]"
                  />
                  <span className="text-[10px] text-gray-400">
                    L'acheteur reste la référence financière pour tout remboursement éventuel.
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Total et Bouton Final */}
            {selectedOption && available > 0 && (
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-500 block">Total à payer</span>
                    <span className="text-xs text-gray-400">15 min de réservation de stock</span>
                  </div>
                  <span className="text-2xl font-black text-[#1A1A2E]">
                    {totalPrice.toLocaleString('fr-FR')} F CFA
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleBook}
                  disabled={booking}
                  className="w-full py-4 rounded-2xl bg-[#6600FF] hover:bg-[#5200cc] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98 transition-all shadow-lg shadow-purple-900/20"
                >
                  {booking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Génération des QR codes sécurisés...
                    </>
                  ) : (
                    <>
                      <Ticket className="w-4 h-4" />
                      Confirmer et Payer ({quantity} billet{quantity > 1 ? 's' : ''})
                    </>
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
