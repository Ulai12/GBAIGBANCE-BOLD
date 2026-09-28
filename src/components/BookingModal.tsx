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
import { purchaseTicketsMulti, type TicketRecipientInput } from '@/features/tickets/service';
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
    if (target === 'friend') {
      setRecipients([
        {
          recipient_name: friendName.trim() || 'Mon ami',
          recipient_phone: friendPhone.trim(),
          recipient_user_id: selectedFriendId || undefined,
          is_for_me: false,
        },
      ]);
    } else {
      setSelectedFriendId(null);
      setRecipients([
        {
          recipient_name: user?.name || 'Moi-même',
          recipient_phone: user?.phone || '',
          is_for_me: true,
        },
      ]);
    }
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
            recipient_name: purchaseTarget === 'friend' ? (friendName.trim() || `Ami #${i + 1}`) : `Ami #${i + 1}`,
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

  const available = selectedOption ? selectedOption.quantity_total - selectedOption.quantity_sold : 0;
  const soldOut = options.length > 0 && options.every((o) => o.quantity_sold >= o.quantity_total);
  const eventUnavailable = isEventTerminated(event) || hasEventEnded(event);
  const unitPrice = selectedOption ? selectedOption.price : 0;
  const totalPrice = unitPrice * quantity;

  const handleBook = async () => {
    if (!selectedOption || !event) return;
    if (quantity > available) {
      setError('Quantité demandée supérieure au stock disponible.');
      return;
    }

    if (purchaseTarget === 'friend' && !friendName.trim()) {
      setError('Veuillez renseigner le nom ou prénom de votre ami(e).');
      return;
    }

    if (!paymentPhone.trim() || paymentPhone.trim().length < 8) {
      setError('Veuillez renseigner un numéro de téléphone Mobile Money valide.');
      return;
    }

    haptic.medium();
    setError(null);
    setBooking(true);

    try {
      const callerUserId = user?.id || `guest-${Date.now()}`;
      
      // Préparation finale des bénéficiaires
      const finalRecipients = recipients.map((r, i) => {
        if (purchaseTarget === 'friend') {
          return {
            recipient_name: (i === 0 ? friendName.trim() : r.recipient_name) || `Ami #${i + 1}`,
            recipient_phone: (i === 0 ? friendPhone.trim() : r.recipient_phone) || '',
            is_for_me: false,
          };
        }
        return r;
      });

      const res = await purchaseTicketsMulti({
        eventId: event.id,
        ticketOptionId: selectedOption.id,
        recipients: finalRecipients,
        paymentProvider,
        paymentPhone: paymentPhone.trim(),
        userId: callerUserId,
        buyerName: user?.name || 'Un ami',
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
    const firstTicket = createdTicketsSummary[0];
    const claimLink = firstTicket?.claim_token ? `${origin}/#claim=${firstTicket.claim_token}` : origin;
    const isGift = purchaseTarget === 'friend';

    return (
      <Modal open={open} onClose={handleCloseModal} title="">
        <div className="flex flex-col items-center justify-center py-6 text-center text-[#1A1A2E] space-y-4">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center animate-bounce-in">
            <Check className="w-10 h-10 text-emerald-600" strokeWidth={3} />
          </div>

          <div>
            <h3 className="text-xl font-black">
              {isGift ? `Billet offert à ${friendName || 'votre ami'} !` : 'Commande validée !'}
            </h3>
            <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
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
                    const eventTitle = event.title;
                    const text = `Salut ${friendName || 'l\'ami'} ! Je t'ai offert un billet pour ${eventTitle} sur Gbaïgbancê 🎟️. Voici ton pass : ${claimLink}`;
                    const waUrl = `https://wa.me/${friendPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
                    window.open(waUrl, '_blank');
                  }}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs"
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
                  className="py-2.5 px-3 rounded-xl bg-white text-[#6600FF] border border-purple-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
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
            className="w-full py-3.5 rounded-2xl bg-[#6600FF] text-white font-bold text-sm active:scale-98 transition-transform shadow-lg shadow-purple-900/20"
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
        <div className="flex items-center gap-3 p-3 bg-[#6600FF]/5 rounded-2xl">
          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
            <img src={event.cover_url || ''} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-[#1A1A2E] text-sm truncate">{event.title}</h4>
            <p className="text-xs text-gray-500 truncate">{event.city} · {event.location_name}</p>
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
            <p className="text-sm font-semibold text-red-500">Événement complet</p>
          </div>
        ) : (
          <>
            {/* 1. Choix du pass */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">1. Catégorie de pass</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {options.map((opt) => {
                  const optAvailable = opt.quantity_total - opt.quantity_sold;
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
                      className={`p-3 rounded-2xl border-2 transition-all text-left flex items-center justify-between ${
                        isSelected
                          ? 'border-[#6600FF] bg-[#6600FF]/10'
                          : 'border-gray-200 hover:border-[#6600FF]/30'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-xs text-[#1A1A2E]">{opt.label || opt.ticket_type.toUpperCase()}</p>
                        <p className="text-[10px] text-gray-500">{optAvailable > 0 ? `${optAvailable} restants` : 'Complet'}</p>
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
                <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => handleTogglePurchaseTarget('self')}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      purchaseTarget === 'self'
                        ? 'bg-white text-[#17131D] shadow-xs'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Ticket className="w-3.5 h-3.5" /> Pour moi
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTogglePurchaseTarget('friend')}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      purchaseTarget === 'friend'
                        ? 'bg-white text-[#6600FF] shadow-xs'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Gift className="w-3.5 h-3.5 text-[#6600FF]" /> Offrir à un ami
                  </button>
                </div>

                {/* Formulaire si Offrir à un ami */}
                {purchaseTarget === 'friend' && (
                  <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/80 space-y-3">
                    <div className="space-y-1">
                      <label htmlFor="friend_name_input" className="text-[11px] font-bold text-gray-700 block cursor-pointer">
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
                        className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white border border-purple-200 text-sm text-[#1A1A2E] outline-none focus:ring-2 focus:ring-[#6600FF]/25 focus:border-[#6600FF] transition-all"
                      />
                    </div>

                    {/* Suggestions d'amis suivis positionnées SOUS le champ nom pour ne jamais déplacer l'input ni fermer le clavier */}
                    {followingFriends.length > 0 && (
                      <div className="space-y-1.5 pt-0.5">
                        <span className="text-[10px] font-semibold text-gray-500 block">
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
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                                    isSelected
                                      ? 'bg-[#6600FF] text-white border-[#6600FF] shadow-xs'
                                      : 'bg-white text-gray-700 border-purple-200 hover:border-[#6600FF]/40'
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
                      <label htmlFor="friend_phone_input" className="text-[11px] font-bold text-gray-700 block cursor-pointer">
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
                        className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white border border-purple-200 text-sm text-[#1A1A2E] outline-none focus:ring-2 focus:ring-[#6600FF]/25 focus:border-[#6600FF] transition-all"
                      />
                    </div>

                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      💡 Le pass sera généré pour votre ami(e). Vous retrouverez la confirmation d'achat dans votre onglet « Billets offerts ».
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 3. Sélecteur de Quantité */}
            {selectedOption && available > 1 && (
              <div className="p-3 rounded-2xl bg-gray-50 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#1A1A2E] block">Quantité</span>
                  <span className="text-[10px] text-gray-500">
                    {purchaseTarget === 'friend' ? 'Billets pour des amis' : 'Places pour vous ou accompagnateurs'}
                  </span>
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
                  <span className="font-bold text-xs w-4 text-center">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(Math.min(available, quantity + 1))}
                    disabled={quantity >= available || quantity >= 10}
                    className="w-8 h-8 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center disabled:opacity-40"
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
                    <div key={i} className="p-2.5 rounded-xl border border-gray-200 bg-white flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 w-12">#{i + 1}</span>
                      <input
                        type="text"
                        value={r.recipient_name}
                        onChange={(e) => handleUpdateRecipient(i, 'recipient_name', e.target.value)}
                        placeholder={`Bénéficiaire place #${i + 1}`}
                        className="flex-1 min-h-[44px] px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#6600FF]/25 focus:border-[#6600FF]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Paiement Mobile Money (T-Money et Flooz uniquement, MTN MoMo supprimé) */}
            {selectedOption && available > 0 && (
              <div className="space-y-2.5 pt-1">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" /> 3. Règlement Mobile Money
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'tmoney', name: 'T-Money' },
                    { id: 'flooz', name: 'Flooz' },
                  ].map((op) => (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setPaymentProvider(op.id as PaymentProvider)}
                      className={`min-h-[44px] py-2 px-3 rounded-xl border text-xs text-center font-bold transition-all ${
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
                  <label htmlFor="buyer_phone_input" className="text-[11px] font-semibold text-gray-600 flex items-center gap-1 cursor-pointer">
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
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-[#1A1A2E] outline-none focus:ring-2 focus:ring-[#6600FF]/25 focus:border-[#6600FF] transition-all"
                  />
                  <span className="text-[10px] text-gray-400 block">
                    L'acheteur reste la référence financière pour tout remboursement éventuel.
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-2 animate-fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span className="font-semibold">{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-[11px] font-bold text-rose-600 underline hover:text-rose-800"
                >
                  Fermer
                </button>
              </div>
            )}

            {/* Total et Bouton Final */}
            {selectedOption && available > 0 && (
              <div className="border-t pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-500 block">Total à payer</span>
                    <span className="text-[10px] text-gray-400">15 min de réservation de stock</span>
                  </div>
                  <span className="text-xl font-black text-[#1A1A2E]">
                    {totalPrice.toLocaleString('fr-FR')} F CFA
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleBook}
                  disabled={booking}
                  className="w-full min-h-[48px] py-3.5 rounded-2xl bg-[#6600FF] hover:bg-[#5200cc] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98 transition-all shadow-md shadow-purple-900/20"
                >
                  {booking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Génération du billet...
                    </>
                  ) : (
                    <>
                      {purchaseTarget === 'friend' ? <Gift className="w-4 h-4" /> : <Ticket className="w-4 h-4" />}
                      {purchaseTarget === 'friend'
                        ? `Offrir à ${friendName || 'mon ami'} (${totalPrice.toLocaleString('fr-FR')} F)`
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
