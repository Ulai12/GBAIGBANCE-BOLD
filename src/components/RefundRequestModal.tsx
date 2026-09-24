import React, { useState } from 'react';
import { RotateCcw, X, ShieldAlert, CheckCircle2, Phone, AlertTriangle, ArrowRight } from 'lucide-react';
import type { Ticket, PaymentProvider } from '@/types';
import { requestTicketRefund } from '@/features/tickets/service';

interface RefundRequestModalProps {
  ticket: Ticket;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RefundRequestModal: React.FC<RefundRequestModalProps> = ({
  ticket,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [provider, setProvider] = useState<PaymentProvider>('tmoney');
  const [phone, setPhone] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const eventStatus = ticket.event?.status || 'published';
  const isCancelled = eventStatus === 'cancelled';
  const isPostponed = eventStatus === 'postponed';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await requestTicketRefund({
        ticketId: ticket.id,
        reasonDetails: details,
        refundPhone: phone.trim() ? phone.trim() : undefined,
        paymentProvider: provider,
      });

      if (!res.success) {
        setError(res.error || 'Impossible d\'enregistrer la demande de remboursement');
        setLoading(false);
        return;
      }

      setSuccessMessage(res.message || 'Demande de remboursement validée avec succès !');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur inattendue est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl p-6 text-white space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Demande de Remboursement</h3>
              <p className="text-xs text-white/60">Billet #{ticket.id.slice(0, 8)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message de succès */}
        {successMessage ? (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-3 text-emerald-200 text-sm">
            <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
            <div>
              <p className="font-semibold">Demande enregistrée</p>
              <p className="text-xs text-emerald-300/80">{successMessage}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Bannière de contexte */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <div className="font-semibold text-white/90 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                {isCancelled
                  ? 'Événement Annulé (100% remboursable sans frais)'
                  : isPostponed
                  ? 'Événement Reporté (Remboursement garanti sous 7 jours)'
                  : 'Demande soumise à validation de l\'organisateur'}
              </div>
              <p className="text-white/60 leading-relaxed">
                Montant qui vous sera recrédité :{' '}
                <strong className="text-white font-mono text-sm">
                  {ticket.price_paid.toLocaleString('fr-FR')} {ticket.currency || 'XOF'}
                </strong>
              </p>
            </div>

            {/* Choix de l'opérateur Mobile Money */}
            <div className="space-y-1.5">
              <label className="font-semibold text-white/80 block">
                Opérateur Mobile Money de réception
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'tmoney', name: 'T-Money (Togo)' },
                  { id: 'flooz', name: 'Flooz (Moov)' },
                  { id: 'mtn', name: 'MTN MoMo (Bénin)' },
                ].map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setProvider(op.id as PaymentProvider)}
                    className={`py-2 px-2.5 rounded-xl border text-center transition-all ${
                      provider === op.id
                        ? 'bg-purple-600/30 border-purple-500 text-white font-bold'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {op.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Numéro de téléphone */}
            <div className="space-y-1.5">
              <label className="font-semibold text-white/80 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-purple-400" /> Numéro de téléphone Mobile Money
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 90000000 (Togo) ou 97000000 (Bénin)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 text-white placeholder-white/30 text-xs outline-none"
              />
              <span className="text-[10px] text-white/50 block">
                Laissez vide pour utiliser le numéro du paiement d'origine.
              </span>
            </div>

            {/* Motif / Commentaire */}
            <div className="space-y-1.5">
              <label className="font-semibold text-white/80 block">
                Commentaire ou précision (optionnel)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Indiquez toute précision utile pour l'organisateur..."
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 text-white placeholder-white/30 text-xs outline-none resize-none"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95 transition-all shadow-lg shadow-rose-900/30"
              >
                {loading ? 'Traitement...' : 'Confirmer la demande'}
                {!loading && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
