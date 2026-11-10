import React, { useState } from 'react';
import { Flag, X, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';

interface EventReportModalProps {
  isOpen: boolean;
  eventTitle: string;
  onClose: () => void;
  onReportSubmitted: (reason: string, comment: string) => Promise<{ remote: boolean; message: string }>;
}

const REPORT_REASONS = [
  { id: 'fake_scam', label: 'Événement fictif ou suspicion d’arnaque' },
  { id: 'wrong_info', label: 'Informations inexactes (date, lieu, tarifs)' },
  { id: 'inappropriate', label: 'Contenu inapproprié ou offensant' },
  { id: 'copyright', label: 'Atteinte aux droits d’auteur ou à l’image' },
  { id: 'other', label: 'Autre motif' },
];

export const EventReportModal: React.FC<EventReportModalProps> = ({
  isOpen,
  eventTitle,
  onClose,
  onReportSubmitted,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('fake_scam');
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultText, setResultText] = useState('');
  const [sentRemote, setSentRemote] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await onReportSubmitted(selectedReason, comment);
      setSentRemote(result.remote);
      setResultText(result.message);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setComment('');
        onClose();
      }, 1400);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] bg-white dark:bg-[#151126] border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Header avec poignée */}
        <div className="pt-3 px-6 pb-4 border-b border-black/5 dark:border-white/10 relative">
          <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-white/20 mx-auto mb-3 sm:hidden" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Flag className="w-4 h-4 fill-current" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#1A1A2E] dark:text-white flex items-center gap-2">
                  <span>Signaler cet événement</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[260px]">
                  {eventTitle}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 flex items-center justify-center text-gray-500 dark:text-gray-300 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notice informative */}
        <div className="mx-6 mt-4 p-3 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed font-medium">
            Le motif est enregistré et transmis à la modération ainsi qu’à l’organisateur.
          </p>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="text-lg font-black text-[#1A1A2E] dark:text-white">
              {sentRemote ? 'Signalement transmis' : 'Signalement conservé'}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              {resultText || 'Merci pour votre vigilance.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                Motif principal
              </label>
              <div className="space-y-2">
                {REPORT_REASONS.map((reason) => (
                  <label
                    key={reason.id}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                      selectedReason === reason.id
                        ? 'border-[#6600FF] bg-[#6600FF]/5 dark:bg-[#6600FF]/15 text-[#6600FF] dark:text-purple-300 font-bold'
                        : 'border-black/5 dark:border-white/10 hover:bg-black/[0.02] dark:hover:bg-white/[0.04] text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={reason.id}
                      checked={selectedReason === reason.id}
                      onChange={() => setSelectedReason(reason.id)}
                      className="accent-[#6600FF] w-4 h-4 shrink-0"
                    />
                    <span className="text-xs sm:text-sm">{reason.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Précisions supplémentaires (facultatif)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Indiquez des détails utiles pour les modérateurs..."
                className="w-full p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-xs sm:text-sm text-[#1A1A2E] dark:text-white placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-[#6600FF]"
              />
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 min-h-[46px] rounded-2xl glass-ios hover:bg-gray-100 dark:hover:bg-white/10 text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 min-h-[46px] rounded-2xl bg-[#6600FF] hover:bg-[#5200cc] active:scale-[0.98] text-white text-xs font-extrabold transition-all shadow-lg shadow-[#6600FF]/25 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>{submitting ? 'Envoi…' : "Confirmer l'alerte"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
