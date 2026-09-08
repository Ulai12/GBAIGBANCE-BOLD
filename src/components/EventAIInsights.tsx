import React, { useState, useEffect } from 'react';
import { Sparkles, MapPin, Loader2, Send, ChevronRight, Settings } from 'lucide-react';
import { isGeminiActive, askGeminiAssistant } from '@/services/gemini';
import type { Event } from '@/types';

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
    try {
      const res = await askGeminiAssistant({
        prompt: question,
        currentEvent: event,
      });
      setResponse(res.text);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setResponse(`Erreur : ${errorObj?.message || 'Impossible de joindre Gemini'}`);
    } finally {
      setLoading(false);
    }
  };

  const sampleQuestions = [
    'Comment s’y rendre et où se garer ?',
    'Quelle tenue est conseillée ?',
    'Y a-t-il des restaurants ou bars sympas autour ?',
  ];

  if (!active) {
    return (
      <div
        id="event-ai-locked-card"
        className="card p-4 bg-gradient-to-r from-[#6600FF]/5 via-[#7B1FA2]/5 to-transparent border border-[#6600FF]/20 overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#6600FF]/10 flex items-center justify-center text-[#6600FF] shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-xs text-[#1A1A2E] dark:text-white flex items-center gap-1.5">
                <span>Conseils & Itinéraire IA</span>
                <span className="px-1.5 py-0.5 rounded-full bg-[#6600FF] text-white text-[9px] font-bold">
                  Gemini
                </span>
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Activez votre clé API Gemini pour obtenir des conseils sur ce lieu et l'événement.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenSettings}
            className="shrink-0 py-1.5 px-3 rounded-xl bg-[#6600FF] text-white text-[11px] font-bold shadow-xs hover:bg-[#5200CC] transition-colors flex items-center gap-1"
          >
            <Settings className="w-3 h-3" />
            <span>Activer</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="event-ai-insights-card"
      className="card p-4 space-y-3 bg-[#1C1C23] border border-white/5 text-white"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#6600FF]/20 flex items-center justify-center text-[#A855F7]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-extrabold text-white">Conseiller IA de l'événement</h3>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" />
                Maps
              </span>
            </div>
            <p className="text-[10px] text-zinc-400">Propulsé par votre clé Gemini</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className="text-zinc-400 hover:text-white p-1 rounded-lg"
          title="Paramètres Gemini"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Suggestion questions */}
      <div className="flex flex-wrap gap-1.5">
        {sampleQuestions.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => handleAsk(q)}
            disabled={loading}
            className="py-1 px-2.5 rounded-lg bg-[#252530] hover:bg-[#303040] text-[11px] text-zinc-300 transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            <span>{q}</span>
            <ChevronRight className="w-3 h-3 text-zinc-500" />
          </button>
        ))}
      </div>

      {/* Custom input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (prompt.trim()) {
            handleAsk(prompt);
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
          className="flex-1 py-2 px-3 rounded-xl bg-[#121217] border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-[#6600FF]"
        />
        <button
          type="submit"
          disabled={!prompt.trim() || loading}
          className="p-2 rounded-xl bg-[#6600FF] hover:bg-[#5200CC] text-white disabled:opacity-40 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>

      {/* Response Box */}
      {loading && (
        <div className="p-3 rounded-xl bg-[#14141A] border border-white/5 flex items-center gap-2 text-xs text-zinc-400">
          <Loader2 className="w-4 h-4 animate-spin text-[#6600FF]" />
          <span>Gemini analyse les informations avec Google Maps...</span>
        </div>
      )}

      {response && (
        <div className="p-3 rounded-xl bg-[#14141A] border border-white/5 text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
          {response}
        </div>
      )}
    </div>
  );
};
