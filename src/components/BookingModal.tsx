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
  Gift,
  MessageCircle,
  Copy
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useApp } from '@/hooks/useApp';
import { haptic } from '@/hooks/useHaptics';
import { fetchTicketOptions, isEventTerminated, hasEventEnded, subscribeToTicketInventory } from '@/services/events';
import {
  purchaseTicketsMulti,
  coreFinancialFees,
  coreStock,
  type TicketRecipientInput,
} from '@/features/tickets/service';
import type { FinancialFeesResult } from '@/lib/rust-core';
import { toWhatsAppNumber } from '@/utils/format';
import { fetchFollowingUsers } from '@/features/users/follows';
import { UserAvatar } from '@/components/UserAvatar';
import type { Event, TicketOption, PaymentProvider, Profile } from '@/types';

interface BookingModalProps {
  open: boolean;
  event: Event | null;
  // Permet un identifiant d'option null ou indéfini lors de la sélection initiale
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

  // Type d'achat : 'self' (Pour moi) ou 'friend' (Offrir à un ami)
  const [purchaseTarget, setPurchaseTarget] = useState<'self' | 'friend'>('self');

  // Quantité et configuration des bénéficiaires
  const [quantity, setQuantity] = useState(1);
  const [friendName, setFriendName] = useState('');
  const [friendPhone, setFriendPhone] = useState('');
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [followingFriends, setFollowingFriends] = useState<Profile[]>([]);

  const [recipients, setRecipients] = useState<TicketRecipientInput[]>([
    { recipient_name: user?.name || 'Moi-même', recipient_phone: user?.phone || '', is_for_me: true },
  ]);

  // Paiement Mobile Money (T-Money et Flooz uniquement, MTN MoMo supprimé)
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('tmoney');
  const [paymentPhone, setPaymentPhone] = useState(user?.phone || '');

  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [createdTicketsSummary, setCreatedTicketsSummary] = useState<Array<{
    ticket_id: string;
    qr_code: string;
    is_for_me: boolean;
    recipient_name?: string;
    claim_token?: string;
  }>>([]);
  const [feeBreakdown, setFeeBreakdown] = useState<FinancialFeesResult | null>(null);
  const [stockMeta, setStockMeta] = useState<{ remaining: number; percent_sold: number } | null>(null);

