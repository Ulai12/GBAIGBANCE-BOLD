import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  RotateCcw,
  Zap,
  Server,
  HelpCircle,
  Key,
  ExternalLink,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Cpu,
  SlidersHorizontal,
  RefreshCw,
  Crown,
} from 'lucide-react';
import {
  getUserGeminiApiKey,
  setUserGeminiApiKey,
  clearGeminiLocalConfig,
  testGeminiApiKey,
} from '@/services/gemini';
import { useApp } from '@/hooks/useApp';

/* =====================================================================
   FICHIER UNIQUE : tout ce qui était dans aiSettings.ts est ici.
   IMPORTANT : on n'exporte QUE le composant (voir bas de fichier), sinon
   Vite Fast Refresh casse (même problème que provider + hook).
   ===================================================================== */

/* ---------- Types ---------- */
type ModelTier = 'free' | 'paid'; // free = quota gratuit possible, paid = facturation requise
type TierFilter = 'all' | ModelTier;

interface GeminiModelInfo {
  id: string;
  label: string;
  tier: ModelTier;
  description: string;
  price?: string;
  preview?: boolean;
}

interface AISettings {
  model: string;
  temperature: number;
  maxOutputTokens: number;
  thinking: 'auto' | 'low' | 'high';
  answerStyle: 'concise' | 'balanced' | 'detailed';
  shareLocation: boolean;
}

/* ---------- Catalogue de secours (prix indicatifs, fin sept. 2026) ---------- */
const FALLBACK_MODELS: GeminiModelInfo[] = [
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite', tier: 'free', description: 'Le plus économique de la génération actuelle. Rapide, idéal mobile.', price: '0,25 $ / 1,50 $' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite', tier: 'free', description: 'Flash-Lite le plus récent : traduction, extraction, tâches d’agent.', price: '0,30 $ / 2,50 $' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', tier: 'free', description: 'Bon équilibre qualité / coût pour un concierge conversationnel.', price: '0,50 $ / 3,00 $', preview: true },
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', tier: 'free', description: 'Plus capable en raisonnement et en outils, plus coûteux.', price: '1,50 $ / 9,00 $' },
  { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', tier: 'paid', description: 'Meilleur raisonnement. Hors quota gratuit : facturation requise.', price: '2,00 $ / 12,00 $', preview: true },
];

/* ---------- Persistance des réglages (localStorage) ---------- */
// Clé à relire dans gemini.ts (voir le snippet fourni avec ce fichier).
const SETTINGS_KEY = 'gbaigbance_ai_settings_v1';

const DEFAULT_SETTINGS: AISettings = {
  model: 'gemini-3.1-flash-lite',
  temperature: 0.7,
  maxOutputTokens: 2048,
  thinking: 'auto',
  answerStyle: 'balanced',
  shareLocation: false, // opt-in : la position est une donnée sensible
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function loadSettings(): AISettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const merged = { ...DEFAULT_SETTINGS, ...(raw ? (JSON.parse(raw) as Partial<AISettings>) : {}) };
    // On re-borne : un localStorage corrompu ne doit jamais casser l'app.
    merged.temperature = clamp(Number(merged.temperature) || 0, 0, 2);
    merged.maxOutputTokens = clamp(Number(merged.maxOutputTokens) || 2048, 256, 8192);
    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(patch: Partial<AISettings>): AISettings {
  const next = { ...loadSettings(), ...patch };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    /* stockage bloqué : les réglages restent en mémoire pour la session */
  }
  return next;
}

function resetSettings(): AISettings {
  try {
    localStorage.removeItem(SETTINGS_KEY);
  } catch {
    /* ignoré */
  }
  return { ...DEFAULT_SETTINGS };
}

/* ---------- Liste en ligne des modèles accessibles avec la clé ---------- */
const EXCLUDED = /(image|tts|embedding|live|audio|veo|imagen|robotics|computer-use|aqa)/i;

async function fetchAvailableModels(apiKey: string): Promise<GeminiModelInfo[]> {
  // Clé dans l'en-tête (pas dans l'URL) pour ne pas fuiter dans les logs.
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', {
    headers: { 'x-goog-api-key': apiKey },
  });
  if (!res.ok) throw new Error(`Impossible de lister les modèles (HTTP ${res.status}).`);

  const data = (await res.json()) as {
    models?: { name: string; displayName?: string; description?: string; supportedGenerationMethods?: string[] }[];
  };
  const known = new Map(FALLBACK_MODELS.map((m) => [m.id, m]));
  const order = FALLBACK_MODELS.map((m) => m.id);

  return (data.models ?? [])
    .filter((m) => m.name.startsWith('models/gemini-') && m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => ({ id: m.name.replace('models/', ''), api: m }))
    .filter(({ id }) => !EXCLUDED.test(id))
    .map(({ id, api }): GeminiModelInfo =>
      known.get(id) ?? {
        id,
        label: api.displayName || id,
        tier: /pro/i.test(id) ? 'paid' : 'free', // heuristique : Pro = payant
        description: (api.description || 'Modèle Gemini.').slice(0, 120),
        preview: /preview|exp/i.test(id),
      }
    )
    .sort((a, b) => {
      const ia = order.indexOf(a.id);
      const ib = order.indexOf(b.id);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return b.id.localeCompare(a.id);
    });
}

