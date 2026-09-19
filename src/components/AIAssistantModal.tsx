import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  MapPin,
  Bot,
  User as UserIcon,
  RotateCcw,
  Calendar,
  ChevronRight,
  LogIn,
  AlertCircle,
  Key,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { useAIAssistant, type ChatMessage } from '@/hooks/useAIAssistant';
import { useApp } from '@/hooks/useApp';
import {
  getUserGeminiApiKey,
  setUserGeminiApiKey,
  testGeminiApiKey,
  hasUserGeminiApiKey,
} from '@/services/gemini';
import type { Event } from '@/types';

// ====================================================================
// GBAIGBANCE — COMPOSANT AIAssistantModal (SÉCURISÉ & HYBRIDE BYOK)
// ====================================================================

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
  events?: Event[];
  onEventClick?: (event: Event) => void;
  onAuthRequired?: () => void;
}

const QUICK_SUGGESTIONS = [
  'Qu’est-ce qui se passe ce week-end près de moi ?',
  'Des concerts gratuits ou abordables ?',
  'Rappelle-moi mes billets actifs',
  'Quels sont mes événements favoris ?',
];

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  onEventClick,
  onAuthRequired,
}) => {
  const { userLocation } = useApp();
  const {
    messages,
    sendMessage,
    clearHistory,
    isLoading,
    isStreaming,
    error,
    quotaExceeded,
    verifiedEvents,
    isGuest,
  } = useAIAssistant();

  const [input, setInput] = useState('');
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getUserGeminiApiKey);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestFeedback, setKeyTestFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [hasCustomKey, setHasCustomKey] = useState(hasUserGeminiApiKey);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming, isOpen]);

  // Si une erreur signale que l'Edge Function n'est pas trouvée ou qu'aucune clé n'est fournie, suggérer la saisie
  useEffect(() => {
    if (error && (error.includes('404') || error.includes('clé') || error.includes('inaccessible'))) {
      setShowKeyConfig(true);
    }
  }, [error]);

  if (!isOpen) return null;

  const handleSend = (text?: string) => {
    const toSend = text || input;
    if (!toSend.trim() || isLoading || isStreaming) return;
    sendMessage(toSend);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveAndTestKey = async () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      setUserGeminiApiKey('');
      setHasCustomKey(false);
      setKeyTestFeedback({ success: false, message: 'Clé effacée.' });
      return;
    }

    setIsTestingKey(true);
    setKeyTestFeedback(null);
    const res = await testGeminiApiKey(trimmed);
    setIsTestingKey(false);
    setKeyTestFeedback(res);

    if (res.success) {
      setUserGeminiApiKey(trimmed);
      setHasCustomKey(true);
      setTimeout(() => setShowKeyConfig(false), 1400);
    }
  };

  // Rendu sécurisé en texte brut (pas d'injection de liens externes ni d'images pirates)
  const renderPlainText = (content: string) => {
    return content.split('\n').map((line, idx) => (
      <span key={idx} className="block leading-relaxed min-h-[1.25rem]">
        {line || '\u00A0'}
      </span>
    ));
  };

  return (
    <div
      id="ai-assistant-modal"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg h-[90vh] sm:h-[680px] rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#14141A] text-[#17131D] dark:text-white border border-black/10 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="px-5 py-3.5 bg-gray-50 dark:bg-[#1C1C24] border-b border-black/[0.06] dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#6600FF] to-[#9333EA] flex items-center justify-center shadow-md shadow-[#6600FF]/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-extrabold text-[#17131D] dark:text-white tracking-tight">
                  Concierge Gbaigbance IA
                </h2>
                <span className="px-1.5 py-0.5 rounded-full bg-[#6600FF]/15 border border-[#6600FF]/30 text-[9px] font-bold text-[#6600FF] dark:text-[#A855F7]">
                  {hasCustomKey ? 'Clé Perso' : 'Cloud'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                <span>
                  {userLocation?.isActual
                    ? 'Position GPS active (~1 km)'
                    : 'Lomé & Togo par défaut'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowKeyConfig(!showKeyConfig)}
              title="Configurer votre propre clé API Gemini"
              className={`p-2 rounded-full transition-colors relative ${
                showKeyConfig
                  ? 'bg-[#6600FF] text-white'
                  : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Key className="w-4 h-4" />
              {hasCustomKey && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>
            <button
              type="button"
              onClick={clearHistory}
              title="Réinitialiser la conversation"
              className="p-2 rounded-full text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
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

        {/* Panneau dépliant : Configuration de sa propre clé API (BYOK) */}
        {showKeyConfig && (
          <div className="p-4 bg-gradient-to-b from-[#6600FF]/10 to-transparent border-b border-black/[0.06] dark:border-white/10 text-xs space-y-3 animate-in slide-in-from-top duration-200">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-extrabold text-gray-900 dark:text-white text-xs flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#6600FF]" />
                  <span>Utiliser votre propre clé API Gemini (Google AI Studio)</span>
                </h3>
                <p className="text-gray-500 dark:text-zinc-400 text-[11px] mt-0.5 leading-relaxed">
                  Votre clé fonctionne en <strong>mode serveur</strong> (envoyée de manière sécurisée via <code>x-gemini-api-key</code>) et en <strong>mode direct</strong> sans attendre le déploiement de l’Edge Function.
                </p>
              </div>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="shrink-0 inline-flex items-center gap-1 text-[10px] text-[#6600FF] dark:text-[#A855F7] font-bold hover:underline"
              >
                <span>Obtenir une clé gratuite</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Collez votre clé API (ex: AIzaSy...)"
                className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-[#121218] border border-black/10 dark:border-white/10 text-xs font-mono text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:border-[#6600FF]"
              />
              <button
                type="button"
                onClick={handleSaveAndTestKey}
                disabled={isTestingKey}
                className="px-3 py-2 rounded-xl bg-[#6600FF] hover:bg-[#5500DD] text-white font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 disabled:opacity-50"
              >
                {isTestingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{isTestingKey ? 'Test...' : 'Valider'}</span>
              </button>
            </div>

            {keyTestFeedback && (
              <div
                className={`p-2 rounded-lg text-[11px] font-medium flex items-center gap-1.5 ${
                  keyTestFeedback.success
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                }`}
              >
                {keyTestFeedback.success ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                <span>{keyTestFeedback.message}</span>
              </div>
            )}
          </div>
        )}

        {/* Fil des messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg: ChatMessage) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-[#6600FF]/15 text-[#6600FF] dark:text-[#A855F7] flex items-center justify-center shrink-0 mt-0.5 border border-[#6600FF]/25">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-2.5`}>
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm shadow-xs ${
                      isUser
                        ? 'bg-[#6600FF] text-white rounded-br-xs font-medium'
                        : 'bg-gray-100 dark:bg-[#1E1E26] text-[#17131D] dark:text-zinc-100 rounded-bl-xs border border-black/5 dark:border-white/5'
                    }`}
                  >
                    {renderPlainText(msg.text)}
                  </div>

                  {/* Cartes d'événements certifiées */}
                  {!isUser && msg.eventIds && msg.eventIds.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <p className="text-[11px] font-bold text-gray-400 dark:text-zinc-400 uppercase tracking-wider px-1">
                        Événements recommandés
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {msg.eventIds.map((eventId) => {
                          const ev = verifiedEvents[eventId];
                          if (!ev) return null;
                          return (
                            <div
                              key={eventId}
                              onClick={() => {
                                onClose();
                                onEventClick?.(ev);
                              }}
                              className="group p-3 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-[#1A1A22] dark:hover:bg-[#23232E] border border-black/5 dark:border-white/10 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-xs"
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                {ev.cover_url ? (
                                  <img
                                    src={ev.cover_url}
                                    alt={ev.title}
                                    className="w-12 h-12 rounded-lg object-cover shrink-0 border border-black/5 dark:border-white/10"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-[#6600FF]/20 flex items-center justify-center text-[#6600FF] shrink-0 font-bold text-xs">
                                    {ev.category?.slice(0, 3).toUpperCase() || 'EVT'}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-[#6600FF] transition-colors">
                                    {ev.title}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 dark:text-zinc-400">
                                    <span className="flex items-center gap-0.5 truncate">
                                      <Calendar className="w-3 h-3 text-[#6600FF]" />
                                      {ev.starts_at
                                        ? new Date(ev.starts_at).toLocaleDateString('fr-FR', {
                                            day: 'numeric',
                                            month: 'short',
                                          })
                                        : 'Bientôt'}
                                    </span>
                                    <span>•</span>
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                                      {ev.price_min === 0
                                        ? 'Gratuit'
                                        : `${ev.price_min} ${ev.currency || 'FCFA'}`}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-gray-400 group-hover:text-[#6600FF] shrink-0">
                                <ChevronRight className="w-4 h-4" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-zinc-300 flex items-center justify-center shrink-0 mt-0.5">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Indicateur de chargement / streaming */}
          {(isLoading || isStreaming) && (
            <div className="flex gap-2.5 items-center text-xs text-gray-400 dark:text-zinc-400 py-1">
              <div className="w-8 h-8 rounded-xl bg-[#6600FF]/15 text-[#6600FF] flex items-center justify-center shrink-0 border border-[#6600FF]/25">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <span className="animate-pulse">
                {isLoading ? 'Recherche en cours dans la base...' : 'Génération de la réponse...'}
              </span>
            </div>
          )}

          {/* Message d'erreur ou d'alerte de quota */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <div className="flex-1 space-y-1.5">
                <p className="font-semibold leading-relaxed">{error}</p>
                {!hasCustomKey && (
                  <button
                    type="button"
                    onClick={() => setShowKeyConfig(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#6600FF] text-white text-[11px] font-bold hover:bg-[#5500dd] transition-colors shadow-xs"
                  >
                    <Key className="w-3 h-3" />
                    <span>Renseigner ma clé API Gemini</span>
                  </button>
                )}
                {quotaExceeded && isGuest && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onAuthRequired?.();
                    }}
                    className="ml-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-black text-[11px] font-bold transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Se connecter</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions rapides */}
        {messages.length <= 2 && !isLoading && !isStreaming && (
          <div className="px-4 py-2 border-t border-black/5 dark:border-white/5 bg-gray-50/50 dark:bg-black/20 flex gap-2 overflow-x-auto no-scrollbar">
            {QUICK_SUGGESTIONS.map((sug, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(sug)}
                className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-white dark:bg-[#1E1E26] border border-black/10 dark:border-white/10 hover:border-[#6600FF]/50 dark:hover:border-[#6600FF]/50 text-gray-700 dark:text-zinc-300 hover:text-[#6600FF] transition-all shadow-2xs"
              >
                {sug}
              </button>
            ))}
          </div>
        )}

        {/* Barre de saisie */}
        <div className="p-3.5 bg-gray-50 dark:bg-[#181820] border-t border-black/[0.06] dark:border-white/5">
          <div className="flex items-center gap-2 bg-white dark:bg-[#121218] border border-black/10 dark:border-white/10 rounded-2xl px-3.5 py-1.5 focus-within:border-[#6600FF] dark:focus-within:border-[#6600FF] transition-all shadow-xs">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez une question sur les sorties, concerts, billets..."
              disabled={isLoading || isStreaming}
              className="flex-1 bg-transparent text-sm text-[#17131D] dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-hidden py-1"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading || isStreaming}
              className={`p-2 rounded-xl transition-all ${
                input.trim() && !isLoading && !isStreaming
                  ? 'bg-[#6600FF] text-white hover:bg-[#5500DD] shadow-md shadow-[#6600FF]/30'
                  : 'bg-gray-200 dark:bg-white/10 text-gray-400 dark:text-zinc-600 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
