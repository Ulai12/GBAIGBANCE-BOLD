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
} from 'lucide-react';
import { clearGeminiLocalConfig } from '@/services/gemini';
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
  const [showFaq, setShowFaq] = useState(false);

  const handleClearCache = () => {
    clearGeminiLocalConfig();
    onToast?.({
      message: 'Cache local de l’assistant IA réinitialisé avec succès.',
      type: 'success',
    });
  };

  return (
    <div className="min-h-screen bg-[#F5F3FB] dark:bg-[#111116] text-[#17131D] dark:text-white flex flex-col antialiased transition-colors duration-200">
      {/* En-tête */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-4 bg-white/85 dark:bg-[#111116]/90 backdrop-blur-md border-b border-black/[0.06] dark:border-white/5">
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
          <span>Assistant IA & Confidentialité</span>
        </h1>
        <div className="w-16" />
      </header>

      {/* Contenu principal */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Bannière de statut Cloud */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#6600FF]/10 via-[#9333EA]/5 to-transparent border border-[#6600FF]/25 shadow-xs flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#6600FF] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#6600FF]/30">
            <Server className="w-6 h-6" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold text-[#17131D] dark:text-white">
                Concierge Gbaigbance IA Cloud
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-3 h-3" />
                Natif & Actif
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
              L’assistant fonctionne désormais via notre infrastructure sécurisée Supabase Edge Function.
              Aucune clé API personnelle n’est requise, tout est automatiquement configuré pour vous.
            </p>
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
                  Quotas et accès invité
                </h4>
                <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                  {user
                    ? 'Compte connecté : vous bénéficiez d’un quota étendu de 20 requêtes par 10 minutes (60/jour).'
                    : 'Mode invité : 5 requêtes par session. Connectez-vous gratuitement pour débloquer le quota complet et accéder à vos billets.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions de maintenance */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 px-1">
            Gestion du cache
          </h3>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#181822] border border-black/[0.06] dark:border-white/5 flex items-center justify-between gap-4 shadow-2xs">
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                Purger les anciens résidus de clés locales
              </h4>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Efface toute ancienne clé stockée dans le navigateur (BYOK obsolète).
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearCache}
              className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-800 dark:text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Nettoyer</span>
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
              <span>Questions fréquentes sur l’assistant IA</span>
            </span>
            <span>{showFaq ? '−' : '+'}</span>
          </button>
          {showFaq && (
            <div className="pt-2 text-xs text-gray-500 dark:text-zinc-400 space-y-2 border-t border-black/5 dark:border-white/5">
              <p>
                <strong>D’où viennent les données d’événements ?</strong><br />
                L’assistant interroge directement la base de données PostgreSQL de Gbaigbance en temps réel.
              </p>
              <p>
                <strong>Comment acheter un billet conseillé par l’IA ?</strong><br />
                Cliquez simplement sur la carte de l’événement affichée sous la réponse pour ouvrir sa fiche officielle et choisir vos billets.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