/* ---------- Petits composants internes ---------- */
function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex p-1 rounded-xl bg-gray-100 dark:bg-white/5 gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            value === o.value
              ? 'bg-white dark:bg-[#2A2A3A] text-[#6600FF] dark:text-[#A855F7] shadow-xs'
              : 'text-gray-500 dark:text-zinc-400'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-[#6600FF]' : 'bg-gray-300 dark:bg-zinc-600'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

/* ---------- Écran ---------- */
interface AISettingsScreenProps {
  onBack: () => void;
  onToast?: (toast: { message: string; type?: 'success' | 'error' | 'info' }) => void;
}

export const AISettingsScreen: React.FC<AISettingsScreenProps> = ({ onBack, onToast }) => {
  const { user, userLocation } = useApp(); // CORRECTION : userLocation est maintenant utilisé (interrupteur position)

  const [apiKeyInput, setApiKeyInput] = useState(getUserGeminiApiKey);
  // CORRECTION : hasKey vient d'un state (avant : relu du localStorage à chaque rendu, UI jamais rafraîchie)
  const [savedKey, setSavedKey] = useState<string>(getUserGeminiApiKey);
  const hasKey = Boolean(savedKey);

  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showFaq, setShowFaq] = useState(false);

  const [settings, setSettings] = useState<AISettings>(loadSettings);
  const [models, setModels] = useState<GeminiModelInfo[]>(FALLBACK_MODELS);
  const [modelsSource, setModelsSource] = useState<'catalog' | 'live'>('catalog');
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');

  // Met à jour un réglage, le persiste et rafraîchit le state.
  const update = <K extends keyof AISettings>(key: K, value: AISettings[K]) =>
    setSettings(saveSettings({ [key]: value } as Partial<AISettings>));

  const refreshModels = async (key: string) => {
    if (!key) {
      setModelsError('Enregistrez d’abord une clé API pour charger la liste en ligne.');
      return;
    }
    setLoadingModels(true);
    setModelsError(null);
    try {
      const live = await fetchAvailableModels(key);
      if (live.length > 0) {
        setModels(live);
        setModelsSource('live');
      }
    } catch (e) {
      setModelsError(e instanceof Error ? e.message : 'Erreur lors du chargement des modèles.');
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSaveAndTest = async () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      setUserGeminiApiKey('');
      setSavedKey('');
      setModels(FALLBACK_MODELS);
      setModelsSource('catalog');
      setTestResult({ success: true, message: 'Clé API supprimée. Le mode Cloud par défaut sera utilisé.' });
      onToast?.({ message: 'Clé API supprimée.', type: 'info' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    const res = await testGeminiApiKey(trimmed);
    setIsTesting(false);
    setTestResult(res);
    if (res.success) {
      setUserGeminiApiKey(trimmed);
      setSavedKey(trimmed);
      onToast?.({ message: 'Clé API Gemini enregistrée et validée !', type: 'success' });
      void refreshModels(trimmed); // charge la vraie liste dès que la clé est valide
    } else {
      onToast?.({ message: res.message, type: 'error' });
    }
  };

  const handleClearCache = () => {
    clearGeminiLocalConfig();
    setSettings(resetSettings());
    setApiKeyInput('');
    setSavedKey('');
    setModels(FALLBACK_MODELS);
    setModelsSource('catalog');
    setTestResult(null);
    onToast?.({ message: 'Configuration, modèle et clé API réinitialisés.', type: 'success' });
  };

  // Si le modèle choisi a disparu de la liste, on l'affiche quand même pour ne rien cacher.
  const allModels = useMemo(() => {
    if (models.some((m) => m.id === settings.model)) return models;
    return [{ id: settings.model, label: settings.model, tier: 'free' as const, description: 'Modèle personnalisé.' }, ...models];
  }, [models, settings.model]);

  const visibleModels = allModels.filter((m) => tierFilter === 'all' || m.tier === tierFilter);
  const selected = allModels.find((m) => m.id === settings.model);
  const paidWithoutKey = selected?.tier === 'paid' && !hasKey;

  const cardClass = 'p-5 rounded-3xl bg-white dark:bg-[#181822] border border-black/[0.06] dark:border-white/5 space-y-4 shadow-xs';
  const smallCard = 'p-4 rounded-2xl bg-white dark:bg-[#181822] border border-black/[0.06] dark:border-white/5 shadow-2xs';

  return (
    <div className="min-h-screen bg-[#F5F3FB] dark:bg-[#111116] text-[#17131D] dark:text-white flex flex-col antialiased transition-colors duration-200">
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 pt-safe-header pb-4 bg-white/85 dark:bg-[#111116]/90 backdrop-blur-md border-b border-black/[0.06] dark:border-white/5">
        <button
          id="ai-settings-back-button"
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Retour</span>
        </button>
        <h1 className="text-base font-bold flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-[#6600FF]" />
          <span>Assistant IA & Clé API</span>
        </h1>
        <div className="w-16" />
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Statut */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#6600FF]/10 via-[#9333EA]/5 to-transparent border border-[#6600FF]/25 shadow-xs flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#6600FF] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#6600FF]/30">
            <Server className="w-6 h-6" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold">Concierge Gbaigbance IA</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-3 h-3" />
                {hasKey ? 'Mode Hybride (Votre Clé)' : 'Mode Serveur Natif'}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
              Modèle actif : <strong>{selected?.label ?? settings.model}</strong>. L’assistant fonctionne avec l’Edge Function Supabase et
              supporte votre propre clé Google Gemini (Google AI Studio).
            </p>
          </div>
        </div>

        {/* Clé API */}
        <div className={cardClass}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#6600FF]/10 text-[#6600FF] flex items-center justify-center shrink-0">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Votre propre clé API Gemini (Optionnel)</h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400">Requise pour les modèles payants ou pour votre propre quota Google.</p>
              </div>
            </div>
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[#6600FF] dark:text-[#A855F7] font-bold hover:underline shrink-0">
              <span>Créer une clé</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="space-y-2">
            <div className="relative flex items-center">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Collez votre clé API Gemini (ex: AIzaSy...)"
                autoComplete="off"
                spellCheck={false}
                className="w-full pl-3.5 pr-12 py-2.5 rounded-xl bg-gray-50 dark:bg-[#121218] border border-black/10 dark:border-white/10 text-xs font-mono text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:border-[#6600FF]"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                aria-label={showKey ? 'Masquer la clé' : 'Afficher la clé'}
                className="absolute right-2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-[11px] text-gray-400 dark:text-zinc-500">
                {hasKey ? '✓ Une clé personnalisée est active.' : 'Aucune clé personnelle (usage serveur par défaut).'}
              </p>
              <button
                type="button"
                onClick={handleSaveAndTest}
                disabled={isTesting}
                className="px-4 py-2 rounded-xl bg-[#6600FF] hover:bg-[#5500DD] text-white font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{isTesting ? 'Vérification...' : 'Valider & Enregistrer'}</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 mt-2 ${
                  testResult.success
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                }`}
              >
                {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Sélection du modèle */}
        <div className={cardClass}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#6600FF]/10 text-[#6600FF] flex items-center justify-center shrink-0">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Modèle d’IA</h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  {modelsSource === 'live' ? 'Liste en ligne (accessibles avec votre clé)' : 'Catalogue intégré (prix indicatifs)'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => refreshModels(savedKey)}
              disabled={loadingModels}
              className="inline-flex items-center gap-1 text-xs text-[#6600FF] dark:text-[#A855F7] font-bold hover:underline shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingModels ? 'animate-spin' : ''}`} />
              <span>Actualiser</span>
            </button>
          </div>

          <Segmented<TierFilter>
            value={tierFilter}
            onChange={setTierFilter}
            options={[
              { value: 'all', label: 'Tous' },
              { value: 'free', label: 'Gratuit possible' },
              { value: 'paid', label: 'Payants' },
            ]}
          />

          {modelsError && (
            <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {modelsError}
            </p>
          )}

          <div className="space-y-2" role="radiogroup" aria-label="Modèle d’IA">
            {visibleModels.map((m) => {
              const active = m.id === settings.model;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => update('model', m.id)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-colors flex items-start gap-3 ${
                    active ? 'border-[#6600FF] bg-[#6600FF]/5' : 'border-black/[0.06] dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  <span className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${active ? 'border-[#6600FF]' : 'border-gray-300 dark:border-zinc-600'}`}>
                    {active && <span className="w-2 h-2 rounded-full bg-[#6600FF]" />}
                  </span>
                  <span className="min-w-0 space-y-1">
                    <span className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{m.label}</span>
                      {m.tier === 'paid' ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                          <Crown className="w-2.5 h-2.5" /> Payant
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">Gratuit possible</span>
                      )}
                      {m.preview && <span className="px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px] font-bold">Préversion</span>}
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">{m.description}</span>
                    {m.price && <span className="block text-[11px] font-mono text-gray-400 dark:text-zinc-500">{m.price} / M tokens (entrée / sortie)</span>}
                  </span>
                </button>
              );
            })}
            {visibleModels.length === 0 && <p className="text-xs text-gray-400 dark:text-zinc-500 text-center py-3">Aucun modèle dans cette catégorie.</p>}
          </div>

          {paidWithoutKey && (
            <div className="p-3 rounded-xl text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Ce modèle est payant : il exige une clé liée à un compte de facturation Google, ou un serveur qui en dispose. Sinon les requêtes échoueront.</span>
            </div>
          )}
        </div>

        {/* Réglages */}
        <div className={cardClass}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#6600FF]/10 text-[#6600FF] flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Réglages de l’assistant</h3>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-bold text-gray-700 dark:text-zinc-300">Style des réponses</p>
            <Segmented<AISettings['answerStyle']>
              value={settings.answerStyle}
              onChange={(v) => update('answerStyle', v)}
              options={[
                { value: 'concise', label: 'Concis' },
                { value: 'balanced', label: 'Équilibré' },
                { value: 'detailed', label: 'Détaillé' },
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-700 dark:text-zinc-300">Créativité (température)</p>
              <span className="text-xs font-mono text-[#6600FF] dark:text-[#A855F7]">{settings.temperature.toFixed(1)}</span>
            </div>
            <input type="range" min={0} max={2} step={0.1} value={settings.temperature} onChange={(e) => update('temperature', Number(e.target.value))} className="w-full accent-[#6600FF]" />
            <p className="text-[11px] text-gray-400 dark:text-zinc-500">Bas = stable et factuel. Haut = plus varié, mais plus de risque d’erreurs.</p>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-bold text-gray-700 dark:text-zinc-300">Longueur maximale de réponse</p>
            <Segmented<string>
              value={String(settings.maxOutputTokens)}
              onChange={(v) => update('maxOutputTokens', Number(v))}
              options={[
                { value: '512', label: '512' },
                { value: '1024', label: '1K' },
                { value: '2048', label: '2K' },
                { value: '4096', label: '4K' },
                { value: '8192', label: '8K' },
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-bold text-gray-700 dark:text-zinc-300">Niveau de réflexion</p>
            <Segmented<AISettings['thinking']>
              value={settings.thinking}
              onChange={(v) => update('thinking', v)}
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'low', label: 'Rapide' },
                { value: 'high', label: 'Approfondi' },
              ]}
            />
            <p className="text-[11px] text-gray-400 dark:text-zinc-500">Modèles Gemini 3 uniquement. « Approfondi » est plus lent et consomme plus de tokens.</p>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-start gap-2.5 min-w-0">
              <MapPin className="w-4 h-4 text-[#6600FF] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-gray-700 dark:text-zinc-300">Partager ma position avec l’assistant</p>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500">
                  {userLocation ? 'Permet des suggestions d’événements proches de vous.' : 'Position indisponible pour le moment.'}
                </p>
              </div>
            </div>
            <Toggle checked={settings.shareLocation} onChange={(v) => update('shareLocation', v)} />
          </div>
        </div>

        {/* Sécurité — CORRECTION PRINCIPALE : le </div> en trop qui fermait <main> trop tôt est supprimé */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 px-1">Sécurité et protection de vos données</h3>

          <div className={`${smallCard} flex items-start gap-3`}>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">Outils en lecture seule stricte</h4>
              <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                L’IA ne peut pas modifier vos réservations, créer d’événement ni effectuer de paiements. Elle vous propose des cartes interactives que vous validez dans l’application.
              </p>
            </div>
          </div>

          <div className={`${smallCard} flex items-start gap-3`}>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">Quotas et accès</h4>
              <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                {hasKey
                  ? 'Avec votre propre clé API Gemini, vos limites dépendent directement de votre compte Google AI Studio (aucune restriction d’application).'
                  : user
                  ? 'Compte connecté : quota étendu de 20 requêtes par 10 minutes.'
                  : 'Mode invité : 5 requêtes par session.'}
              </p>
            </div>
          </div>
        </div>

        {/* Maintenance */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 px-1">Gestion du cache & réinitialisation</h3>
          <div className={`${smallCard} flex items-center justify-between gap-4`}>
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">Réinitialiser la configuration locale</h4>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Efface la clé API, le modèle choisi et les réglages.</p>
            </div>
            <button
              type="button"
              onClick={handleClearCache}
              className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-800 dark:text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser</span>
            </button>
          </div>
        </div>

        {/* FAQ */}
        <div className={`${smallCard} space-y-2`}>
          <button type="button" onClick={() => setShowFaq(!showFaq)} className="w-full flex items-center justify-between text-xs font-bold text-gray-700 dark:text-zinc-300">
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-[#6600FF]" />
              <span>Questions fréquentes</span>
            </span>
            <span>{showFaq ? '−' : '+'}</span>
          </button>
          {showFaq && (
            <div className="pt-2 text-xs text-gray-500 dark:text-zinc-400 space-y-2 border-t border-black/5 dark:border-white/5 leading-relaxed">
              <p>
                <strong>Pourquoi renseigner ma propre clé ?</strong>
                <br />
                Pour utiliser l’assistant sans attendre l’Edge Function, sans quota partagé, et pour accéder aux modèles payants.
              </p>
              <p>
                <strong>« Gratuit possible » ou « Payant » ?</strong>
                <br />
                Les modèles Flash / Flash-Lite ont un quota gratuit limité. Les Pro exigent une facturation. Badges indicatifs : Google change souvent ses offres.
              </p>
              <p>
                <strong>Ma clé est-elle en sécurité ?</strong>
                <br />
                Elle est stockée en clair dans le navigateur de cet appareil. Ne la saisissez pas sur un appareil partagé.
              </p>
              <p>
                <strong>Où obtenir une clé ?</strong>
                <br />
                Sur{' '}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-[#6600FF] underline">
                  Google AI Studio
                </a>
                .
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};