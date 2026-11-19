import React, { useState } from 'react';
import { Download, Share, PlusSquare, X, CheckCircle, Smartphone } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useApp } from '@/hooks/useApp';

interface PWAInstallBannerProps {
  onDismiss?: () => void;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ onDismiss }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { t } = useApp();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('gbaigbance_pwa_banner_dismissed') === 'true';
  });

  if (isInstalled || dismissed) {
    return null;
  }

  // Only show if browser supports install prompt or is iOS
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('gbaigbance_pwa_banner_dismissed', 'true');
    onDismiss?.();
  };

  const handleAction = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <div
        id="pwa-install-banner"
        className="mx-5 mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-[#6600FF]/10 via-[#7B1FA2]/10 to-[#6600FF]/5 border border-[#6600FF]/20 backdrop-blur-md shadow-sm relative overflow-hidden transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6600FF] p-0.5 shadow-md shadow-[#6600FF]/25 shrink-0 flex items-center justify-center">
            <img src="/pwa-192x192.png" alt="Gbaigbance icon" className="w-full h-full object-cover rounded-[10px]" />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[#171726] dark:text-white text-xs tracking-tight">
                {t('settings', 'pwa.installApp')}
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-[#6600FF] text-white">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {t('settings', 'pwa.description')}
            </p>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label={t('settings', 'pwa.closeBanner')}
            className="absolute top-2.5 right-2.5 p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            id="pwa-install-action-button"
            type="button"
            onClick={handleAction}
            className="flex-1 py-2 px-3 rounded-xl bg-[#6600FF] hover:bg-[#5200CC] active:scale-[0.98] text-white text-xs font-bold transition-all shadow-sm shadow-[#6600FF]/25 flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isIOS ? t('settings', 'pwa.addToHome') : t('settings', 'pwa.installNow')}</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="py-2 px-3 rounded-xl bg-white/80 dark:bg-zinc-800/80 hover:bg-white text-gray-600 dark:text-gray-300 text-xs font-semibold border border-gray-200/80 dark:border-gray-700 transition-colors"
          >
            {t('settings', 'pwa.later')}
          </button>
        </div>
      </div>

      {/* iOS Installation Instruction Modal */}
      {showIOSModal && (
        <div
          id="pwa-ios-modal"
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
                  <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">{t('settings', 'pwa.iosTitle')}</h3>
                  <p className="text-xs text-zinc-500">{t('settings', 'pwa.safari')}</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                aria-label={t('common', 'close')}
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
                  <p className="font-semibold text-xs text-zinc-900 dark:text-white">{t('settings', 'pwa.step1')}</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {t('settings', 'pwa.iosShare')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50">
                <div className="w-8 h-8 rounded-xl bg-[#6600FF]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <PlusSquare className="w-4 h-4 text-[#6600FF]" />
                </div>
                <div>
                  <p className="font-semibold text-xs text-zinc-900 dark:text-white">{t('settings', 'pwa.step2')}</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {t('settings', 'pwa.iosAdd')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-xs text-zinc-900 dark:text-white">{t('settings', 'pwa.step3')}</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {t('settings', 'pwa.iosConfirm')}
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
              <span>{t('settings', 'pwa.understood')}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
