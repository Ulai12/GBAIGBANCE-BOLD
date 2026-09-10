import { useState, useCallback } from 'react';
import type { Profile, UserRole } from '@/types';

export const LOCAL_PROFILE_KEY = 'gba_profile';

export interface LocalProfileSnapshot {
  id: string;
  name: string;
  avatar_url: string | null;
  role: UserRole;
  city?: string;
  country?: string;
}

/**
 * Sanitizes a full profile to a minimal safe snapshot:
 * Explicitly strips sensitive data: gemini_config (API keys), email, phone number,
 * so that shared devices or inspected storage never leak secrets or bypass role checks.
 */
export function sanitizeProfileSnapshot(profile: Profile | LocalProfileSnapshot | null): LocalProfileSnapshot | null {
  if (!profile || !profile.id) return null;
  return {
    id: profile.id,
    name: profile.name || 'Utilisateur',
    avatar_url: profile.avatar_url || null,
    role: profile.role || 'participant',
    city: profile.city || 'Lomé',
    country: profile.country || 'Togo',
  };
}

/**
 * Reads local profile snapshot synchronously from localStorage ('gba_profile')
 */
export function getLocalProfile(): LocalProfileSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return sanitizeProfileSnapshot(parsed);
  } catch {
    return null;
  }
}

/**
 * Writes sanitized snapshot to localStorage ('gba_profile')
 */
export function saveLocalProfile(profile: Profile | LocalProfileSnapshot | null): void {
  if (typeof window === 'undefined') return;
  try {
    const sanitized = sanitizeProfileSnapshot(profile);
    if (sanitized) {
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(sanitized));
    } else {
      localStorage.removeItem(LOCAL_PROFILE_KEY);
    }
  } catch {
    // Ignore storage quota error
  }
}

/**
 * Clears local profile from localStorage
 */
export function clearLocalProfile(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LOCAL_PROFILE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Hook `useLocalProfile` for immediate 0ms UI hydration and synchronized updates.
 */
export function useLocalProfile() {
  const [profile, setProfileState] = useState<LocalProfileSnapshot | null>(() => getLocalProfile());

  const updateProfile = useCallback((newProfile: Profile | LocalProfileSnapshot | null) => {
    const sanitized = sanitizeProfileSnapshot(newProfile);
    setProfileState(sanitized);
    saveLocalProfile(sanitized);
  }, []);

  const removeProfile = useCallback(() => {
    setProfileState(null);
    clearLocalProfile();
  }, []);

  return {
    profile,
    setLocalProfile: updateProfile,
    clearLocalProfile: removeProfile,
  };
}
