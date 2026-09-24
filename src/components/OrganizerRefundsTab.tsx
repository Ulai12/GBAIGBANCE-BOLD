import React, { useState, useEffect, useCallback } from 'react';
import { Check, X, Phone, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { reviewRefund } from '@/features/tickets/service';
import type { TicketRefund } from '@/types';

interface OrganizerRefundsTabProps {
  organizerUserId: string;
  onToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
}

export const OrganizerRefundsTab: React.FC<OrganizerRefundsTabProps> = ({ organizerUserId, onToast }) => {
  const [refunds, setRefunds] = useState<TicketRefund[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionModalRefund, setRejectionModalRefund] = useState<TicketRefund | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadRefunds = useCallback(async () => {
    setLoading(true);
    try {
      // Récupération des demandes de remboursement des événements de cet organisateur
      const { data, error } = await supabase
        .from('ticket_refunds')
        .select('*, ticket:tickets(*), event:events!inner(title, organizer_user_id)')
        .eq('event.organizer_user_id', organizerUserId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRefunds(data as TicketRefund[]);
      }
    } catch {
      // Ignorer
    } finally {
      setLoading(false);
    }
  }, [organizerUserId]);

  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

  const handleApprove = async (refund: TicketRefund) => {
    setProcessingId(refund.id);
    try {
      const res = await reviewRefund({
        refundId: refund.id,
        action: 'approve',
      });
      if (res.success) {
        onToast({ message: 'Remboursement approuvé ! Le crédit Mobile Money a été déclenché.', type: 'success' });
        loadRefunds();
      } else {
        onToast({ message: res.error || 'Erreur lors de l’approbation', type: 'error' });
      }
    } catch {
      onToast({ message: 'Erreur inattendue', type: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectionModalRefund) return;
    setProcessingId(rejectionModalRefund.id);
    try {
      const res = await reviewRefund({
        refundId: rejectionModalRefund.id,
        action: 'reject',
        rejectionReason: rejectReason.trim() || 'Demande non conforme à la politique de l’organisateur.',
      });
      if (res.success) {
        onToast({ message: 'Demande de remboursement refusée. Le ticket a été réactivé.', type: 'info' });
        setRejectionModalRefund(null);
        setRejectReason('');
        loadRefunds();
      } else {
        onToast({ message: res.error || 'Erreur lors du refus', type: 'error' });
      }
    } catch {
      onToast({ message: 'Erreur inattendue', type: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingRefunds = refunds.filter((r) => r.status === 'requested' || r.status === 'under_review');
  const pastRefunds = refunds.filter((r) => r.status !== 'requested' && r.status !== 'under_review');

  if (loading) {
    return (
      <div className="py-12 flex justify-center text-xs text-gray-500">
        Chargement des demandes de remboursement...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs">
      {/* En attente */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-[#1A1A2E] dark:text-white flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-500" />
            Demandes en attente ({pendingRefunds.length})
          </h3>
          <span className="text-[11px] text-gray-500">Validation sous 48h recommandée</span>
        </div>

        {pendingRefunds.length === 0 ? (
          <div className="p-6 rounded-2xl bg-gray-50 dark:bg-white/5 text-center text-gray-400">
            Aucune demande de remboursement en attente.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRefunds.map((ref) => (
              <div
                key={ref.id}
                className="p-4 rounded-2xl bg-white dark:bg-[#1A1829] border border-black/5 dark:border-white/10 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-[#1A1A2E] dark:text-white block text-sm">
                      Billet #{ref.ticket_id.slice(0, 8)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      Motif : <strong className="text-[#6600FF]">{ref.reason_type}</strong>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-[#1A1A2E] dark:text-white block">
                      {ref.amount_xof.toLocaleString('fr-FR')} {ref.currency || 'XOF'}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(ref.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                    <Phone className="w-3.5 h-3.5 text-[#6600FF]" />
                    {ref.payment_provider?.toUpperCase()} • {ref.refund_phone}
                  </span>
                  {ref.reason_details && (
                    <span className="text-gray-500 italic truncate max-w-[150px]">
                      "{ref.reason_details}"
                    </span>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={processingId === ref.id}
                    onClick={() => setRejectionModalRefund(ref)}
                    className="flex-1 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 font-bold flex items-center justify-center gap-1 active:scale-95 transition-all"
                  >
                    <X className="w-3.5 h-3.5" /> Refuser
                  </button>
                  <button
                    type="button"
                    disabled={processingId === ref.id}
                    onClick={() => handleApprove(ref)}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1 active:scale-95 transition-all shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" /> Approuver le remboursement
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historique */}
      {pastRefunds.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="font-bold text-sm text-[#1A1A2E] dark:text-white">
            Historique traité ({pastRefunds.length})
          </h3>
          <div className="space-y-2">
            {pastRefunds.map((ref) => (
              <div
                key={ref.id}
                className="p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-gray-800 dark:text-gray-200 block">
                    Billet #{ref.ticket_id.slice(0, 8)}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {ref.refund_phone} ({ref.payment_provider?.toUpperCase()})
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      ref.status === 'refunded' || ref.status === 'approved'
                        ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {ref.status === 'refunded' ? (
                      <><CheckCircle2 className="w-3 h-3" /> Remboursé</>
                    ) : ref.status === 'rejected' ? (
                      <><XCircle className="w-3 h-3" /> Refusé</>
                    ) : (
                      ref.status
                    )}
                  </span>
                  <span className="block text-[10px] font-semibold text-gray-500 mt-0.5">
                    {ref.amount_xof.toLocaleString('fr-FR')} {ref.currency || 'XOF'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de motif de refus */}
      {rejectionModalRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-3xl p-5 text-white space-y-4">
            <h4 className="font-bold text-sm">Refuser la demande de remboursement</h4>
            <p className="text-xs text-white/60">
              Veuillez indiquer la raison du refus (visible par le client). Le billet sera automatiquement redégelé et réactivé.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex: Demande hors délai, événement maintenu sans changement majeur..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white outline-none resize-none focus:border-[#6600FF]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRejectionModalRefund(null)}
                className="flex-1 py-2 rounded-xl bg-white/10 text-white/70 font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
              >
                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
