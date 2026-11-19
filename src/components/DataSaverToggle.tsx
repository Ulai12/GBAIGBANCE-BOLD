import React from 'react';
import { Database, ZapOff, Globe } from 'lucide-react';
import { useDataSaver, type DataSaverPreference } from '@/hooks/useDataSaver';
import { haptic } from '@/hooks/useHaptics';
import { useApp } from '@/hooks/useApp';

interface DataSaverToggleProps {
  variant?: 'compact' | 'card' | 'pill';
  className?: string;
  onToast?: (toast: { message: string; type: 'success' | 'info' | 'error' }) => void;
}

export const DataSaverToggle: React.FC<DataSaverToggleProps> = ({
  variant = 'compact',
  className = '',
  onToast,
}) => {
  const {
    isDataSaverActive,
    preference,
    setPreference,
    toggleDataSaver,
    effectiveType,
    isSaveDataHeaderDetected,
  } = useDataSaver();
  const { t } = useApp();

  const handleToggle = () => {
    haptic.selection();
    toggleDataSaver();
    const nextState = !isDataSaverActive;
    if (onToast) {
      onToast({
        message: nextState
          ? t('settings', 'dataSaver.enabledToast')
          : t('settings', 'dataSaver.disabledToast'),
        type: 'info',
      });
    }
  };

  const handleSelectPreference = (pref: DataSaverPreference) => {
    haptic.selection();
    setPreference(pref);
    if (onToast) {
      const labels = {
        auto: t('settings', 'dataSaver.autoToast'),
        enabled: t('settings', 'dataSaver.forcedToast'),
        disabled: t('settings', 'dataSaver.offToast'),
      };
      onToast({ message: labels[pref], type: 'info' });
    }
  };

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
          isDataSaverActive
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
            : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
        } ${className}`}
        title={t('settings', 'dataSaver.toggleTitle')}
        aria-label={t('settings', 'dataSaver.toggleLabel')}
      >
        {isDataSaverActive ? (
          <ZapOff className="w-3.5 h-3.5 text-emerald-500" />
        ) : (
          <Database className="w-3.5 h-3.5 text-gray-400" />
        )}
        <span>{isDataSaverActive ? t('settings', 'dataSaver.enabledShort') : t('settings', 'dataSaver.disabledShort')}</span>
        {effectiveType && (
          <span className="text-[10px] px-1 py-0.2 bg-black/10 dark:bg-white/10 rounded font-mono uppercase">
            {effectiveType}
          </span>
        )}
      </button>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`card p-4 flex flex-col gap-3 ${className}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                isDataSaverActive
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-[#6600FF]/10 text-[#6600FF]'
              }`}
            >
              {isDataSaverActive ? <ZapOff className="w-5 h-5" /> : <Database className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-[#1A1A2E] dark:text-white text-sm">
                  {t('settings', 'dataSaver.title')}
                </h4>
                {isDataSaverActive && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    {t('settings', 'dataSaver.active')}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t('settings', 'dataSaver.description')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggle}
            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
              isDataSaverActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-zinc-700'
            }`}
            aria-pressed={isDataSaverActive}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                isDataSaverActive ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Network status badges & modes */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/5 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-gray-400" />
            <span>{t('settings', 'dataSaver.network')}</span>
            <span className="font-mono font-bold uppercase text-[#1A1A2E] dark:text-gray-200">
              {effectiveType}
            </span>
            {isSaveDataHeaderDetected && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded">
                {t('settings', 'dataSaver.saveDataActive')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleSelectPreference('auto')}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                preference === 'auto'
                  ? 'bg-[#6600FF] text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
              }`}
            >
              {t('settings', 'dataSaver.automatic')}
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreference('enabled')}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                preference === 'enabled'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
              }`}
            >
              {t('settings', 'dataSaver.forced')}
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreference('disabled')}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                preference === 'disabled'
                  ? 'bg-gray-800 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
              }`}
            >
              {t('settings', 'dataSaver.disabled')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Compact icon button for header bar
  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
        isDataSaverActive
          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 shadow-xs'
          : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
      } ${className}`}
      title={
        isDataSaverActive
          ? 'Mode Économie de Données ACTIF (cliquez pour désactiver)'
          : 'Activer le mode Économie de Données'
      }
      aria-label="Mode Économie de Données"
    >
      {isDataSaverActive ? <ZapOff className="w-4 h-4" /> : <Database className="w-4 h-4" />}
      {isDataSaverActive && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#14121E]" />
      )}
    </button>
  );
};
