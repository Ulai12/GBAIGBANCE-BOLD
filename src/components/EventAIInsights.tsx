import React, { useState, useEffect } from 'react';
import { Sparkles, MapPin, Settings, ChevronRight, MessageSquareQuote } from 'lucide-react';
import { isGeminiActive } from '@/services/gemini';
import { EventAIAssistantModal } from '@/components/EventAIAssistantModal';
import type { Event } from '@/types';

/**
 * GBAIGBANCE — EventAIInsights (Portail du Conseiller IA de l'événement)
 * 
 * Carte de lancement du conseiller IA dédiée à l'événement avec :
 * - Puces de suggestions rapides défilables
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
  const [active, setActive] = useState(isGeminiActive);
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
        className="p-4 sm:p-5 rounded-[28px] glass-ios border-2 border-[#6600FF]/25 dark:border-[#6600FF]/35 shadow-md space-y-3"
      >
        {/* En-tête du conseiller */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6600FF] to-[#9333EA] text-white flex items-center justify-center shadow-xs">
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
                <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                <span>Accès, stationnement, ambiance & conseils pratiques</span>
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

        {/* Bouton d'ouverture directe de la modale dédiée */}
        <button
          type="button"
          onClick={() => {
            setSelectedQuestion(null);
            setModalOpen(true);
          }}
          className="w-full min-h-[44px] px-4 py-3 rounded-2xl bg-[#6600FF]/10 hover:bg-[#6600FF]/20 text-[#6600FF] dark:text-[#A78BFA] text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
        >
          <MessageSquareQuote className="w-4 h-4" />
          <span>Ouvrir la conversation avec le conseiller IA</span>
          <ChevronRight className="w-4 h-4 ml-auto" />
        </button>
      </div>

      {/* Modale dédiée grand format avec fil de discussion et réponses complètes sans coupure */}
      <EventAIAssistantModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        event={event}
        initialQuestion={selectedQuestion}
      />
    </>
  );
};
