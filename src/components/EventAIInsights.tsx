import React, { useState, useEffect } from 'react';
import { Sparkles, MapPin, Send, Settings, ChevronRight, AlertCircle, Bot } from 'lucide-react';
import { isGeminiActive, askGeminiAssistant } from '@/services/gemini';
import type { Event } from '@/types';

/**
 * GBAIGBANCE — EventAIInsights (Conseiller IA de l'événement)
 * 
 * Conseils personnalisés, itinéraire et recommandations locales par Gemini :
 * - Carte de verre iOS avec bordure dégradée violette
 * - Chips de suggestions défilables horizontalement sans être tronqués
 * - Indicateur de saisie "en train d'écrire" avec points oscillants
 * - Formulaire de question libre avec bouton violet 44px
 * - Zéro clé exposée et gestion stricte des erreurs réseau
 */

interface EventAIInsightsProps {
  event: Event;
  onOpenSettings: () => void;
}

export const EventAIInsights: React.FC<EventAIInsightsProps> = ({
  event,
  onOpenSettings,
}) => {
  const [active, setActive] = useState(isGeminiActive);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setActive(isGeminiActive());
    const handler = () => setActive(isGeminiActive());
    window.addEventListener('gbaigbance_gemini_config_updated', handler);
    return () => window.removeEventListener('gbaigbance_gemini_config_updated', handler);
  }, []);

  const handleAsk = async (question: string) => {
    if (!active || loading) return;
    setLoading(true);
    setResponse(null);
    setErrorMsg(null);
    try {
      const res = await askGeminiAssistant({
        prompt: question,
        currentEvent: event,
      });
      setResponse(res.text);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setErrorMsg(errorObj?.message || 'Impossible de joindre le conseiller IA.');
    } finally {
      setLoading(false);
    }
  };

  const sampleQuestions = [
    "Comment s'y rendre et où se garer ?",
    "Quelle tenue est conseillée ?",
    "Y a-t-il des restaurants ou bars sympas autour ?",
  ];

  if (!active) {
    return (
      <div
        id="event-ai-locked-card"
        className="p-5 rounded-[24px] glass-ios border border-[#6600FF]/25 shadow-sm space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#6600FF]/10 text-[#6600FF] dark:text-purple-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-sm text-[#1A1A2E] dark:text-white flex items-center gap-1.5">
                <span>Conseiller IA de l'événement</span>
                <span className="px-2 py-0.5 rounded-full bg-[#6600FF] text-white text-[10px] font-bold">
                  Bêta
                </span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Activez votre conseiller pour obtenir des astuces sur ce lieu, la météo et l'ambiance.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenSettings}
            className="min-h-[44px] px-4 rounded-full bg-[#6600FF] hover:bg-[#5200cc] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
            aria-label="Configurer le conseiller IA"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Activer</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="event-ai-insights-card"
      className="p-4 sm:p-5 rounded-[24px] glass-ios border-2 border-[#6600FF]/25 dark:border-[#6600FF]/35 shadow-md space-y-3.5"
    >
      {/* En-tête du conseiller */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[#6600FF]/15 dark:bg-[#6600FF]/25 text-[#6600FF] dark:text-purple-300 flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-[#1A1A2E] dark:text-white">
                Conseiller IA de l'événement
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#6600FF]/10 text-[#6600FF] dark:text-purple-300 border border-[#6600FF]/20">
                Bêta
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" />
                Maps
              </span>
            </div>
            {/* Correction de la mention : "Propulsé par Gemini" */}
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Propulsé par Gemini
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-[#6600FF] transition-colors cursor-pointer"
          title="Paramètres de l'assistant IA"
          aria-label="Ouvrir les paramètres IA"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Chips de suggestions défilables horizontalement sans être tronqués */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        {sampleQuestions.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => handleAsk(q)}
            disabled={loading}
            className="min-h-[40px] px-3.5 py-1.5 rounded-full glass-ios hover:bg-white/80 dark:hover:bg-white/15 text-xs font-bold text-[#1A1A2E] dark:text-gray-200 transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <span>{q}</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#6600FF] dark:text-purple-400" />
          </button>
        ))}
      </div>

      {/* Animation "en train d'écrire" (typing loader) */}
      {loading && (
        <div className="p-3.5 rounded-2xl bg-[#6600FF]/5 dark:bg-[#6600FF]/15 border border-[#6600FF]/20 flex items-center gap-3 animate-pulse">
          <Bot className="w-4 h-4 text-[#6600FF] dark:text-purple-400 shrink-0" />
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#6600FF] dark:text-purple-300">
            <span>Gemini analyse les informations de l'événement</span>
            <span className="inline-flex gap-1 items-center ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6600FF] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#6600FF] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#6600FF] animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          </div>
        </div>
      )}

      {/* Affichage de la réponse formatée */}
      {response && !loading && (
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-white/[0.06] border border-[#6600FF]/20 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#6600FF] dark:text-purple-300">
            <Bot className="w-4 h-4" />
            <span>Réponse du conseiller</span>
          </div>
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-line">
            {response}
          </p>
        </div>
      )}

      {/* État d'erreur propre */}
      {errorMsg && !loading && (
        <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Champ de question libre + bouton envoyer violet */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (prompt.trim() && !loading) {
            handleAsk(prompt.trim());
            setPrompt('');
          }
        }}
        className="flex items-center gap-2 pt-1"
      >
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Poser une question spécifique sur cet événement..."
          disabled={loading}
          className="flex-1 min-h-[44px] px-4 rounded-full bg-white/70 dark:bg-white/[0.08] border border-black/10 dark:border-white/10 text-xs sm:text-sm text-[#1A1A2E] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-[#6600FF]/50"
        />
        <button
          type="submit"
          disabled={!prompt.trim() || loading}
          className="w-11 h-11 rounded-full bg-[#6600FF] hover:bg-[#5200cc] text-white flex items-center justify-center disabled:opacity-40 transition-transform active:scale-95 shrink-0 cursor-pointer shadow-sm shadow-[#6600FF]/30"
          aria-label="Envoyer la question à Gemini"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
