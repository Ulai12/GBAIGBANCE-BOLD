import React, { useState } from 'react';
import { Flag, X, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';

interface EventReportModalProps {
  isOpen: boolean;
  eventTitle: string;
  onClose: () => void;
  onReportSubmitted: (reason: string) => void;
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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      onReportSubmitted(selectedReason);
      setSubmitted(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] bg-white dark:bg-[#151126] border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Header avec poignée et badge TODO */}
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
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                    TODO • Démo
                  </span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[260px]">
                  {eventTitle}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 flex items-center justify-center text-gray-500 dark:text-gray-300 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notice informative TODO */}
        <div className="mx-6 mt-4 p-3 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed font-medium">
            <strong>Module en cours de déploiement (TODO) :</strong> La modération communautaire et la revue juridique automatisée sont actuellement en phase de test. Vos signalements aident à préserver la sécurité de la communauté.
          </p>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="text-lg font-black text-[#1A1A2E] dark:text-white">
              Signalement transmis
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              Merci pour votre vigilance. Notre équipe étudiera cette alerte dans les plus brefs délais.
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
                className="flex-1 min-h-[46px] rounded-2xl bg-[#6600FF] hover:bg-[#5200cc] active:scale-[0.98] text-white text-xs font-extrabold transition-all shadow-lg shadow-[#6600FF]/25 flex items-center justify-center gap-2"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Confirmer l'alerte</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
