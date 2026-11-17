import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  X,
  Send,
  Bot,
  AlertCircle,
  MapPin,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { motion } from 'motion/react';
import { askGeminiAssistant, getGeminiConfig, type MapsGroundingPlace } from '@/services/gemini';
import { AIMarkdownRenderer } from '@/components/AIMarkdownRenderer';
import { MapsGroundingLinks } from '@/components/MapsGroundingLinks';
import { useApp } from '@/hooks/useApp';
import { haptic } from '@/hooks/useHaptics';
import type { Event } from '@/types';

interface EventAIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  initialQuestion?: string | null;
  onOpenSettings?: () => void;
}

interface EventAIMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  groundingPlaces?: MapsGroundingPlace[];
}

export const EventAIAssistantModal: React.FC<EventAIAssistantModalProps> = ({
  isOpen,
  onClose,
  event,
  initialQuestion,
}) => {
  const { user, session, userLocation } = useApp();
  const [fastMode, setFastMode] = useState<boolean>(
    () => getGeminiConfig().model === 'gemini-3.1-flash-lite'
  );
  const [messages, setMessages] = useState<EventAIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasSentInitialRef = useRef(false);

  // Verrouillage du scroll et notification modale ouverte
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    document.body.classList.add('gba-modal-open');
    window.dispatchEvent(new CustomEvent('gba-modal-visibility-changed', { detail: { open: true } }));

    return () => {
      document.body.classList.remove('gba-modal-open');
      window.dispatchEvent(new CustomEvent('gba-modal-visibility-changed', { detail: { open: false } }));
    };
  }, [isOpen]);

  // Initialisation du message de bienvenue contextualisé à l'événement
  const resetConversation = useCallback(() => {
    setMessages([
      {
        id: `welcome-${event.id}`,
        role: 'assistant',
        text: `Bonjour ! Je suis votre conseiller dédié pour **${event.title}** (${event.location_name || event.city || 'Lomé'}).\n\nPosez-moi vos questions sur le lieu, les itinéraires Google Maps, le stationnement, la tenue conseillée ou les adresses autour !`,
        timestamp: new Date(),
      },
    ]);
    setErrorMsg(null);
    setInput('');
  }, [event.id, event.title, event.location_name, event.city]);

  useEffect(() => {
    resetConversation();
    hasSentInitialRef.current = false;
  }, [event.id, user?.id, session?.user?.id, resetConversation]);

  useEffect(() => {
    const handleAuthEvent = () => {
      resetConversation();
    };
    window.addEventListener('gba-user-signed-out', handleAuthEvent);
    window.addEventListener('gba-user-signed-in', handleAuthEvent);
    return () => {
      window.removeEventListener('gba-user-signed-out', handleAuthEvent);
      window.removeEventListener('gba-user-signed-in', handleAuthEvent);
    };
  }, [resetConversation]);

  const handleSendMessage = useCallback(
    async (textToSend: string) => {
      const cleanText = textToSend.trim();
      if (!cleanText || loading) return;

      haptic.selection();
      setErrorMsg(null);
      setInput('');

      const historyPayload = messages
        .filter((m) => !m.id.startsWith('welcome-') && m.text.trim().length > 0)
        .slice(-10)
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      const userMessage: EventAIMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        text: cleanText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);

      try {
        const result = await askGeminiAssistant({
          prompt: cleanText,
          history: historyPayload,
          currentEvent: event,
          userLocation:
            userLocation?.isActual && typeof userLocation.latitude === 'number'
              ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
              : null,
          fastMode,
          useMapsGrounding: !fastMode && getGeminiConfig().enableMapsGrounding,
        });

        const assistantMessage: EventAIMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: result.text,
          timestamp: new Date(),
          ...(result.groundingPlaces && result.groundingPlaces.length > 0
            ? { groundingPlaces: result.groundingPlaces }
            : {}),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        haptic.success();
      } catch (err: unknown) {
        const errObj = err as { message?: string };
        setErrorMsg(errObj?.message || 'Impossible de joindre le conseiller IA.');
        haptic.error();
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, event, userLocation, fastMode]
  );

  // Défilement automatique vers le bas à chaque nouveau message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isOpen]);

  // Envoi automatique de la question initiale si transmise à l'ouverture
  useEffect(() => {
    if (isOpen && initialQuestion && !hasSentInitialRef.current) {
      hasSentInitialRef.current = true;
      handleSendMessage(initialQuestion);
    }
  }, [isOpen, initialQuestion, handleSendMessage]);

  const sampleQuestions = [
    "Comment s'y rendre et où se garer ?",
    "Restaurants & bars sympas autour ?",
    "Quelle tenue est conseillée ?",
    "Quels sont les horaires d'accès ?",
  ];

  if (!isOpen) return null;

  const modalNode = (
    <div
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-ai-modal-title"
    >
      <motion.div
        initial={{ y: '100%', opacity: 0.8 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 32, stiffness: 380, mass: 0.85 }}
        className="w-full max-w-lg bg-[#FAF9FD] dark:bg-[#12111D] rounded-t-[2.5rem] sm:rounded-[2.5rem] h-[92vh] sm:h-[680px] max-h-[92vh] flex flex-col shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS Pull Handle sur mobile */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden cursor-grab">
          <div className="w-10 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600/90" />
        </div>

        {/* En-tête de la modale */}
        <div className="px-5 py-3 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between bg-white/70 dark:bg-[#181628]/70 backdrop-blur-md shrink-0 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6600FF] to-[#9333EA] flex items-center justify-center text-white shadow-md shadow-[#6600FF]/25 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 id="event-ai-modal-title" className="text-sm font-extrabold text-[#17131D] dark:text-white truncate">
                  Conseiller IA de l'événement
                </h3>
                <button
                  type="button"
                  onClick={() => setFastMode((prev) => !prev)}
                  disabled={loading}
                  title="Basculer entre Gemini 4 Hydrogen + Maps et Gemini 3.1 Flash Lite"
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-colors cursor-pointer ${
                    fastMode
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {fastMode ? (
                    <>
                      <Zap className="w-2.5 h-2.5" />
                      <span>Flash Lite</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-2.5 h-2.5" />
                      <span>Hydrogen · Maps</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#6600FF] dark:text-[#A78BFA] shrink-0" />
                <span className="truncate">{event.title}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={resetConversation}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Réinitialiser la conversation"
              aria-label="Réinitialiser la conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Fermer la boîte de dialogue"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Zone de conversation scrollable (réponses complètes sans être coupées) */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 no-scrollbar">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-full bg-[#6600FF]/15 dark:bg-[#6600FF]/25 text-[#6600FF] dark:text-[#A78BFA] flex items-center justify-center shrink-0 mt-1 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className="max-w-[85%] space-y-2">
                  <div
                    className={`rounded-[1.4rem] px-4 py-3 text-xs sm:text-sm shadow-xs ${
                      isUser
                        ? 'bg-[#6600FF] text-white rounded-tr-xs font-medium'
                        : 'bg-white dark:bg-[#1A1829] text-[#17131D] dark:text-gray-100 border border-black/[0.06] dark:border-white/[0.08] rounded-tl-xs'
                    }`}
                  >
                    {isUser ? (
                      <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                    ) : (
                      <AIMarkdownRenderer content={m.text} />
                    )}
                    <span
                      className={`block text-[9px] mt-1 font-bold ${
                        isUser ? 'text-white/70 text-right' : 'text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {!isUser && m.groundingPlaces && m.groundingPlaces.length > 0 && (
                    <MapsGroundingLinks places={m.groundingPlaces} compact />
                  )}
                </div>
              </div>
            );
          })}

          {/* Indicateur de saisie / réflexion Gemini */}
          {loading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-8 h-8 rounded-full bg-[#6600FF]/15 text-[#6600FF] flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1A1829] border border-[#6600FF]/20 flex items-center gap-2 shadow-xs">
                <span className="text-xs font-semibold text-[#6600FF] dark:text-[#A78BFA]">
                  Gemini analyse l'événement...
                </span>
                <span className="inline-flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6600FF] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6600FF] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6600FF] animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Tuile interactive en bas pour retours de messages et questions supplémentaires */}
        <div className="p-4 border-t border-black/[0.06] dark:border-white/[0.08] bg-white/90 dark:bg-[#161426]/90 backdrop-blur-xl shrink-0 pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))]">
          {/* Suggestions de questions rapides */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2.5">
            {sampleQuestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSendMessage(q)}
                disabled={loading}
                className="px-3 py-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] hover:bg-[#6600FF]/10 text-gray-700 dark:text-gray-300 text-[11px] font-bold shrink-0 transition-all active:scale-95 disabled:opacity-50 cursor-pointer min-h-[36px]"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Formulaire de saisie ergonomique avec bouton 44px */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Poser une question spécifique sur cet événement..."
              disabled={loading}
              className="flex-1 min-h-[44px] px-4 rounded-full bg-black/[0.04] dark:bg-white/[0.08] border border-black/5 dark:border-white/10 text-xs sm:text-sm text-[#17131D] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full bg-[#6600FF] hover:bg-[#5200cc] text-white flex items-center justify-center disabled:opacity-40 transition-transform active:scale-95 shrink-0 cursor-pointer shadow-md shadow-[#6600FF]/30"
              aria-label="Envoyer le message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalNode, document.body);
  }

  return modalNode;
};
