import React, { useState } from 'react';
import { Flame, X, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import type { Ticket } from '@/types';
import { completePresenceChallenge } from '@/features/tickets/service';

interface PresenceChallengeModalProps {
  ticket: Ticket;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PresenceChallengeModal: React.FC<PresenceChallengeModalProps> = ({
  ticket,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedNodes, setSelectedNodes] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number>(3 - (ticket.challenge_attempts || 0));

  if (!isOpen) return null;

  const nodes = [1, 2, 3, 4];

  const handleNodeClick = (node: number) => {
    if (selectedNodes.length >= 4) return;
    if (selectedNodes.includes(node)) {
      // Déselectionne si dernier cliqué
      if (selectedNodes[selectedNodes.length - 1] === node) {
        setSelectedNodes((prev) => prev.slice(0, -1));
      }
      return;
    }
    const next = [...selectedNodes, node];
    setSelectedNodes(next);
  };

  const handleResetPattern = () => {
    setSelectedNodes([]);
    setError(null);
  };

  const handleSubmit = async () => {
    if (selectedNodes.length !== 4) {
      setError('Veuillez relier les 4 points du motif rythmique.');
      return;
    }

    setLoading(true);
    setError(null);

    const patternString = selectedNodes.join('-');

    try {
      const res = await completePresenceChallenge({
        ticketId: ticket.id,
        submittedPattern: patternString,
      });

      if (!res.success) {
        if (typeof res.attempts_left === 'number') {
          setAttemptsLeft(res.attempts_left);
        }
        setError(res.error || 'Motif incorrect !');
        setSelectedNodes([]);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la validation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm bg-zinc-900 border border-amber-500/20 rounded-[32px] overflow-hidden shadow-2xl p-6 text-white space-y-5 text-center">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-left">
              <h3 className="text-base font-bold">Défi de Présence Live</h3>
              <p className="text-[11px] text-amber-300/80">Badge "Pionnier du Live"</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="py-6 space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-black text-white">Badge Débloqué !</h4>
            <p className="text-xs text-white/70">
              Bravo ! Vous obtenez le badge exclusif « Pionnier du Live ». Ce badge sera visible sur votre profil.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-1 text-xs text-white/70">
              <p>
                Reproduisez le motif rythmique secret en reliant les 4 balises dans le bon ordre.
              </p>
              <div className="text-[10px] text-amber-300 font-semibold">
                Fenêtre horaire : 15 min après le début officiel • {attemptsLeft} tentative(s) restante(s)
              </div>
            </div>

            {/* Grille tactile 2x2 des 4 nœuds */}
            <div className="grid grid-cols-2 gap-4 max-w-[200px] mx-auto py-2">
              {nodes.map((n) => {
                const isSelected = selectedNodes.includes(n);
                const orderIndex = selectedNodes.indexOf(n);

                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleNodeClick(n)}
                    className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center font-black text-xl transition-all duration-200 active:scale-90 ${
                      isSelected
                        ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-900/40 border border-amber-300 scale-105'
                        : 'bg-white/5 hover:bg-white/10 border border-white/15 text-white/80'
                    }`}
                  >
                    <span>{n}</span>
                    {isSelected && (
                      <span className="text-[10px] uppercase font-bold tracking-widest text-white/90">
                        #{orderIndex + 1}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Séquence sélectionnée */}
            <div className="flex items-center justify-center gap-2 text-xs font-mono">
              <span className="text-white/50">Motif :</span>
              {selectedNodes.length === 0 ? (
                <span className="text-white/40 italic">Touchez les points pour tracer</span>
              ) : (
                <span className="font-bold text-amber-300 tracking-widest">
                  {selectedNodes.join(' → ')}
                </span>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleResetPattern}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-semibold text-xs"
              >
                Effacer
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || selectedNodes.length !== 4 || attemptsLeft <= 0}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-40 active:scale-95 transition-all shadow-lg shadow-orange-950/40"
              >
                {loading ? 'Validation...' : 'Valider'}
                {!loading && <Sparkles className="w-3.5 h-3.5" />}
              </button>
            </div>

            <p className="text-[10px] text-white/40">
              Note : Ce mini-défi est un bonus communautaire ludique et ne remplace pas le scan de votre QR code à l'entrée officielle.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
