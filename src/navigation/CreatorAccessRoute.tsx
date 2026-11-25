import type { ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@/hooks/useApp';
import { AppLoadingScreen } from '@/components/Skeleton';
import { UnauthorizedCreateGate } from '@/components/UnauthorizedCreateGate';
import { canManageEvents } from '@/security/rbac';

interface CreatorAccessRouteProps {
  children: ReactNode;
  fallbackPath?: string;
}

/**
 * Garde UI des espaces créateurs : attend la restauration de session,
 * puis exige une session Supabase et un rôle autorisé.
 * Les politiques RLS restent l'autorité pour les opérations de données.
 */
export function CreatorAccessRoute({ children, fallbackPath = '/' }: CreatorAccessRouteProps) {
  const { session, user, isSessionResolving } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  if (isSessionResolving) return <AppLoadingScreen />;

  if (!session) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ returnTo }} />;
  }

  if (!user || !canManageEvents(user.role)) {
    return <UnauthorizedCreateGate onBack={() => navigate(fallbackPath, { replace: true })} />;
  }

  return <>{children}</>;
}
