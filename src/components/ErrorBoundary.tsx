import { Component, type ReactNode, type ErrorInfo } from 'react';
import * as Sentry from '@sentry/react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    try {
      Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
    } catch {
      // Sentry fallback
    }
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-[#FAF9FD] dark:bg-[#0F0D17] text-[#17131D] dark:text-white">
          <div className="max-w-md w-full p-8 rounded-[2.2rem] bg-white dark:bg-[#1A1828] border border-black/[0.06] dark:border-white/[0.08] shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-black tracking-tight mb-2">
              Une anomalie passagère est survenue
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium leading-relaxed">
              L'application a rencontré une interruption inattendue. Vos données et vos billets restent en sécurité.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#6600FF] hover:bg-[#5500DD] active:scale-95 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#6600FF]/25 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Relancer l'application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
