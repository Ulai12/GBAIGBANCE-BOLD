import React, { useEffect, useState } from 'react';
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
  Loader2,
  Cpu,
  SlidersHorizontal,
  RefreshCw,
  Mic,
} from 'lucide-react';
import { testGeminiApiKey } from '@/services/gemini';
import { useApp } from '@/hooks/useApp';

/* =====================================================================
   GBAIGBANCE — ÉCRAN RÉGLAGES IA (SERVEUR NATIF GEMINI & CONFIDENTIALITÉ)
   ===================================================================== */

interface AISettings {
  model: string;
  temperature: number;
  maxOutputTokens: number;
  thinking: 'auto' | 'low' | 'high';
  answerStyle: 'concise' | 'balanced' | 'detailed';
  shareLocation: boolean;
}

const SETTINGS_KEY = 'gbaigbance_ai_settings_v1';

const DEFAULT_SETTINGS: AISettings = {
  model: 'gemini-3.8-flash',
  temperature: 0.7,
  maxOutputTokens: 2048,
  thinking: 'auto',
  answerStyle: 'balanced',
  shareLocation: true,
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function loadSettings(): AISettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const merged = { ...DEFAULT_SETTINGS, ...(raw ? (JSON.parse(raw) as Partial<AISettings>) : {}) };
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
    // Session fallback
  }
  return next;
}

function resetSettings(): AISettings {
  try {
    localStorage.removeItem(SETTINGS_KEY);
  } catch {
    // Ignoré
  }
  return { ...DEFAULT_SETTINGS };
}

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

interface AISettingsScreenProps {
  onBack: () => void;
  onToast?: (toast: { message: string; type?: 'success' | 'error' | 'info' }) => void;
}

