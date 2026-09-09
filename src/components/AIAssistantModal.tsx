import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Key,
  MapPin,
  Bot,
  User as UserIcon,
  RotateCcw,
  Settings,
} from 'lucide-react';
import { isGeminiActive, askGeminiAssistant } from '@/services/gemini';
import type { Event } from '@/types';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  events?: Event[];
  onEventClick?: (event: Event) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  time: string;
}

const QUICK_SUGGESTIONS = [
  'Quoi faire ce week-end à Lomé ?',
  'Meilleurs concerts & festivals en cours',
  'Événements gratuits ou abordables',
  'Où faire la fête à Cotonou ?',
];

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  events = [],
}) => {
  const [active, setActive] = useState(isGeminiActive);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Bonjour ! Je suis l'assistant intelligent de Gbaigbance, propulsé par Google Gemini avec Maps Grounding. Comment puis-je vous aider à trouver votre prochaine sortie ?",
      time: 'Maintenant',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActive(isGeminiActive());

    const handleConfigChange = () => {
      setActive(isGeminiActive());
    };

    window.addEventListener('gbaigbance_gemini_config_updated', handleConfigChange);
    return () => {
      window.removeEventListener('gbaigbance_gemini_config_updated', handleConfigChange);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (userText?: string) => {
    const textToSend = userText || input.trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).slice(2),
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await askGeminiAssistant({
        prompt: textToSend,
        contextEvents: events,
      });

      const assistantMsg: ChatMessage = {
        id: Math.random().toString(36).slice(2),
        sender: 'assistant',
        text: res.text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      const errorMsg: ChatMessage = {
        id: Math.random().toString(36).slice(2),
        sender: 'assistant',
        text: `Désolé, une erreur est survenue : ${errorObj?.message || 'Erreur inconnue'}. Vérifiez vos paramètres d'API Gemini.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: "Conversation réinitialisée. Quelle est votre prochaine envie de sortie ?",
        time: 'Maintenant',
      },
    ]);
  };

  return (
    <div
      id="ai-assistant-modal"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg h-[85vh] sm:h-[650px] rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#14141A] text-[#17131D] dark:text-white border border-black/10 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gray-50 dark:bg-[#1C1C24] border-b border-black/[0.06] dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#6600FF] to-[#9333EA] flex items-center justify-center shadow-md shadow-[#6600FF]/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-extrabold text-[#17131D] dark:text-white tracking-tight">
                  Assistant Gbaigbance IA
                </h2>
                <span className="px-1.5 py-0.5 rounded-full bg-[#6600FF]/15 border border-[#6600FF]/30 text-[9px] font-bold text-[#6600FF] dark:text-[#A855F7]">
                  Gemini
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                <span>Maps Grounding actif</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleClearChat}
              title="Effacer la conversation"
              className="p-2 rounded-full text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              title="Paramètres Gemini"
              className="p-2 rounded-full text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        {!active ? (
          // Inactive / No Key state
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-[#6600FF]/15 border border-[#6600FF]/30 flex items-center justify-center text-[#6600FF] dark:text-[#A855F7] shadow-xl shadow-[#6600FF]/20">
              <Key className="w-8 h-8" />
            </div>

            <div className="max-w-xs space-y-1.5">
              <h3 className="text-base font-extrabold text-[#17131D] dark:text-white tracking-tight">
                Activez votre clé API Gemini
              </h3>
              <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
                Pour profiter de l'Assistant IA et des recommandations cartographiées,
                veuillez ajouter votre propre clé API Google Gemini dans vos paramètres.
              </p>
            </div>

            <div className="pt-2 w-full max-w-xs space-y-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="w-full py-3 px-4 rounded-2xl bg-[#6600FF] hover:bg-[#5500D4] text-white font-bold text-xs shadow-md shadow-[#6600FF]/30 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Settings className="w-4 h-4" />
                <span>Configurer l'IA (Paramètres)</span>
              </button>

              <p className="text-[10px] text-gray-400 dark:text-zinc-500">
                La clé est 100% gratuite sur Google AI Studio.
              </p>
            </div>
          </div>
        ) : (
          // Active Chat view
          <>
            {/* Messages list */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs bg-white dark:bg-[#14141A]">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-start gap-2.5 ${
                    m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] ${
                      m.sender === 'user'
                        ? 'bg-[#6600FF] text-white'
                        : 'bg-gray-100 text-[#6600FF] dark:bg-[#23232D] dark:text-[#A855F7] border border-black/[0.04] dark:border-white/5'
                    }`}
                  >
                    {m.sender === 'user' ? <UserIcon className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  <div
                    className={`max-w-[80%] rounded-2xl p-3 leading-relaxed whitespace-pre-wrap ${
                      m.sender === 'user'
                        ? 'bg-[#6600FF] text-white rounded-tr-xs shadow-sm'
                        : 'bg-gray-100 text-gray-800 dark:bg-[#1F1F28] dark:text-zinc-200 border border-black/[0.04] dark:border-white/5 rounded-tl-xs'
                    }`}
                  >
                    {m.text}
                    <div
                      className={`text-[9px] mt-1 ${
                        m.sender === 'user' ? 'text-white/70 text-right' : 'text-gray-400 dark:text-zinc-500'
                      }`}
                    >
                      {m.time}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gray-100 text-[#6600FF] dark:bg-[#23232D] dark:text-[#A855F7] border border-black/[0.04] dark:border-white/5 shrink-0 flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="p-3 rounded-2xl bg-gray-100 dark:bg-[#1F1F28] border border-black/[0.04] dark:border-white/5 text-gray-600 dark:text-zinc-400 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6600FF]" />
                    <span>Gemini réfléchit avec Maps...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions Chips */}
            <div className="px-4 py-2 bg-gray-50 dark:bg-[#181820] border-t border-black/[0.04] dark:border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {QUICK_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => handleSend(sug)}
                  disabled={loading}
                  className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white dark:bg-[#23232E] hover:bg-gray-100 dark:hover:bg-[#2F2F3D] active:scale-95 text-[11px] font-medium text-gray-700 dark:text-zinc-300 border border-black/[0.08] dark:border-white/5 shadow-xs transition-colors disabled:opacity-50 shrink-0"
                >
                  {sug}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 bg-gray-50 dark:bg-[#1C1C24] border-t border-black/[0.06] dark:border-white/5 flex items-center gap-2"
            >
              <input
                id="ai-assistant-chat-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Posez une question sur les événements, lieux..."
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-white dark:bg-[#14141A] border border-gray-200 dark:border-zinc-700 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-hidden focus:border-[#6600FF] focus:ring-1 focus:ring-[#6600FF] transition-all disabled:opacity-50"
              />
              <button
                id="ai-assistant-send-button"
                type="submit"
                disabled={!input.trim() || loading}
                className="w-10 h-10 rounded-2xl bg-[#6600FF] hover:bg-[#5200CC] active:scale-95 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-[#6600FF]/25"
                aria-label="Envoyer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
