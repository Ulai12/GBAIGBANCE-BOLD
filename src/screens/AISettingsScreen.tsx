import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  HelpCircle,
  Sparkles,
  Info,
  Key,
  ExternalLink,
  Cpu,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  Check,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import {
  getGeminiConfig,
  saveGeminiConfig,
  testGeminiApiKey,
  GEMINI_AVAILABLE_MODELS,
  type GeminiConfig,
} from '@/services/gemini';

interface AISettingsScreenProps {
  onBack: () => void;
  onToast?: (toast: { message: string; type?: 'success' | 'error' | 'info' }) => void;
}

export const AISettingsScreen: React.FC<AISettingsScreenProps> = ({
  onBack,
  onToast,
}) => {
  const [config, setConfig] = useState<GeminiConfig>(getGeminiConfig);
  const [apiKeyInput, setApiKeyInput] = useState(config.apiKey);
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);

  useEffect(() => {
    const current = getGeminiConfig();
    setConfig(current);
    setApiKeyInput(current.apiKey);
  }, []);

  const handleToggleEnable = (newVal: boolean) => {
    const updated = saveGeminiConfig({ enabled: newVal });
    setConfig(updated);
    if (newVal && !updated.apiKey.trim()) {
      onToast?.({
        message: 'Activez l’IA en renseignant votre clé API Google Gemini.',
        type: 'info',
      });
    } else if (newVal) {
      onToast?.({
        message: 'Fonctionnalités Gemini activées.',
        type: 'success',
      });
    } else {
      onToast?.({
        message: 'Fonctionnalités Gemini désactivées.',
        type: 'info',
      });
    }
  };

  const persistKey = (val: string) => {
    const trimmed = val.trim();
    const updated = saveGeminiConfig({
      apiKey: trimmed,
      enabled: trimmed.length > 5 ? true : config.enabled,
    });
    setConfig(updated);
    return updated;
  };

  const handleSaveKey = () => {
    persistKey(apiKeyInput);
    onToast?.({ message: 'Clé API enregistrée avec succès.', type: 'success' });
    setTestResult(null);
  };

  const handleTestKey = async () => {
    const keyToTest = apiKeyInput.trim() || config.apiKey.trim();
    if (!keyToTest) {
      setTestResult({
        success: false,
        message: 'Veuillez saisir une clé API Gemini pour tester la connexion.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const res = await testGeminiApiKey(keyToTest, config.model);
    setIsTesting(false);
    setTestResult(res);

    if (res.success) {
      // Auto-save and enable if test succeeds
      const updated = saveGeminiConfig({
        apiKey: keyToTest,
        enabled: true,
      });
      setConfig(updated);
      onToast?.({ message: 'Connexion à Gemini validée avec succès !', type: 'success' });
    } else {
      onToast?.({ message: res.message, type: 'error' });
    }
  };

  const handleSelectModel = (model: string) => {
    const updated = saveGeminiConfig({ model });
    setConfig(updated);
    setShowModelPicker(false);
    onToast?.({ message: `Modèle sélectionné : ${model}`, type: 'info' });
  };

  const handleToggleMaps = () => {
    const updated = saveGeminiConfig({
      enableMapsGrounding: !config.enableMapsGrounding,
    });
    setConfig(updated);
  };

  const handleReset = () => {
    const updated = saveGeminiConfig({
      apiKey: '',
      enabled: false,
    });
    setConfig(updated);
    setApiKeyInput('');
    setTestResult(null);
    onToast?.({ message: 'Configuration réinitialisée.', type: 'info' });
  };

  const isConfigured = config.enabled && config.apiKey.trim().length > 10;
  const currentModelOption = GEMINI_AVAILABLE_MODELS.find((m) => m.id === config.model) || {
    id: config.model,
    name: config.model,
    badge: 'Standard',
    description: 'Modèle sélectionné',
  };

  return (
    <div className="min-h-screen bg-[#F5F3FB] dark:bg-[#111116] text-[#17131D] dark:text-white flex flex-col antialiased transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-4 bg-white/85 dark:bg-[#111116]/90 backdrop-blur-md border-b border-black/[0.06] dark:border-white/5">
        <button
          id="ai-settings-back-button"
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-300 hover:text-[#6600FF] hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
          aria-label="Retour"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <h1 className="text-base font-bold tracking-tight text-[#17131D] dark:text-white">
          Intelligence artificielle
        </h1>

        <button
          id="ai-settings-help-button"
          type="button"
          onClick={() => setShowGuideModal(true)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-300 hover:text-[#6600FF] hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
          aria-label="Guide d'installation"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-xl w-full mx-auto px-4 py-6 space-y-5">
        {/* Intro Card */}
        <section className="bg-white dark:bg-[#1C1C23] border border-black/[0.06] dark:border-white/5 rounded-3xl p-5 shadow-[0_8px_30px_rgba(102,0,255,0.06)] dark:shadow-lg relative overflow-hidden">
          <h2 className="text-base font-extrabold text-[#17131D] dark:text-white text-center mb-2.5 tracking-tight">
            Intelligence artificielle
          </h2>
          <p className="text-xs leading-relaxed text-gray-600 dark:text-zinc-300 text-center font-normal">
            Gbaigbance Intelligence fait appel à des fournisseurs tiers listés ci-dessous.
            L'IA peut commettre des erreurs. Cette fonctionnalité est optionnelle.
            Vous pouvez personnaliser les informations partagées avec les modèles d'IA ci-dessous.
            N'utilisez pas ce service si vous ne souhaitez pas partager d'informations avec certains modèles.
          </p>

          <button
            id="ai-guide-link-button"
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="mt-4 w-full py-2.5 px-4 rounded-2xl bg-gray-50 hover:bg-gray-100 dark:bg-[#262631] dark:hover:bg-[#30303E] active:scale-[0.99] border border-black/[0.06] dark:border-white/5 flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-zinc-200 transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-4 h-4 text-[#6600FF] dark:text-zinc-400 group-hover:text-[#6600FF] dark:group-hover:text-white" />
              <span>Consultez le guide d'installation</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#6600FF] dark:group-hover:text-white" />
          </button>
        </section>

        {/* Google Gemini Card */}
        <section className="bg-white dark:bg-[#1C1C23] border border-black/[0.06] dark:border-white/5 rounded-3xl p-5 shadow-[0_8px_30px_rgba(102,0,255,0.06)] dark:shadow-lg space-y-4">
          {/* Card Header with Sparkle, Title, Subtitle, Info, Switch */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6600FF] to-[#A855F7] flex items-center justify-center shadow-md shadow-[#6600FF]/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#17131D] dark:text-white tracking-tight">
                  Google Gemini
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Modèle en ligne</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowInfoModal(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                aria-label="Informations sur Gemini"
              >
                <Info className="w-4 h-4" />
              </button>

              {/* iOS Style Toggle Switch */}
              <button
                id="gemini-toggle-switch"
                type="button"
                role="switch"
                aria-checked={config.enabled}
                onClick={() => handleToggleEnable(!config.enabled)}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  config.enabled ? 'bg-[#34C759]' : 'bg-gray-300 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    config.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Conditional Controls when toggle is checked */}
          {config.enabled && (
            <div className="pt-2 space-y-3.5 animate-in fade-in duration-200">
              {/* Green Success Banner or Setup Status */}
              {isConfigured ? (
                <div
                  id="gemini-success-banner"
                  className="rounded-2xl p-4 bg-emerald-50 dark:bg-[#132A1C] border border-emerald-200 dark:border-[#238636]/40 text-emerald-800 dark:text-[#4ADE80] flex items-start gap-3 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#4ADE80] shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-extrabold text-sm tracking-tight text-emerald-700 dark:text-[#4ADE80]">
                      Connecté & Opérationnel
                    </p>
                    <p className="text-gray-700 dark:text-zinc-200 leading-relaxed font-normal">
                      Votre clé est active et sauvegardée. Vous pouvez utiliser l'Assistant IA sur l'écran d'accueil ou consulter les conseils intelligents sur vos événements.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <p className="font-bold text-amber-900 dark:text-amber-200">Clé API requise</p>
                    <p className="text-gray-700 dark:text-zinc-300 leading-relaxed">
                      Saisissez votre clé API Gemini personnelle ci-dessous. Elle sera enregistrée automatiquement pour toutes vos sessions.
                    </p>
                  </div>
                </div>
              )}

              {/* API Key Input Field */}
              <div className="space-y-2">
                <div className="relative flex items-center">
                  <input
                    id="gemini-api-key-input"
                    type={showKey ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setApiKeyInput(val);
                      if (val.trim().length > 15) {
                        persistKey(val);
                      }
                    }}
                    onBlur={() => {
                      if (apiKeyInput.trim()) {
                        persistKey(apiKeyInput);
                      }
                    }}
                    placeholder="Collez votre clé API Gemini (AIzaSy...)"
                    className="w-full py-3.5 pl-4 pr-20 rounded-2xl bg-gray-50 dark:bg-[#121217] border border-gray-200 dark:border-zinc-800 text-xs font-mono text-[#17131D] dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-hidden focus:border-[#6600FF] focus:ring-1 focus:ring-[#6600FF] transition-all shadow-xs"
                  />
                  <div className="absolute right-2.5 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-white transition-colors"
                      aria-label={showKey ? 'Masquer la clé' : 'Afficher la clé'}
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <div className="p-1.5 text-gray-400 dark:text-zinc-500">
                      <Key className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Actions row: Enregistrer & Tester */}
                <div className="flex items-center gap-2">
                  <button
                    id="gemini-save-key-button"
                    type="button"
                    onClick={handleSaveKey}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#6600FF] hover:bg-[#5200CC] active:scale-[0.98] text-white text-xs font-bold transition-all shadow-sm shadow-[#6600FF]/25 flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Enregistrer la clé</span>
                  </button>

                  <button
                    id="gemini-test-key-button"
                    type="button"
                    onClick={handleTestKey}
                    disabled={isTesting}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-[#262631] dark:hover:bg-[#30303E] active:scale-[0.98] border border-black/[0.06] dark:border-white/5 text-gray-800 dark:text-zinc-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6600FF]" />
                        <span>Test en cours...</span>
                      </>
                    ) : (
                      <>
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Tester la clé</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Inline Test Feedback */}
                {testResult && (
                  <div
                    className={`text-xs p-3 rounded-xl border flex items-center gap-2 ${
                      testResult.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-500/30 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>

              {/* Row 1: Obtenir la clé API */}
              <a
                id="gemini-get-api-key-link"
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-3.5 rounded-2xl bg-gray-50 hover:bg-gray-100 dark:bg-[#141419] dark:hover:bg-[#1A1A21] border border-black/[0.06] dark:border-white/5 flex items-center justify-between text-xs font-medium text-gray-700 dark:text-zinc-200 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Key className="w-4 h-4 text-[#6600FF] dark:text-zinc-400 group-hover:text-[#6600FF] dark:group-hover:text-white" />
                  <span className="font-semibold text-[#17131D] dark:text-white">Obtenir une clé API gratuite</span>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#6600FF] dark:group-hover:text-white" />
              </a>

              {/* Row 2: Modèle d'IA */}
              <div className="w-full py-2.5 px-3.5 rounded-2xl bg-gray-50 dark:bg-[#141419] border border-black/[0.06] dark:border-white/5 flex items-center justify-between text-xs relative">
                <div className="flex items-center gap-3">
                  <Cpu className="w-4 h-4 text-[#6600FF] dark:text-zinc-400" />
                  <div>
                    <span className="font-semibold text-[#17131D] dark:text-white block">
                      Modèle d'IA
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-zinc-400">
                      {currentModelOption.badge} · {currentModelOption.name}
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <button
                    id="gemini-model-selector-button"
                    type="button"
                    onClick={() => setShowModelPicker(!showModelPicker)}
                    className="py-1.5 px-3 rounded-xl bg-white dark:bg-[#262631] hover:bg-gray-100 dark:hover:bg-[#323240] text-[#6600FF] dark:text-white font-mono text-[11px] font-bold border border-black/[0.08] dark:border-white/10 shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <span>{config.model}</span>
                  </button>

                  {/* Dropdown for Model (expanded list) */}
                  {showModelPicker && (
                    <div className="absolute right-0 bottom-full mb-2 w-72 rounded-2xl bg-white dark:bg-[#1E1E26] border border-black/10 dark:border-zinc-700 shadow-2xl p-2 z-50 space-y-1 animate-in fade-in duration-150">
                      <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider font-extrabold text-gray-500 dark:text-zinc-400 border-b border-black/[0.06] dark:border-white/5">
                        Sélectionner le modèle Gemini
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-1">
                        {GEMINI_AVAILABLE_MODELS.map((m) => {
                          const isSelected = config.model === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => handleSelectModel(m.id)}
                              className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                                isSelected
                                  ? 'bg-[#6600FF] text-white font-bold shadow-xs'
                                  : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-mono text-[11px] font-bold truncate">{m.name}</p>
                                  {m.badge && (
                                    <span
                                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-sans ${
                                        isSelected
                                          ? 'bg-white/20 text-white'
                                          : 'bg-[#6600FF]/10 text-[#6600FF] dark:bg-white/10 dark:text-purple-300'
                                      }`}
                                    >
                                      {m.badge}
                                    </span>
                                  )}
                                </div>
                                <p
                                  className={`text-[10px] font-sans truncate ${
                                    isSelected ? 'text-white/80' : 'text-gray-500 dark:text-zinc-400'
                                  }`}
                                >
                                  {m.description}
                                </p>
                              </div>
                              {isSelected && <Check className="w-4 h-4 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 3: Google Maps Grounding */}
              <div className="w-full py-3 px-3.5 rounded-2xl bg-gray-50 dark:bg-[#141419] border border-black/[0.06] dark:border-white/5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  <div>
                    <span className="font-semibold text-[#17131D] dark:text-white block">
                      Données Google Maps
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-normal">
                      Maps Grounding en direct
                    </span>
                  </div>
                </div>

                <button
                  id="gemini-maps-grounding-toggle"
                  type="button"
                  role="switch"
                  aria-checked={config.enableMapsGrounding}
                  onClick={handleToggleMaps}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    config.enableMapsGrounding ? 'bg-[#34C759]' : 'bg-gray-300 dark:bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      config.enableMapsGrounding ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Reset key action if present */}
              {config.apiKey && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-[11px] text-gray-500 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400 flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Effacer la clé de cet appareil</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Guide d'installation Modal */}
      {showGuideModal && (
        <div
          id="ai-guide-modal"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1A1A22] border border-black/10 dark:border-white/10 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#6600FF]/15 flex items-center justify-center text-[#6600FF]">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#17131D] dark:text-white">
                    Guide d'installation Gemini
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">Obtenir une clé API gratuite</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-700 dark:text-zinc-300 leading-relaxed">
              <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#14141A] border border-black/[0.04] dark:border-white/5">
                <p className="font-bold text-[#17131D] dark:text-white mb-1">1. Rendez-vous sur Google AI Studio</p>
                <p className="text-gray-600 dark:text-zinc-400">
                  Ouvrez <strong>aistudio.google.com/app/apikey</strong> et connectez-vous avec votre compte Google.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#14141A] border border-black/[0.04] dark:border-white/5">
                <p className="font-bold text-[#17131D] dark:text-white mb-1">2. Créez une nouvelle clé API</p>
                <p className="text-gray-600 dark:text-zinc-400">
                  Cliquez sur <strong>« Create API key »</strong> (Créer une clé API). La clé est gratuite et utilisable immédiatement.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#14141A] border border-black/[0.04] dark:border-white/5">
                <p className="font-bold text-[#17131D] dark:text-white mb-1">3. Collez-la dans Gbaigbance</p>
                <p className="text-gray-600 dark:text-zinc-400">
                  Revenez ici, collez la clé dans le champ et cliquez sur <strong>« Enregistrer la clé »</strong>.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-3 px-4 rounded-2xl bg-[#6600FF] hover:bg-[#5200CC] text-white text-center font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#6600FF]/30"
              >
                <span>Ouvrir Google AI Studio</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="py-3 px-4 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-700 dark:text-white text-xs font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {showInfoModal && (
        <div
          id="ai-info-modal"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setShowInfoModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1A1A22] border border-black/10 dark:border-white/10 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-[#17131D] dark:text-white">
                À propos de Google Gemini
              </h3>
            </div>

            <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
              En fournissant votre propre clé API Google Gemini, vous débloquez l'assistant
              concierge événementiel de Gbaigbance :
            </p>

            <ul className="text-xs text-gray-600 dark:text-zinc-300 space-y-2 list-disc pl-4">
              <li>Recommandations sur mesure selon vos goûts, la ville et le budget.</li>
              <li>Localisation précise et adresses grâce au Maps Grounding Google Maps.</li>
              <li>Conseils pratiques sur chaque événement (tenue, parkings, ambiance).</li>
              <li>Votre clé est enregistrée exclusivement sur votre appareil (stockage local sécurisé).</li>
            </ul>

            <button
              type="button"
              onClick={() => setShowInfoModal(false)}
              className="w-full py-3 rounded-2xl bg-[#6600FF] hover:bg-[#5200CC] text-white font-bold text-xs shadow-md shadow-[#6600FF]/25"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