export const AISettingsScreen: React.FC<AISettingsScreenProps> = ({ onBack, onToast }) => {
  const { userLocation } = useApp();

  const [settings, setSettings] = useState<AISettings>(loadSettings);
  const [serverStatus, setServerStatus] = useState<{
    loading: boolean;
    online: boolean;
    model: string;
    message: string;
  }>({
    loading: true,
    online: false,
    model: 'gemini-3.8-flash',
    message: 'Vérification du service serveur...',
  });

  const [showFaq, setShowFaq] = useState(false);

  const checkStatus = async () => {
    setServerStatus((prev) => ({ ...prev, loading: true }));
    const res = await testGeminiApiKey();
    setServerStatus({
      loading: false,
      online: res.success,
      model: res.model || 'gemini-3.8-flash',
      message: res.message,
    });
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const update = <K extends keyof AISettings>(key: K, value: AISettings[K]) =>
    setSettings(saveSettings({ [key]: value } as Partial<AISettings>));

  const handleReset = () => {
    setSettings(resetSettings());
    onToast?.({ message: 'Préférences IA réinitialisées aux valeurs par défaut.', type: 'success' });
  };

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
          <span>Assistant IA & Performances</span>
        </h1>
        <div className="w-16" />
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Statut Serveur Actif */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#6600FF]/10 via-[#9333EA]/5 to-transparent border border-[#6600FF]/25 shadow-xs flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#6600FF] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#6600FF]/30">
            <Server className="w-6 h-6" />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-base font-extrabold">Concierge Gbaigbance IA</h2>
              <button
                type="button"
                onClick={checkStatus}
                disabled={serverStatus.loading}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/25 transition-colors cursor-pointer"
              >
                {serverStatus.loading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3 h-3" />
                )}
                <span>{serverStatus.online ? 'Serveur Actif' : 'Vérification'}</span>
                <RefreshCw className="w-3 h-3 ml-0.5 opacity-60" />
              </button>
            </div>
            <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
              Modèle optimisé : <strong>{serverStatus.model}</strong>. Traitement en streaming temps réel, mode voix basse latence et vérification dynamique des événements.
            </p>
          </div>
        </div>

        {/* Capacités IA disponibles */}
        <div className={cardClass}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#6600FF]/10 text-[#6600FF] flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Capacités Multimodales</h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Services propulsés par les modèles Gemini de dernière génération</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-black/[0.06] dark:border-white/5 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-white">
                <Sparkles className="w-4 h-4 text-[#6600FF]" />
                <span>Streaming & Recherche</span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed">
                Réponses instantanées caractère par caractère avec cartes d'événements interactives et coordonnées géolocalisées.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-black/[0.06] dark:border-white/5 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-white">
                <Mic className="w-4 h-4 text-emerald-500" />
                <span>Conversation Vocale Directe</span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed">
                Échangez en direct à la voix avec l'assistant via l'API Live bidirectionnelle sur WebSocket.
              </p>
            </div>
          </div>
        </div>

        {/* Réglages de l’assistant */}
        <div className={cardClass}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#6600FF]/10 text-[#6600FF] flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Préférences de réponse</h3>
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
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.1}
              value={settings.temperature}
              onChange={(e) => update('temperature', Number(e.target.value))}
              className="w-full accent-[#6600FF]"
            />
            <p className="text-[11px] text-gray-400 dark:text-zinc-500">
              Bas = rigoureux et factuel. Haut = suggestions plus imagées et expressives.
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-bold text-gray-700 dark:text-zinc-300">Longueur maximale de réponse</p>
            <Segmented<string>
              value={String(settings.maxOutputTokens)}
              onChange={(v) => update('maxOutputTokens', Number(v))}
              options={[
                { value: '512', label: 'Courte' },
                { value: '1024', label: 'Standard' },
                { value: '2048', label: 'Longue' },
                { value: '4096', label: 'Complète' },
              ]}
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-start gap-2.5 min-w-0">
              <MapPin className="w-4 h-4 text-[#6600FF] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-gray-700 dark:text-zinc-300">Partager ma position avec l’assistant</p>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500">
                  {userLocation ? 'Permet de recommander automatiquement les événements les plus proches de vous.' : 'Position GPS inactive.'}
                </p>
              </div>
            </div>
            <Toggle checked={settings.shareLocation} onChange={(v) => update('shareLocation', v)} />
          </div>
        </div>

        {/* Sécurité et gouvernance des données */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 px-1">
            Garanties et sécurité des données
          </h3>

          <div className={`${smallCard} flex items-start gap-3`}>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">Lecture seule stricte & Véracité</h4>
              <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                L’assistant ne peut pas modifier vos réservations, créer d’événement ni effectuer de prélèvement financier. Il consulte les données officielles pour vous orienter.
              </p>
            </div>
          </div>

          <div className={`${smallCard} flex items-start gap-3`}>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">Accès continu sans configuration</h4>
              <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                L'assistant est disponible immédiatement pour tous les participants, en mode invité ou connecté.
              </p>
            </div>
          </div>
        </div>

        {/* Maintenance */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 px-1">
            Gestion des préférences
          </h3>
          <div className={`${smallCard} flex items-center justify-between gap-4`}>
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">Réinitialiser les réglages</h4>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Rétablit les paramètres par défaut de l'assistant.</p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-800 dark:text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser</span>
            </button>
          </div>
        </div>

        {/* FAQ */}
        <div className={`${smallCard} space-y-2`}>
          <button
            type="button"
            onClick={() => setShowFaq(!showFaq)}
            className="w-full flex items-center justify-between text-xs font-bold text-gray-700 dark:text-zinc-300"
          >
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-[#6600FF]" />
              <span>Questions fréquentes</span>
            </span>
            <span>{showFaq ? '−' : '+'}</span>
          </button>
          {showFaq && (
            <div className="pt-2 text-xs text-gray-500 dark:text-zinc-400 space-y-2 border-t border-black/5 dark:border-white/5 leading-relaxed">
              <p>
                <strong>Comment fonctionne le concierge ?</strong>
                <br />
                Il interroge la base d'événements de Gbaigbance en direct pour vérifier les disponibilités, les tarifs en FCFA, les lieux et les programmes officiels.
              </p>
              <p>
                <strong>Comment utiliser le mode vocal ?</strong>
                <br />
                Dans la fenêtre de discussion, cliquez sur l'icône de microphone pour démarrer une conversation audio fluide et naturelle.
              </p>
              <p>
                <strong>Mes informations personnelles sont-elles protégées ?</strong>
                <br />
                Oui. Seules les données nécessaires à votre demande immédiate (ville, type de sortie) sont transmises au modèle.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};