import React, { useState } from 'react';
import { Download, Share, PlusSquare, X, CheckCircle, Smartphone, Check } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'button' | 'menu-item' | 'icon';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'button',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // If already running as installed standalone app, show subtle status or hide
  if (isInstalled) {
    if (variant === 'menu-item') {
      return (
        <div className="w-full p-4 flex items-center justify-between opacity-80">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-left">
              <p className="font-bold text-[#1A1A2E] dark:text-white text-sm">Application installée</p>
              <p className="text-xs text-emerald-600 font-medium">Mode autonome actif</p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  const handleAction = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // Browser doesn't support beforeinstallprompt (e.g. desktop firefox / unsupported browser)
      setShowIOSModal(true);
    }
  };

  return (
    <>
      {variant === 'menu-item' && (
        <button
          id="pwa-profile-install-button"
          type="button"
          onClick={handleAction}
          className={`w-full p-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${className}`}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#6600FF]/10 flex items-center justify-center">
              <Download className="w-5 h-5 text-[#6600FF]" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-[#1A1A2E] dark:text-white text-sm">Installer l'application</p>
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-[#6600FF] text-white">
                  PWA
                </span>
              </div>
              <p className="text-xs text-gray-500">Ajouter à l'écran d'accueil</p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#6600FF] bg-[#6600FF]/10 px-2.5 py-1 rounded-full">
            Installer
          </span>
        </button>
      )}

      {variant === 'icon' && (
        <button
          id="pwa-header-install-icon"
          type="button"
          onClick={handleAction}
          title="Installer l'application"
          aria-label="Installer l'application Gbaigbance sur votre appareil"
          className={`w-10 h-10 rounded-full bg-[#6600FF]/10 text-[#6600FF] flex items-center justify-center active:scale-90 transition-transform ${className}`}
        >
          <Download className="w-5 h-5" />
        </button>
      )}

      {variant === 'button' && (
        <button
          id="pwa-inline-install-button"
          type="button"
          onClick={handleAction}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#6600FF] hover:bg-[#5200CC] active:scale-95 text-white text-xs font-bold shadow-sm shadow-[#6600FF]/25 transition-all ${className}`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isIOS ? "Ajouter à l'écran d'accueil" : "Installer l'app"}</span>
        </button>
      )}

      {/* iOS & Browser guidance modal */}
      {showIOSModal && (
        <div
          id="pwa-modal-guide"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setShowIOSModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-gray-100 dark:border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm">
                  <img src="/pwa-192x192.png" alt="Gbaigbance" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">Installer Gbaigbance</h3>
                  <p className="text-xs text-zinc-500">Guide d'installation mobile</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-sm text-zinc-700 dark:text-zinc-300 mb-6">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50">
                <div className="w-8 h-8 rounded-xl bg-[#6600FF]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Share className="w-4 h-4 text-[#6600FF]" />
                </div>
                <div>
                  <p className="font-semibold text-xs text-zinc-900 dark:text-white">Étape 1</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Appuyez sur le menu du navigateur ou l'icône <strong>Partager</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50">
                <div className="w-8 h-8 rounded-xl bg-[#6600FF]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <PlusSquare className="w-4 h-4 text-[#6600FF]" />
                </div>
                <div>
                  <p className="font-semibold text-xs text-zinc-900 dark:text-white">Étape 2</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Sélectionnez <strong>« Ajouter à l'écran d'accueil »</strong> ou <strong>« Installer l'application »</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-xs text-zinc-900 dark:text-white">Étape 3</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Confirmez pour lancer l'application en plein écran comme une app native !
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-3 rounded-2xl bg-[#6600FF] hover:bg-[#5500D4] text-white font-bold text-sm shadow-md shadow-[#6600FF]/25 transition-all flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              <span>C'est compris !</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
