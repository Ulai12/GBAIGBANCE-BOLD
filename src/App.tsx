import { lazy, Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from '@/contexts/AppContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { DataSaverProvider } from '@/contexts/DataSaverContext';
import { AppLoadingScreen } from '@/components/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppContent } from '@/AppContent';

// Spike de test Liquid Glass (chargé uniquement à la demande via ?spike=1)
const GlassSpike = lazy(() => import('@/components/glass/GlassSpike'));

function App() {
  // Détection du paramètre de test ?spike=1 (isolé et facilement retirable)
  const isSpikeRequested =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('spike') === '1';

  if (isSpikeRequested) {
    return (
      <Suspense fallback={<AppLoadingScreen />}>
        <GlassSpike />
      </Suspense>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <DataSaverProvider>
            <FavoritesProvider>
              <Suspense fallback={<AppLoadingScreen />}>
                <AppContent />
              </Suspense>
            </FavoritesProvider>
          </DataSaverProvider>
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
