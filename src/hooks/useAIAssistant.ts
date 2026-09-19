import { useState, useCallback, useRef, useEffect } from 'react';
import { streamAIAssistant, type AIAssistantMessage } from '@/services/aiAssistantService';
import { supabase } from '@/infrastructure/supabase';
import { useApp } from '@/hooks/useApp';
import type { Event } from '@/types';

// ====================================================================
// GBAIGBANCE — HOOK REACT POUR L'ASSISTANT IA (FAST REFRESH COMPLIANT)
// ====================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  eventIds?: string[];
}

export function useAIAssistant() {
  const { user, userLocation } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      text: user
        ? `Bonjour ${user.name ? user.name.split(' ')[0] : ''} ! Je suis votre concierge Gbaigbance. Envie de sortir ce week-end, de trouver un concert ou de consulter vos billets ?`
        : 'Bonjour ! Je suis votre concierge Gbaigbance. Quel genre d’événement ou de concert recherchez-vous aujourd’hui ?',
      timestamp: new Date(),
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [verifiedEvents, setVerifiedEvents] = useState<Record<string, Event>>({});

  const abortRef = useRef<(() => void) | null>(null);

  // Nettoyage à la fermeture
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current();
      }
    };
  }, []);

  // Charge les événements retournés par les outils pour afficher des cartes natives sécurisées
  const loadVerifiedEvents = useCallback(async (eventIds: string[]) => {
    if (!eventIds || eventIds.length === 0) return;

    try {
      const { data } = await supabase
        .from('events')
        .select('id, title, category, starts_at, ends_at, location_name, location_address, city, country, price_min, price_max, currency, cover_url')
        .in('id', eventIds)
        .eq('status', 'published');

      if (data && data.length > 0) {
        setVerifiedEvents((prev) => {
          const next = { ...prev };
          for (const ev of data) {
            next[ev.id] = ev as unknown as Event;
          }
          return next;
        });
      }
    } catch {
      // Échec silencieux du chargement d'aperçu d'événement
    }
  }, []);

  const sendMessage = useCallback(
    async (inputText: string) => {
      const trimmed = inputText.trim();
      if (!trimmed || isLoading || isStreaming) return;

      setError(null);
      setQuotaExceeded(false);

      const userMsgId = `user-${Date.now()}`;
      const assistantMsgId = `assistant-${Date.now()}`;

      const userMsg: ChatMessage = {
        id: userMsgId,
        role: 'user',
        text: trimmed,
        timestamp: new Date(),
      };

      // Message assistant temporaire pour le streaming
      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        text: '',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsLoading(true);

      // Préparation de l'historique récent
      const historyForApi: AIAssistantMessage[] = [...messages, userMsg]
        .slice(-8)
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      // Injection de la position si le GPS réel est consenti et actif
      const gpsLocation =
        userLocation?.isActual && typeof userLocation.latitude === 'number'
          ? { lat: userLocation.latitude, lng: userLocation.longitude }
          : null;

      let accumulatedText = '';

      const cancel = await streamAIAssistant(
        {
          messages: historyForApi,
          userLocation: gpsLocation,
        },
        {
          onChunk: (chunk) => {
            setIsLoading(false);
            setIsStreaming(true);
            accumulatedText += chunk;

            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId ? { ...m, text: accumulatedText } : m
              )
            );
          },
          onDone: (verifiedEventIds) => {
            setIsLoading(false);
            setIsStreaming(false);

            if (verifiedEventIds.length > 0) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, eventIds: verifiedEventIds }
                    : m
                )
              );
              loadVerifiedEvents(verifiedEventIds);
            }
          },
          onError: (errMsg, isQuota) => {
            setIsLoading(false);
            setIsStreaming(false);
            setError(errMsg);
            if (isQuota) {
              setQuotaExceeded(true);
            }

            // Supprime le message assistant vide en cas d'erreur totale
            if (!accumulatedText) {
              setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
            }
          },
        }
      );

      abortRef.current = cancel;
    },
    [isLoading, isStreaming, messages, userLocation, loadVerifiedEvents]
  );

  const clearHistory = useCallback(() => {
    if (abortRef.current) {
      abortRef.current();
    }
    setIsLoading(false);
    setIsStreaming(false);
    setError(null);
    setQuotaExceeded(false);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        text: user
          ? `Conversation réinitialisée. Comment puis-je vous aider, ${user.name ? user.name.split(' ')[0] : ''} ?`
          : 'Conversation réinitialisée. Quel genre d’événement recherchez-vous ?',
        timestamp: new Date(),
      },
    ]);
  }, [user]);

  return {
    messages,
    sendMessage,
    clearHistory,
    isLoading,
    isStreaming,
    error,
    quotaExceeded,
    verifiedEvents,
    isGuest: !user,
  };
}
