import { lazy, Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useSearchParams, useNavigationType, Navigate } from 'react-router-dom';
import { UnauthorizedCreateGate } from '@/components/UnauthorizedCreateGate';
import { BookingModal } from '@/components/BookingModal';
import { AppProvider } from '@/contexts/AppContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { DataSaverProvider } from '@/contexts/DataSaverContext';
import { useApp } from '@/hooks/useApp';
import { BottomNav } from '@/components/BottomNav';
import { ToastContainer, type ToastData } from '@/components/Toast';
import { EdgeSwipeBack } from '@/components/EdgeSwipeBack';
import { AIAssistantModal } from '@/components/AIAssistantModal';
import { SettingsModal } from '@/components/SettingsModal';
import { AppLoadingScreen } from '@/components/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { subscribeToUserTicketsLive } from '@/services/events';
import { getSyncCachedUserTickets } from '@/services/cache';
import { checkAndTriggerTicketReminders } from '@/services/eventReminderService';
import {
  EventDetailRoute,
  EditEventRoute,
  ArtistDetailRoute,
  OrganizerDetailRoute,
  UserProfileRoute,
} from '@/navigation/RouteWrappers';
import type { Event, Artist, Organization } from '@/types';
import { unlockDocumentScroll } from '@/utils/scrollUnlock';

// PLACEHOLDER_APP_BODY - will be replaced if this fails
export default function App() { return null; }
