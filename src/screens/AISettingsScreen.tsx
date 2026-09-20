import React, { useState } from 'react';
import {
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  Lock,
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
} from 'lucide-react';
import {
  getUserGeminiApiKey,
  setUserGeminiApiKey,
  clearGeminiLocalConfig,
  testGeminiApiKey,
} from '@/services/gemini';
import { useApp } from '@/hooks/useApp';

interface AISettingsScreenProps {
  onBack: () => void;
  onToast?: (toast: { message: string; type?: 'success' | 'error' | 'info' }) => void;
}

export const AISettingsScreen: React.FC<AISettingsScreenProps> = ({
  onBack,
  onToast,
}) => {
  const { user, userLocation } = useApp();
  const [apiKeyInput, setApiKeyInput] = useState(getUserGeminiApiKey);
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showFaq, setShowFaq] = useState(false);

  const handleSaveAndTest = async () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      setUserGeminiApiKey('');
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
      onToast?.({ message: 'Clé API Gemini enregistrée et validée !', type: 'success' });
    } else {
      onToast?.({ message: res.message, type: 'error' });
    }
  };

  const handleClearCache = () => {
    clearGeminiLocalConfig();
    setApiKeyInput('');
    setTestResult(null);
    onToast?.({
      message: 'Configuration et clé API réinitialisées avec succès.',
      type: 'success',
    });
  };

  const hasKey = Boolean(getUserGeminiApiKey());

  return (
    <div className="min-h-screen bg-[#F5F3FB] dark:bg-[#111116] text-[#17131D] dark:text-white flex flex-col antialiased transition-colors duration-200">
      {/* En-tête */}
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
        <h1 className="text-base font-bold text-[#17131D] dark:text-white flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-[#6600FF]" />
          <span>Assistant IA & Clé API</span>
        </h1>
        <div className="w-16" />
      </header>

      {/* Contenu principal */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Bannière de statut */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#6600FF]/10 via-[#9333EA]/5 to-transparent border border-[#6600FF]/25 shadow-xs flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#6600FF] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#6600FF]/30">
            <Server className="w-6 h-6" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold text-[#17131D] dark:text-white">
                Concierge Gbaigbance IA
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-3 h-3" />
                {hasKey ? 'Mode Hybride (Votre Clé)' : 'Mode Serveur Natif'}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
              L’assistant fonctionne avec l’Edge Function Supabase et supporte l’utilisation de votre propre clé API Google Gemini (Google AI Studio) aussi bien en mode serveur qu’en mode direct.
            </p>
          </div>
        </div>

        {/* Section Clé API Personnelle (BYOK) */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#181822] border border-black/[0.06] dark:border-white/5 space-y-4 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#6600FF]/10 text-[#6600FF] flex items-center justify-center shrink-0">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Votre propre clé API Gemini (Optionnel)
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  Idéal si l’Edge Function n’est pas encore déployée ou pour utiliser votre propre quota Google Cloud.
                </p>
              </div>
            </div>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#6600FF] dark:text-[#A855F7] font-bold hover:underline shrink-0"
            >
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
                className="w-full pl-3.5 pr-24 py-2.5 rounded-xl bg-gray-50 dark:bg-[#121218] border border-black/10 dark:border-white/10 text-xs font-mono text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:border-[#6600FF]"
              />
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-[11px] text-gray-400 dark:text-zinc-500">
                {hasKey ? '✓ Une clé personnalisée est active.' : 'Aucune clé personnelle enregistrée (usage serveur par défaut).'}
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

        {/* Engagements de sécurité & confidentialité */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 px-1">
            Sécurité et protection de vos données
          </h3>

          <div className="grid grid-cols-1 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#181822] border border-black/[0.06] dark:border-white/5 flex items-start gap-3 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  Zéro fuite de données personnelles
                </h4>
                <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                  Votre adresse email, numéro de téléphone, codes QR et numéros Mobile Money ne sont
                  jamais transmis au modèle d’IA. Seules les informations publiques des événements et votre prénom sont utilisés.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#181822] border border-black/[0.06] dark:border-white/5 flex items-start gap-3 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-[#6600FF]/10 text-[#6600FF] dark:text-[#A855F7] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  Géolocalisation confidentielle (~1 km)
                </h4>
                <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                  {userLocation?.isActual
                    ? 'Votre position réelle est activée et tronquée à ~1 km pour calculer les distances. Elle n’est jamais enregistrée en base de données.'
                    : 'Le GPS n’est pas actif : Lomé est utilisé comme repère par défaut.'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#181822] border border-black/[0.06] dark:border-white/5 flex items-start gap-3 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  Outils en lecture seule stricte
                </h4>
                <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                  L’IA ne peut pas modifier vos réservations, créer d’événement ni effectuer de paiements.
                  Elle vous propose des cartes interactives que vous validez directement dans l’application.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#181822] border border-black/[0.06] dark:border-white/5 flex items-start gap-3 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  Quotas et accès
                </h4>
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
        </div>

        {/* Actions de maintenance */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 px-1">
            Gestion du cache & réinitialisation
          </h3>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#181822] border border-black/[0.06] dark:border-white/5 flex items-center justify-between gap-4 shadow-2xs">
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                Réinitialiser la configuration locale
              </h4>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Efface la clé API locale et restaure les paramètres par défaut.
              </p>
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

        {/* Aide & FAQ */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#181822] border border-black/[0.06] dark:border-white/5 space-y-2 shadow-2xs">
          <button
            type="button"
            onClick={() => setShowFaq(!showFaq)}
            className="w-full flex items-center justify-between text-xs font-bold text-gray-700 dark:text-zinc-300"
          >
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-[#6600FF]" />
              <span>Questions fréquentes sur la clé API et le mode serveur</span>
            </span>
            <span>{showFaq ? '−' : '+'}</span>
          </button>
          {showFaq && (
            <div className="pt-2 text-xs text-gray-500 dark:text-zinc-400 space-y-2 border-t border-black/5 dark:border-white/5 leading-relaxed">
              <p>
                <strong>Pourquoi renseigner ma propre clé ?</strong><br />
                Cela vous permet d’utiliser l’assistant immédiatement sans attendre que l’administrateur déploie l’Edge Function Supabase, et sans être soumis aux quotas partagés.
              </p>
              <p>
                <strong>Est-ce que ma clé est utilisée en mode serveur ?</strong><br />
                Oui ! Dès que l’Edge Function Supabase est déployée, l’application lui transmet votre clé dans l’en-tête sécurisé <code>x-gemini-api-key</code>. Le serveur exécute ainsi l’appel Gemini avec votre quota.
              </p>
              <p>
                <strong>Où obtenir une clé gratuitement ?</strong><br />
                Sur <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-[#6600FF] underline">Google AI Studio</a>. La création est gratuite et instantanée.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