  // Pré-chargement immédiat des profils amis dès l'ouverture de la modale pour éviter tout saut de mise en page
  useEffect(() => {
    if (!open || !user?.id) return;
    let isMounted = true;
    fetchFollowingUsers(user.id)
      .then((list) => {
        if (isMounted && Array.isArray(list)) {
          setFollowingFriends(list);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [open, user?.id]);

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
    if (!open || !event?.id) return;
    setSelectedOption(null);
    setPurchaseTarget('self');
    setQuantity(1);
    setFriendName('');
    setFriendPhone('');
    setSelectedFriendId(null);
    setRecipients([
      { recipient_name: user?.name || 'Moi-même', recipient_phone: user?.phone || '', is_for_me: true },
    ]);
    setPaymentPhone(user?.phone || '');
    setError(null);
    setBooking(false);
    setSuccess(false);
    setCreatedTicketsSummary([]);
    loadOptions();
  }, [open, event?.id, loadOptions, user?.id, user?.name, user?.phone]);

  // Fermeture propre avec réinitialisation des erreurs et états de chargement
  const handleCloseModal = () => {
    setError(null);
    setBooking(false);
    onClose();
  };

  // Bascule entre "Pour moi" et "Offrir à un ami"
  const handleTogglePurchaseTarget = (target: 'self' | 'friend') => {
    haptic.selection();
    setPurchaseTarget(target);

    // Le nombre de destinataires doit toujours rester égal à la quantité affichée :
    // purchaseTicketsMulti calcule le total et crée les billets depuis ce tableau.
    const nextRecipients = Array.from({ length: quantity }, (_, index): TicketRecipientInput => {
      if (target === 'friend') {
        return index === 0
          ? {
              recipient_name: friendName.trim() || 'Mon ami',
              recipient_phone: friendPhone.trim(),
              recipient_user_id: selectedFriendId || undefined,
              is_for_me: false,
            }
          : {
              recipient_name: `Invité #${index + 1}`,
              recipient_phone: friendPhone.trim(),
              is_for_me: false,
            };
      }

      return index === 0
        ? {
            recipient_name: user?.name || 'Moi-même',
            recipient_phone: user?.phone || '',
            is_for_me: true,
          }
        : {
            recipient_name: `Ami #${index + 1}`,
            recipient_phone: '',
            is_for_me: false,
          };
    });

    if (target === 'self') setSelectedFriendId(null);
    setRecipients(nextRecipients);
  };

  // Sélection rapide d'un ami suivi
  const handleSelectFollowedFriend = (friend: Profile) => {
    haptic.selection();
    setSelectedFriendId(friend.id);
    const chosenName = friend.name || 'Ami';
    const chosenPhone = friend.phone || '';
    setFriendName(chosenName);
    setFriendPhone(chosenPhone);
    handleUpdateRecipient(0, 'recipient_name', chosenName);
    handleUpdateRecipient(0, 'recipient_phone', chosenPhone);
    handleUpdateRecipient(0, 'recipient_user_id', friend.id);
  };

  // Synchronisation du tableau des bénéficiaires avec la quantité
  const handleQuantityChange = (newQty: number) => {
    setQuantity(newQty);
    setRecipients((prev) => {
      const next = [...prev];
      if (newQty > next.length) {
        for (let i = next.length; i < newQty; i++) {
          next.push({
            recipient_name: purchaseTarget === 'friend' ? `Invité #${i + 1}` : `Ami #${i + 1}`,
            recipient_phone: purchaseTarget === 'friend' ? friendPhone.trim() : '',
            is_for_me: purchaseTarget === 'self' && i === 0,
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

  // Temps réel d'inventaire : subscribeToTicketInventory renvoie directement l'option TicketOption mise à jour
  useEffect(() => {
    if (!open || !event?.id) return;
    const unsub = subscribeToTicketInventory(event.id, (updatedOption) => {
      if (updatedOption?.id) {
        setOptions((prev) =>
          prev.map((o) => (o.id === updatedOption.id ? { ...o, ...updatedOption } : o))
        );
      }
    });
    return () => unsub();
  }, [open, event?.id]);

  // L'option sélectionnée doit suivre l'inventaire temps réel, sinon le stock
  // affiché et le plafond de quantité restent figés sur l'ancienne copie.
  const liveOption = selectedOption
    ? options.find((o) => o.id === selectedOption.id) ?? selectedOption
    : null;
  const available = liveOption
    ? Math.max(0, (liveOption.quantity_total || 0) - (liveOption.quantity_sold || 0))
    : 0;
  const soldOut = options.length > 0 && options.every((o) => (o.quantity_sold || 0) >= (o.quantity_total || 0));
  const eventUnavailable = isEventTerminated(event) || hasEventEnded(event);
  const unitPrice = liveOption ? Number(liveOption.price) || 0 : 0;
  const totalPrice = unitPrice * quantity;
  const isFreeCheckout = unitPrice === 0;

  useEffect(() => {
    if (!open || !liveOption) {
      setFeeBreakdown(null);
      setStockMeta(null);
      return;
    }
    let active = true;
    const totalCap = Number(liveOption.quantity_total) || 0;
    const soldCap = Number(liveOption.quantity_sold) || 0;

    Promise.all([
      coreFinancialFees(unitPrice, quantity, isFreeCheckout ? 'free' : 'mobile_money'),
      coreStock(soldCap, totalCap),
    ])
      .then(([fees, st]) => {
        if (!active) return;
        setFeeBreakdown(fees);
        setStockMeta(st);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [open, liveOption, unitPrice, quantity, isFreeCheckout]);

  const handleBook = async () => {
    if (!liveOption || !event) return;
    if (quantity > available) {
      setError('Quantité demandée supérieure au stock disponible.');
      return;
    }

    if (purchaseTarget === 'friend') {
      if (friendName.trim().length < 2) {
        setError('Veuillez renseigner le nom ou prénom de votre ami(e).');
        return;
      }
      if (toWhatsAppNumber(friendPhone).length < 11) {
        setError('Indiquez le numéro WhatsApp de votre ami (8 chiffres, ex. 90 12 34 56).');
        return;
      }
    }

    // Garde-fou : aucune divergence entre la quantité facturée et les billets générés.
    const alignedRecipients = Array.from({ length: quantity }, (_, index) =>
      recipients[index] ?? {
        recipient_name: purchaseTarget === 'friend' ? `Invité #${index + 1}` : `Ami #${index + 1}`,
        recipient_phone: purchaseTarget === 'friend' ? friendPhone.trim() : '',
        is_for_me: purchaseTarget === 'self' && index === 0,
      }
    );

    const finalRecipients: TicketRecipientInput[] = alignedRecipients.map((r, i) => {
      if (purchaseTarget === 'friend') {
        const primary = i === 0;
        return {
          recipient_name: (primary ? friendName.trim() : (r.recipient_name || '').trim()) || `Invité #${i + 1}`,
          recipient_phone: (primary ? friendPhone.trim() : (r.recipient_phone || friendPhone).trim()) || '',
          // Sans cet identifiant, le pass offert n’atterrissait jamais sur le compte de l’ami choisi.
          recipient_user_id: primary ? (selectedFriendId || r.recipient_user_id) : r.recipient_user_id,
          is_for_me: false,
        };
      }
      return {
        ...r,
        recipient_name: (r.recipient_name || '').trim() || (i === 0 ? (user?.name || 'Moi-même') : ''),
        recipient_phone: r.recipient_phone || user?.phone || '',
        is_for_me: i === 0,
      };
    });

    if (quantity > 1) {
      const unnamed = finalRecipients.some((r, i) => {
        if (purchaseTarget === 'self' && i === 0) return false;
        return (r.recipient_name || '').trim().length < 2;
      });
      if (unnamed) {
        setError('Indiquez le nom de chaque titulaire (2 caractères minimum).');
        return;
      }
    }

    const buyerDigits = paymentPhone.replace(/\D/g, '');
    if (!isFreeCheckout && buyerDigits.length < 8) {
      setError('Veuillez renseigner un numéro de téléphone Mobile Money valide.');
      return;
    }

    haptic.medium();
    setError(null);
    setBooking(true);

    try {
      const callerUserId = user?.id || `guest-${Date.now()}`;

      const res = await purchaseTicketsMulti({
        eventId: event.id,
        ticketOptionId: liveOption.id,
        recipients: finalRecipients,
        paymentProvider,
        paymentPhone: isFreeCheckout ? (user?.phone || '00000000') : paymentPhone.trim(),
        userId: callerUserId,
        buyerName: user?.name || 'Un ami',
        unitPrice,
      });

      if (!res.success) {
        setError(res.error || 'Échec de la commande');
        setBooking(false);
        return;
      }

      setCreatedTicketsSummary(res.tickets || []);
      setSuccess(true);
      setBooking(false);

      setOptions((prev) =>
        prev.map((o) =>
          o.id === liveOption.id
            ? { ...o, quantity_sold: (o.quantity_sold || 0) + quantity }
            : o
        )
      );

      window.dispatchEvent(new CustomEvent('gba-ticket-booked'));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur inattendue est survenue');
      setBooking(false);
    }
  };

  if (!event) return null;

  if (success) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const firstTicket = createdTicketsSummary[0];
    const claimLink = firstTicket?.claim_token ? `${origin}/#claim=${firstTicket.claim_token}` : origin;
    const isGift = purchaseTarget === 'friend';

    return (
      <Modal open={open} onClose={handleCloseModal} title="">
        <div className="flex flex-col items-center justify-center py-6 text-center text-[#1A1A2E] dark:text-white space-y-4">
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center animate-bounce-in motion-reduce:animate-none">
            <Check className="w-10 h-10 text-emerald-600 dark:text-emerald-300" strokeWidth={3} />
          </div>

          <div>
            <h3 className="text-xl font-black">
              {isGift ? `Billet offert à ${friendName || 'votre ami'} !` : 'Commande validée !'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
              {isGift
                ? `L'achat est confirmé. Le pass est attribué à votre ami et enregistré dans votre onglet « Billets offerts ».`
                : quantity === 1
                ? 'Votre pass d’entrée est prêt dans l’onglet « Mes billets ».'
                : `${quantity} billets générés avec succès.`}
            </p>
          </div>

          {/* Action cadeau directe WhatsApp / Copie */}
          {isGift && (
            <div className="w-full p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 text-left space-y-3">
              <span className="text-xs font-bold text-[#6600FF] dark:text-purple-300 block">
                Envoyer le pass d'accès à {friendName || 'votre ami'}
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const waNumber = toWhatsAppNumber(friendPhone);
                    const eventTitle = event.title;
                    const text = `Salut ${friendName || 'l\'ami'} ! Je t'ai offert un billet pour ${eventTitle} sur Gbaïgbancê 🎟️. Voici ton pass : ${claimLink}`;
                    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
                    if (waNumber) window.open(waUrl, '_blank');
                  }}
                  className="min-h-11 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all motion-reduce:transition-none shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#14121E]"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Sur WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(claimLink);
                    setCopiedLink(true);
                    haptic.selection();
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="min-h-11 py-2.5 px-3 rounded-xl bg-white text-[#6600FF] border border-purple-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] focus-visible:ring-offset-2 dark:bg-[#14121E] dark:text-[#C4B5FD] dark:border-purple-400/30 dark:focus-visible:ring-offset-[#14121E]"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Lien copié !' : 'Copier lien'}</span>
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              const firstQr = firstTicket?.qr_code || 'GBC-OK';
              onSuccess(firstQr);
              handleCloseModal();
            }}
            className="w-full min-h-12 py-3.5 rounded-2xl bg-[#6600FF] text-white font-bold text-sm active:scale-98 transition-transform motion-reduce:transition-none shadow-lg shadow-purple-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#14121E]"
          >
            {isGift ? 'Voir dans mes billets offerts' : 'Accéder à mes billets'}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleCloseModal} title="Réserver des billets">
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        {/* En-tête de l'événement compact */}
        <div className="flex items-center gap-3 p-3 bg-[#6600FF]/5 dark:bg-white/5 rounded-2xl">
          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
            <img src={event.cover_url || ''} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-[#1A1A2E] dark:text-white text-sm truncate">{event.title}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{event.city} · {event.location_name}</p>
          </div>
        </div>

        {eventUnavailable ? (
          <div className="text-center py-8">
            <Ticket className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#171726] dark:text-white">Réservation indisponible</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Les ventes ne sont pas ouvertes pour cet événement.</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#6600FF] animate-spin motion-reduce:animate-none" />
          </div>
        ) : fetchError ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#171726] dark:text-white">Inventaire indisponible</p>
            <button
              type="button"
              onClick={loadOptions}
              className="mt-3 min-h-11 px-6 py-2 rounded-full bg-[#6600FF] text-white text-xs font-bold inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#14121E]"
            >
              <RotateCw className="w-3.5 h-3.5" /> Réessayer
            </button>
          </div>
        ) : options.length === 0 ? (
          <div className="text-center py-8">
            <Ticket className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Aucune option de billet configurée.</p>
          </div>
        ) : soldOut ? (
          <div className="text-center py-8">
            <Ticket className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-red-500 dark:text-red-300">Événement complet</p>
          </div>
        ) : (
          <>
            {/* 1. Choix du pass */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">1. Catégorie de pass</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {options.map((opt) => {
                  const optAvailable = Math.max(0, (Number(opt.quantity_total) || 0) - (Number(opt.quantity_sold) || 0));
                  const isSelected = selectedOption?.id === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        haptic.selection();
                        setSelectedOption(opt);
                        handleQuantityChange(1);
                      }}
                      disabled={optAvailable <= 0}
                      aria-pressed={isSelected}
                      className={`min-h-11 p-3 rounded-2xl border-2 transition-colors motion-reduce:transition-none text-left flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#14121E] ${
                        isSelected
                          ? 'border-[#6600FF] bg-[#6600FF]/10'
                          : 'border-gray-200 hover:border-[#6600FF]/30 dark:border-white/[0.12] dark:hover:border-[#A78BFA]/40'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-xs text-[#1A1A2E] dark:text-white">{opt.label || opt.ticket_type.toUpperCase()}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{optAvailable > 0 ? `${optAvailable} restants` : 'Complet'}</p>
                      </div>
                      <span className="font-extrabold text-[#6600FF] text-xs">
                        {opt.price === 0 ? 'Gratuit' : `${opt.price.toLocaleString('fr-FR')} F`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Destination du billet : Pour moi OU Offrir à un ami */}
            {selectedOption && available > 0 && (
              <div className="space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">2. Titulaire du billet</p>

                {/* Segmented Control Apple Style */}
                <div className="grid grid-cols-2 p-1 bg-gray-100 dark:bg-white/10 rounded-2xl" role="radiogroup" aria-label="Titulaire du billet">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={purchaseTarget === 'self'}
                    onClick={() => handleTogglePurchaseTarget('self')}
                    className={`min-h-11 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] ${
                      purchaseTarget === 'self'
                        ? 'bg-white text-[#17131D] shadow-xs dark:bg-[#14121E] dark:text-white'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    <Ticket className="w-3.5 h-3.5" /> Pour moi
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={purchaseTarget === 'friend'}
                    onClick={() => handleTogglePurchaseTarget('friend')}
                    className={`min-h-11 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] ${
                      purchaseTarget === 'friend'
                        ? 'bg-white text-[#6600FF] shadow-xs dark:bg-[#14121E] dark:text-[#C4B5FD]'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    <Gift className="w-3.5 h-3.5 text-[#6600FF]" /> Offrir à un ami
                  </button>
                </div>

                {/* Formulaire si Offrir à un ami */}
                {purchaseTarget === 'friend' && (
                  <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-[#6600FF]/10 border border-purple-200/80 dark:border-purple-400/25 space-y-3">
                    <div className="space-y-1">
                      <label htmlFor="friend_name_input" className="text-[11px] font-bold text-gray-700 dark:text-gray-200 block cursor-pointer">
                        Nom & prénom de votre ami(e)
                      </label>
                      <input
                        id="friend_name_input"
                        type="text"
                        inputMode="text"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        value={friendName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFriendName(val);
                          handleUpdateRecipient(0, 'recipient_name', val);
                        }}
                        placeholder="Ex: Koffi Mensah"
                        className="w-full min-h-11 px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#14121E] border border-purple-200 dark:border-purple-400/30 text-base text-[#17131D] dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#14121E] transition-colors motion-reduce:transition-none"
                      />
                    </div>

                    {/* Suggestions d'amis suivis positionnées SOUS le champ nom pour ne jamais déplacer l'input ni fermer le clavier */}
                    {followingFriends.length > 0 && (
                      <div className="space-y-1.5 pt-0.5">
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 block">
                          Suggestions parmi vos amis :
                        </span>
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                          {followingFriends
                            .filter((f) => !friendName.trim() || f.name.toLowerCase().includes(friendName.trim().toLowerCase()))
                            .map((f) => {
                              const isSelected = selectedFriendId === f.id;
                              return (
                                <button
                                  key={f.id}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => handleSelectFollowedFriend(f)}
                                  className={`flex items-center min-h-11 gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors motion-reduce:transition-none border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] ${
                                    isSelected
                                      ? 'bg-[#6600FF] text-white border-[#6600FF] shadow-xs'
                                      : 'bg-white text-gray-700 border-purple-200 hover:border-[#6600FF]/40 dark:bg-[#14121E] dark:text-gray-200 dark:border-white/[0.12]'
                                  }`}
                                >
                                  <UserAvatar id={f.id} name={f.name} src={f.avatar_url} size="xs" ring={false} />
                                  <span>{f.name}</span>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label htmlFor="friend_phone_input" className="text-[11px] font-bold text-gray-700 dark:text-gray-200 block cursor-pointer">
                        Numéro de téléphone de l'ami (WhatsApp / Appel)
                      </label>
                      <input
                        id="friend_phone_input"
                        type="tel"
                        inputMode="tel"
                        autoComplete="off"
                        autoCorrect="off"
                        value={friendPhone}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFriendPhone(val);
                          handleUpdateRecipient(0, 'recipient_phone', val);
                        }}
                        placeholder="Ex: 90 12 34 56"
                        className="w-full min-h-11 px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#14121E] border border-purple-200 dark:border-purple-400/30 text-base text-[#17131D] dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#14121E] transition-colors motion-reduce:transition-none"
                      />
                    </div>

                    <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
                      💡 Le pass sera généré pour votre ami(e). Vous retrouverez la confirmation d'achat dans votre onglet « Billets offerts ».
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 3. Sélecteur de Quantité */}
            {selectedOption && available > 1 && (
              <div className="p-3 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#1A1A2E] dark:text-white block">Quantité</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    {purchaseTarget === 'friend' ? 'Billets pour des amis' : 'Places pour vous ou accompagnateurs'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    aria-label="Diminuer la quantité"
                    className="w-11 h-11 rounded-full bg-white dark:bg-[#14121E] dark:text-white shadow-sm border border-gray-200 dark:border-white/[0.12] flex items-center justify-center disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF]"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-sm min-w-[1.5rem] text-center tabular-nums text-[#1A1A2E] dark:text-white">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(Math.min(available, quantity + 1))}
                    disabled={quantity >= available || quantity >= 10}
                    aria-label="Augmenter la quantité"
                    className="w-11 h-11 rounded-full bg-white dark:bg-[#14121E] dark:text-white shadow-sm border border-gray-200 dark:border-white/[0.12] flex items-center justify-center disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Bénéficiaires supplémentaires si quantité > 1 */}
            {selectedOption && quantity > 1 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Noms des titulaires ({quantity} places)
                </p>
                <div className="space-y-2">
                  {recipients.map((r, i) => (
                    <div key={i} className="p-2.5 rounded-xl border border-gray-200 dark:border-white/[0.12] bg-white dark:bg-[#14121E] flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-12">#{i + 1}</span>
                      <input
                        type="text"
                        value={r.recipient_name}
                        onChange={(e) => {
                          const value = e.target.value;
                          handleUpdateRecipient(i, 'recipient_name', value);
                          if (purchaseTarget === 'friend' && i === 0) setFriendName(value);
                        }}
                        placeholder={`Bénéficiaire place #${i + 1}`}
                        className="flex-1 min-h-11 px-3 py-2 rounded-xl border border-gray-200 dark:border-white/[0.12] bg-white dark:bg-[#0c0a14] text-base text-[#17131D] dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] transition-colors motion-reduce:transition-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Paiement Mobile Money — inutile pour un pass gratuit */}
            {selectedOption && available > 0 && !isFreeCheckout && (
              <div className="space-y-2.5 pt-1">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" /> 3. Règlement Mobile Money
                </p>

                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Opérateur Mobile Money">
                  {[
                    { id: 'tmoney', name: 'T-Money' },
                    { id: 'flooz', name: 'Flooz' },
                  ].map((op) => (
                    <button
                      key={op.id}
                      type="button"
                      role="radio"
                      aria-checked={paymentProvider === op.id}
                      onClick={() => setPaymentProvider(op.id as PaymentProvider)}
                      className={`min-h-11 py-2 px-3 rounded-xl border text-xs text-center font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#14121E] ${
                        paymentProvider === op.id
                          ? 'border-[#6600FF] bg-[#6600FF]/10 text-[#6600FF] dark:text-[#C4B5FD]'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-white/[0.12] dark:text-gray-300 dark:hover:border-white/25'
                      }`}
                    >
                      {op.name}
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <label htmlFor="buyer_phone_input" className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1 cursor-pointer">
                    <Phone className="w-3 h-3 text-[#6600FF]" /> Numéro de débit (Acheteur)
                  </label>
                  <input
                    id="buyer_phone_input"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={paymentPhone}
                    onChange={(e) => setPaymentPhone(e.target.value)}
                    placeholder="Ex: 90 12 34 56"
                    className="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/[0.12] bg-white dark:bg-[#14121E] text-base text-[#17131D] dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#14121E] transition-colors motion-reduce:transition-none"
                  />
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 block">
                    L'acheteur reste la référence financière pour tout remboursement éventuel.
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div role="alert" className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-400/30 text-rose-700 dark:text-rose-200 text-xs flex items-center justify-between gap-2 animate-fade-in motion-reduce:animate-none">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-300" />
                  <span className="font-semibold">{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="min-h-11 px-2 text-[11px] font-bold text-rose-600 dark:text-rose-200 underline hover:text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded-lg"
                >
                  Fermer
                </button>
              </div>
            )}

            {/* Total et Bouton Final */}
            {selectedOption && available > 0 && (
              <div className="border-t border-black/[0.06] dark:border-white/[0.08] pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">Total à payer</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 block">
                      {isFreeCheckout ? 'Confirmation immédiate, sans débit' : 'Débit Mobile Money sur le numéro indiqué'}
                    </span>
                    {!isFreeCheckout && feeBreakdown && feeBreakdown.total_amount > 0 && (
                      <span className="text-[10px] text-[#6600FF]/80 font-medium block mt-0.5">
                        Inclut {feeBreakdown.platform_fee.toLocaleString('fr-FR')} F frais de service ({feeBreakdown.fee_percent}% + {feeBreakdown.fixed_fee} F)
                      </span>
                    )}
                    {stockMeta && stockMeta.percent_sold >= 80 && stockMeta.percent_sold < 100 && (
                      <span className="text-[10px] text-amber-600 font-bold block mt-0.5">
                        Places limitées : {stockMeta.percent_sold}% vendues ({stockMeta.remaining} restantes)
                      </span>
                    )}
                  </div>
                  <span className="text-xl font-black text-[#1A1A2E] dark:text-white">
                    {isFreeCheckout ? 'Gratuit' : `${(feeBreakdown?.total_amount ?? totalPrice).toLocaleString('fr-FR')} F CFA`}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleBook}
                  disabled={booking}
                  className="w-full min-h-12 py-3.5 rounded-2xl bg-[#6600FF] hover:bg-[#5200cc] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98 transition-all motion-reduce:transition-none shadow-md shadow-purple-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#14121E]"
                >
                  {booking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
                      Génération du billet...
                    </>
                  ) : (
                    <>
                      {purchaseTarget === 'friend' ? <Gift className="w-4 h-4" /> : <Ticket className="w-4 h-4" />}
                      {purchaseTarget === 'friend'
                        ? `Offrir à ${friendName || 'mon ami'} (${isFreeCheckout ? 'Gratuit' : `${totalPrice.toLocaleString('fr-FR')} F`})`
                        : isFreeCheckout
                        ? `Confirmer ${quantity} billet${quantity > 1 ? 's' : ''} gratuit${quantity > 1 ? 's' : ''}`
                        : `Payer et valider (${quantity} billet${quantity > 1 ? 's' : ''})`}
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