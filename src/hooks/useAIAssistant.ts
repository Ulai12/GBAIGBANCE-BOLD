import { useState, useCallback, useRef, useEffect } from 'react';
import { streamAIAssistant, type AIAssistantMessage } from '@/services/aiAssistantService';
import { getGeminiConfig, type MapsGroundingPlace } from '@/services/gemini';
import { supabase } from '@/infrastructure/supabase';
import { useApp } from '@/hooks/useApp';
import { shouldShareLocationWithAssistant } from '@/services/aiSettings';
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
  groundingPlaces?: MapsGroundingPlace[];
  model?: string;
}

export function useAIAssistant() {
  const { user, session, userLocation } = useApp();
  const [fastMode, setFastMode] = useState<boolean>(
    () => getGeminiConfig().model === 'gemini-3.1-flash-lite'
  );
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      text: user
        ? `Bonjour ${user.name ? user.name.split(' ')[0] : ''} ! Je suis votre concierge Gbaigbance. Envie de sortir ce week-end, de trouver un concert, de repérer des lieux sur Google Maps ou de consulter vos billets ?`
        : 'Bonjour ! Je suis votre concierge Gbaigbance. Quel genre d’événement, de concert ou d’adresse recherchez-vous aujourd’hui ?',
      timestamp: new Date(),
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [verifiedEvents, setVerifiedEvents] = useState<Record<string, Event>>({});

  const abortRef = useRef<(() => void) | null>(null);

  const resetAllChatData = useCallback((activeUser: typeof user) => {
    if (abortRef.current) {
      abortRef.current();
    }
    setIsLoading(false);
    setIsStreaming(false);
    setError(null);
    setQuotaExceeded(false);
    setVerifiedEvents({});
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        text: activeUser
          ? `Bonjour ${activeUser.name ? activeUser.name.split(' ')[0] : ''} ! Je suis votre concierge Gbaigbance. Envie de sortir ce week-end, de trouver un concert, de repérer des lieux sur Google Maps ou de consulter vos billets ?`
          : 'Bonjour ! Je suis votre concierge Gbaigbance. Quel genre d’événement, de concert ou d’adresse recherchez-vous aujourd’hui ?',
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Clé d'authentification unique : tout changement déclenche la purge immédiate
  const authKey = `${user?.id || 'guest'}-${session?.user?.id || 'none'}`;

  useEffect(() => {
    resetAllChatData(user);
  }, [authKey, resetAllChatData, user]);

  useEffect(() => {
    const handleSignedOut = () => {
      resetAllChatData(null);
    };

    const handleSignedIn = () => {
      resetAllChatData(user);
    };

    window.addEventListener('gba-user-signed-out', handleSignedOut);
    window.addEventListener('gba-user-signed-in', handleSignedIn);
    return () => {
      window.removeEventListener('gba-user-signed-out', handleSignedOut);
      window.removeEventListener('gba-user-signed-in', handleSignedIn);
    };
  }, [resetAllChatData, user]);

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current();
      }
    };
  }, []);

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

      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        text: '',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsLoading(true);

      const historyForApi: AIAssistantMessage[] = [...messages, userMsg]
        .filter((m) => !m.id.startsWith('welcome') && m.text.trim().length > 0)
        .slice(-12)
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      const gpsLocation =
        shouldShareLocationWithAssistant() &&
        userLocation?.isActual &&
        typeof userLocation.latitude === 'number' &&
        typeof userLocation.longitude === 'number'
          ? { lat: userLocation.latitude, lng: userLocation.longitude }
          : null;

      let accumulatedText = '';

      const cancel = await streamAIAssistant(
        {
          messages: historyForApi,
          userLocation: gpsLocation,
          fastMode,
          useMapsGrounding: !fastMode && getGeminiConfig().enableMapsGrounding,
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
          onDone: (verifiedEventIds, meta) => {
            setIsLoading(false);
            setIsStreaming(false);

            const places = meta?.groundingPlaces || [];
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      ...(verifiedEventIds.length > 0 ? { eventIds: verifiedEventIds } : {}),
                      ...(places.length > 0 ? { groundingPlaces: places } : {}),
                      ...(meta?.model ? { model: meta.model } : {}),
                    }
                  : m
              )
            );

            if (verifiedEventIds.length > 0) {
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

            if (!accumulatedText) {
              setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
            }
          },
        }
      );

      abortRef.current = cancel;
    },
    [isLoading, isStreaming, messages, userLocation, fastMode, loadVerifiedEvents]
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
    fastMode,
    setFastMode,
  };
}
