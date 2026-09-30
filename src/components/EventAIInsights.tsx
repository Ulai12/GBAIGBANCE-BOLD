import React, { useState, useEffect } from 'react';
import { Sparkles, MapPin, Send, Settings, ChevronRight, Bot } from 'lucide-react';
import { isGeminiActive } from '@/services/gemini';
import { EventAIAssistantModal } from '@/components/EventAIAssistantModal';
import { useApp } from '@/hooks/useApp';
import type { Event } from '@/types';

/**
 * GBAIGBANCE — EventAIInsights (Portail du Conseiller IA de l'événement)
 * 
 * Carte de lancement du conseiller IA dédiée à l'événement avec :
 * - Puces de suggestions rapides défilables
 * - Champ de question libre ergonomique
 * - Déclenchement automatique de la modale dédiée grand format avec fil de conversation complet
 */

interface EventAIInsightsProps {
  event: Event;
  onOpenSettings: () => void;
}

export const EventAIInsights: React.FC<EventAIInsightsProps> = ({
  event,
  onOpenSettings,
}) => {
  const { user } = useApp();
  const [active, setActive] = useState(isGeminiActive);
  const [prompt, setPrompt] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);

  useEffect(() => {
    setActive(isGeminiActive());
    const handler = () => setActive(isGeminiActive());
    window.addEventListener('gbaigbance_gemini_config_updated', handler);
    return () => window.removeEventListener('gbaigbance_gemini_config_updated', handler);
  }, []);

  const sampleQuestions = [
    "Comment s'y rendre & parking ?",
    "Quelle tenue est conseillée ?",
    "Restaurants & bars sympas autour ?",
    "Quels sont les horaires d'accès ?",
  ];

  const handleOpenWithQuestion = (question: string) => {
    setSelectedQuestion(question);
    setModalOpen(true);
  };

  if (!active) {
    return (
      <div
        id="event-ai-locked-card"
        className="p-5 rounded-[28px] glass-ios border border-[#6600FF]/25 shadow-sm space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#6600FF]/10 text-[#6600FF] dark:text-[#A78BFA] flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="font-extrabold text-sm text-[#1A1A2E] dark:text-white flex items-center gap-1.5">
                <span>Conseiller IA de l'événement</span>
                <span className="px-2 py-0.5 rounded-full bg-[#6600FF] text-white text-[10px] font-bold">
                  Bêta
                </span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                Activez votre conseiller pour obtenir des astuces sur ce lieu, la météo et l'ambiance.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenSettings}
            className="min-h-[44px] px-4 rounded-full bg-[#6600FF] hover:bg-[#5200cc] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
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
    <>
      <div
        id="event-ai-insights-card"
        className="p-4 sm:p-5 rounded-[28px] glass-ios border-2 border-[#6600FF]/25 dark:border-[#6600FF]/35 shadow-md space-y-3.5"
      >
        {/* En-tête du conseiller */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#6600FF]/15 dark:bg-[#6600FF]/25 text-[#6600FF] dark:text-[#A78BFA] flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-[#1A1A2E] dark:text-white">
                  Conseiller IA de l'événement
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#6600FF]/10 text-[#6600FF] dark:text-[#A78BFA] border border-[#6600FF]/20">
                  Gemini Live
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-500" />
                <span>Réponses vérifiées sur le lieu & l'accès</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenSettings}
            className="w-10 h-10 min-h-[44px] min-w-[44px] rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-[#6600FF] transition-colors cursor-pointer"
            title="Paramètres de l'assistant IA"
            aria-label="Ouvrir les paramètres IA"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Chips de suggestions défilables sans troncature */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {sampleQuestions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleOpenWithQuestion(q)}
              className="min-h-[44px] px-4 py-2 rounded-full glass-ios hover:bg-white/90 dark:hover:bg-white/15 text-xs font-bold text-[#1A1A2E] dark:text-gray-200 transition-all flex items-center gap-2 shrink-0 whitespace-nowrap shadow-2xs active:scale-95 cursor-pointer"
            >
              <span>{q}</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#6600FF] dark:text-[#A78BFA]" />
            </button>
          ))}
        </div>

        {/* Champ de saisie rapide ouvrant directement la modale dédiée */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (prompt.trim()) {
              handleOpenWithQuestion(prompt.trim());
              setPrompt('');
            } else {
              setModalOpen(true);
            }
          }}
          className="flex items-center gap-2 pt-1"
        >
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Poser une question spécifique sur cet événement..."
            className="flex-1 min-h-[44px] px-4 rounded-full bg-white/80 dark:bg-white/[0.08] border border-black/10 dark:border-white/10 text-xs sm:text-sm text-[#1A1A2E] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-[#6600FF]/50"
          />
          <button
            type="submit"
            className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full bg-[#6600FF] hover:bg-[#5200cc] text-white flex items-center justify-center transition-transform active:scale-95 shrink-0 cursor-pointer shadow-sm shadow-[#6600FF]/30"
            aria-label="Poser ma question au conseiller IA"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Modale dédiée grand format avec fil de discussion et réponses complètes sans coupure */}
      <EventAIAssistantModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        event={event}
        initialQuestion={selectedQuestion}
        onOpenSettings={onOpenSettings}
      />
    </>
  );
};
