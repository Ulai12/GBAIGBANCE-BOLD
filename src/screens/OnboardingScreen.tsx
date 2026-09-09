import { useState } from 'react';
import {
  ArrowRight,
  MapPin,
  Heart,
  ChevronLeft,
  Check,
  Zap,
  Volume2,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import { updateProfile } from '@/services/auth';
import { COUNTRIES, EVENT_CATEGORIES } from '@/constants';

interface OnboardingScreenProps {
  onComplete: () => void;
}

interface Slide {
  id: number;
  eyebrow: string;
  title: string;
  subtitle: string;
  badge: string;
  accent: string;
}

const ONBOARDING_ARTISTS = [
  {
    id: 'king-mensah',
    name: 'King Mensah',
    genre: 'Afropop & Rythmes traditionnels',
    followers: 142000,
    city: 'Lomé',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    upcoming: 'Palais des Congrès · Lomé',
  },
  {
    id: 'santrinos',
    name: 'Santrinos Raphaël',
    genre: 'Afro-RnB & Soul Urbaine',
    followers: 285000,
    city: 'Lomé',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    upcoming: 'Concert Émotion · Lomé',
  },
  {
    id: 'toofan',
    name: 'Toofan',
    genre: 'Ogbragada & Afrobeats',
    followers: 530000,
    city: 'Lomé',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    upcoming: 'Tournée Nationale · Togo',
  },
];

const ONBOARDING_SLIDES: Slide[] = [
  {
    id: 0,
    eyebrow: 'EXPLORATION & LIVE',
    title: 'Les plus grands moments commencent ici.',
    subtitle:
      'Découvrez tous les concerts, festivals et soirées incontournables au Togo, Bénin, Côte d’Ivoire et dans toute l’Afrique.',
    badge: 'Live Events',
    accent: '#6600FF',
  },
  {
    id: 1,
    eyebrow: 'BILLETTERIE NATIVE',
    title: 'Vos billets sécurisés, en un clin d’œil.',
    subtitle:
      'Payez instantanément via T-Money, Moov Money, Wave ou Carte Bancaire. Votre QR Code d’accès reste disponible hors-ligne.',
    badge: 'Paiement Mobile',
    accent: '#10B981',
  },
  {
    id: 2,
    eyebrow: 'PROCHE DE VOS ARTISTES',
    title: 'Ne manquez plus jamais vos stars préférées.',
    subtitle:
      'Suivez les artistes, soyez alerté en exclusivité dès l’ouverture de la billetterie et profitez de tarifs VIP.',
    badge: 'Alertes VIP',
    accent: '#EC4899',
  },
  {
    id: 3,
    eyebrow: 'EXPÉRIENCE SUR-MESURE',
    title: 'Personnalisez votre scène locale.',
    subtitle:
      'Choisissez votre ville et vos styles musicaux pour recevoir des recommandations adaptées dès votre premier regard.',
    badge: 'Vos Préférences',
    accent: '#8B5CF6',
  },
];

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { user } = useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState(user?.country || 'TG');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['concert', 'festival', 'spectacle']);
  const [selectedArtistIndex, setSelectedArtistIndex] = useState(0);
  const [followedArtists, setFollowedArtists] = useState<string[]>(['king-mensah']);
  const [soonCountryNotice, setSoonCountryNotice] = useState<string | null>(null);

  const slide = ONBOARDING_SLIDES[currentStep];
  const activeArtist = ONBOARDING_ARTISTS[selectedArtistIndex];
  const isArtistFollowed = followedArtists.includes(activeArtist.id);

  const toggleFollowArtist = (id: string) => {
    if (followedArtists.includes(id)) {
      setFollowedArtists(followedArtists.filter((a) => a !== id));
    } else {
      setFollowedArtists([...followedArtists, id]);
    }
  };

  const handleNext = () => {
    if (currentStep < ONBOARDING_SLIDES.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Sauvegarde des préférences choisies avant de terminer
      if (user) {
        updateProfile(user.id, {
          country: selectedCountry,
        }).catch(() => {});
      }
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const toggleGenre = (catVal: string) => {
    if (selectedGenres.includes(catVal)) {
      if (selectedGenres.length > 1) {
        setSelectedGenres(selectedGenres.filter((g) => g !== catVal));
      }
    } else {
      setSelectedGenres([...selectedGenres, catVal]);
    }
  };

  return (
    <div className="relative min-h-[100dvh] bg-[#F5F3FB] dark:bg-[#0E0C17] text-[#17131D] dark:text-white flex flex-col justify-between overflow-hidden select-none">
      {/* Halos de lumière d'ambiance modernes style iOS */}
      <div
        className="absolute -top-28 -left-28 w-80 h-80 rounded-full blur-3xl opacity-30 dark:opacity-20 pointer-events-none transition-colors duration-700"
        style={{ backgroundColor: slide.accent }}
      />
      <div
        className="absolute top-1/3 -right-24 w-72 h-72 rounded-full blur-3xl opacity-20 dark:opacity-15 pointer-events-none transition-colors duration-700"
        style={{ backgroundColor: '#A855F7' }}
      />

      {/* Barre supérieure : Bouton Précédent & Passer */}
      <header className="relative z-20 px-6 pt-6 pb-2 flex items-center justify-between">
        {currentStep > 0 ? (
          <button
            type="button"
            onClick={handlePrev}
            className="w-10 h-10 rounded-full bg-white/80 dark:bg-white/10 backdrop-blur-md flex items-center justify-center text-gray-700 dark:text-white shadow-xs active:scale-90 transition-transform"
            aria-label="Étape précédente"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xl">🎟️</span>
            <span className="text-sm font-black tracking-tight text-[#6600FF] dark:text-[#A78BFA]">
              GBAIGBANCE
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={onComplete}
          className="px-4 py-2 rounded-full bg-white/70 dark:bg-white/10 backdrop-blur-md text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white active:scale-95 transition-all shadow-xs"
        >
          Passer
        </button>
      </header>

      {/* Zone visuelle interactive centrale */}
      <main className="relative z-10 flex-1 px-6 flex flex-col items-center justify-center my-auto max-w-md mx-auto w-full">
        {/* SLIDE 0 : Découverte d'événements en direct */}
        {currentStep === 0 && (
          <div className="w-full animate-fade-in">
            <div className="relative rounded-[2.2rem] bg-white dark:bg-[#1A1829] p-5 shadow-[0_20px_50px_rgba(102,0,255,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-black/[0.06] dark:border-white/[0.08] overflow-hidden">
              {/* Image banner mock */}
              <div className="relative h-44 rounded-[1.6rem] overflow-hidden bg-gradient-to-tr from-[#6600FF] to-[#A855F7] mb-4">
                <img
                  src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80"
                  alt="Concert Live"
                  className="w-full h-full object-cover mix-blend-overlay opacity-85"
                />
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-extrabold">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span>EN DIRECT</span>
                </div>
                <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-[#17131D] text-[11px] font-black shadow-xs">
                  5 000 FCFA
                </div>
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <p className="text-xs font-bold text-yellow-300 uppercase tracking-wider">
                    Concert Géant
                  </p>
                  <p className="text-lg font-black leading-tight drop-shadow-sm">
                    Lomé Afro Fusion Festival 2026
                  </p>
                </div>
              </div>

              {/* Ligne d'infos */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <MapPin className="w-4 h-4 text-[#6600FF]" />
                  <span>Palais des Congrès · Lomé</span>
                </div>
                <div className="flex items-center gap-1 text-[#6600FF] font-bold text-xs">
                  <Volume2 className="w-4 h-4 animate-pulse" />
                  <span>Ambiance 100%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 1 : Billetterie instantanée & Mobile Money */}
        {currentStep === 1 && (
          <div className="w-full animate-fade-in">
            <div className="relative rounded-[2.2rem] bg-white dark:bg-gradient-to-br dark:from-[#121020] dark:to-[#201A38] text-[#17131D] dark:text-white p-6 shadow-[0_20px_50px_rgba(16,185,129,0.12)] dark:shadow-[0_20px_50px_rgba(16,185,129,0.18)] border border-black/[0.06] dark:border-white/15 overflow-hidden">
              {/* Reflet holographique */}
              <div className="absolute -right-10 -top-10 w-36 h-36 bg-[#10B981]/15 dark:bg-[#10B981]/25 rounded-full blur-2xl" />

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#10B981]/15 text-[#10B981] flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black text-[#10B981] tracking-wider block">
                      Pass Vérifié
                    </span>
                    <span className="text-sm font-extrabold text-[#17131D] dark:text-white">Billet Standard #TG-942</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 dark:bg-white/10 text-xs font-bold text-emerald-600 dark:text-green-300">
                  Valide
                </span>
              </div>

              {/* Découpe du ticket façon billet de cinéma */}
              <div className="my-4 py-4 px-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#17131D] text-white dark:bg-white dark:text-black rounded-xl p-1 flex items-center justify-center">
                    <QrCode className="w-10 h-10" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-white/60 font-medium">Scannez à l'entrée</p>
                    <p className="text-sm font-bold text-[#17131D] dark:text-white">Accès rapide NFC & QR</p>
                  </div>
                </div>
              </div>

              {/* Puces Mobile Money compatibles */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/50 font-bold mb-2">
                  Paiements directs acceptés :
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-yellow-300 text-[11px] font-bold">
                    T-Money
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-700 dark:text-blue-300 text-[11px] font-bold">
                    Moov Money
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 text-[11px] font-bold">
                    Wave
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-orange-500/15 text-orange-700 dark:text-orange-300 text-[11px] font-bold">
                    Orange Money
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 2 : Suivi d'artistes & Alertes VIP */}
        {currentStep === 2 && (
          <div className="w-full animate-fade-in">
            <div className="relative rounded-[2.2rem] bg-white dark:bg-[#1A1829] p-5 shadow-[0_20px_50px_rgba(236,72,153,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-black/[0.06] dark:border-white/[0.08]">
              {/* Sélecteur rapide d'artistes */}
              <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-black/[0.05] dark:border-white/[0.06]">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Artistes à découvrir :
                </span>
                <div className="flex items-center gap-2">
                  {ONBOARDING_ARTISTS.map((artist, idx) => {
                    const isCurrent = idx === selectedArtistIndex;
                    const followed = followedArtists.includes(artist.id);
                    return (
                      <button
                        key={artist.id}
                        type="button"
                        onClick={() => setSelectedArtistIndex(idx)}
                        className={`relative w-9 h-9 rounded-full overflow-hidden transition-all ${
                          isCurrent
                            ? 'ring-3 ring-[#EC4899] scale-110 shadow-sm'
                            : 'opacity-60 hover:opacity-100'
                        }`}
                        title={artist.name}
                      >
                        <img
                          src={artist.image}
                          alt={artist.name}
                          className="w-full h-full object-cover"
                        />
                        {followed && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#EC4899] rounded-full ring-2 ring-white flex items-center justify-center">
                            <Check className="w-2 h-2 text-white" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fiche de l'artiste actif */}
              <div className="flex items-center gap-3.5 mb-4">
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden ring-4 ring-[#EC4899]/30 shrink-0 shadow-sm">
                  <img
                    src={activeArtist.image}
                    alt={activeArtist.name}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full ring-2 ring-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-base text-[#17131D] dark:text-white truncate">
                    {activeArtist.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {activeArtist.genre}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-full bg-[#EC4899]/15 text-[#EC4899] text-[10px] font-extrabold">
                      {activeArtist.city}
                    </span>
                    <span className="text-[10px] text-gray-400 font-semibold">
                      {(activeArtist.followers + (isArtistFollowed ? 1 : 0)).toLocaleString()}{' '}
                      abonnés
                    </span>
                  </div>
                </div>
              </div>

              {/* Bouton d'action interactif */}
              <button
                type="button"
                onClick={() => toggleFollowArtist(activeArtist.id)}
                className={`w-full py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                  isArtistFollowed
                    ? 'bg-gradient-to-r from-[#EC4899] to-[#F43F5E] text-white shadow-md shadow-[#EC4899]/30'
                    : 'bg-[#EC4899]/10 text-[#EC4899] hover:bg-[#EC4899]/20'
                }`}
              >
                <Heart
                  className={`w-4 h-4 ${isArtistFollowed ? 'fill-white' : ''}`}
                />
                {isArtistFollowed
                  ? 'Abonné aux alertes VIP !'
                  : `Suivre ${activeArtist.name}`}
              </button>

              {/* Notification preview dynamique */}
              <div className="mt-3.5 p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-black/[0.04] dark:border-white/[0.05] flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-pink-500/15 text-pink-500 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-[#17131D] dark:text-white truncate">
                      Billet prévente · {activeArtist.name}
                    </p>
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                    {activeArtist.upcoming}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 3 : Personnalisation immédiate */}
        {currentStep === 3 && (
          <div className="w-full animate-fade-in space-y-4">
            <div className="rounded-[2.2rem] bg-white dark:bg-[#1A1829] p-5 shadow-[0_20px_50px_rgba(102,0,255,0.12)] border border-black/[0.06] dark:border-white/[0.08]">
              {/* Choix du pays principal avec Soon sur les autres pays sauf le Togo */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-400 block">
                    Votre pays principal :
                  </label>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    🇹🇬 Ouvert au Togo
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {COUNTRIES.slice(0, 4).map((c) => {
                    const isTogo = c.code === 'TG';
                    const isSelected = selectedCountry === c.code;
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          if (isTogo) {
                            setSelectedCountry('TG');
                            setSoonCountryNotice(null);
                          } else {
                            setSoonCountryNotice(
                              `Gbaigbance arrive très prochainement en ${c.name} ! La billetterie est actuellement disponible au Togo 🇹🇬.`
                            );
                          }
                        }}
                        className={`relative p-2.5 rounded-2xl border flex items-center gap-2 text-left transition-all ${
                          isSelected
                            ? 'border-[#6600FF] bg-[#6600FF]/10 text-[#6600FF] font-black ring-1 ring-[#6600FF]'
                            : isTogo
                            ? 'border-black/[0.08] dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 font-semibold text-xs text-gray-700 dark:text-gray-300'
                            : 'border-black/[0.05] dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] text-gray-500 font-medium text-xs hover:border-amber-300/40'
                        }`}
                      >
                        <span className="text-lg">{c.flag}</span>
                        <span className="truncate">{c.name}</span>
                        {isTogo ? (
                          isSelected && <Check className="w-3.5 h-3.5 ml-auto text-[#6600FF]" />
                        ) : (
                          <span className="ml-auto px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[8px] font-black tracking-wider uppercase">
                            Soon
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Message d'information pays Soon */}
                {soonCountryNotice && (
                  <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] leading-tight flex items-center gap-2 animate-fade-in">
                    <span className="text-base shrink-0">⏳</span>
                    <p className="flex-1">{soonCountryNotice}</p>
                  </div>
                )}
              </div>

              {/* Choix des ambiances/catégories couvrant toute la largeur de la carte */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-gray-400 block mb-2">
                  Vos ambiances préférées :
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
                  {EVENT_CATEGORIES.map((cat) => {
                    const isSelected = selectedGenres.includes(cat.value);
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => toggleGenre(cat.value)}
                        className={`w-full py-2.5 px-2 rounded-2xl text-xs font-extrabold text-center transition-all flex items-center justify-center border ${
                          isSelected
                            ? 'bg-[#6600FF] border-[#6600FF] text-white shadow-sm ring-1 ring-[#6600FF]/30'
                            : 'bg-gray-50 dark:bg-white/5 border-black/[0.06] dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                        }`}
                      >
                        <span className="truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Titres & Sous-titres */}
        <div className="text-center mt-6">
          <span
            className="inline-block px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-2 shadow-xs transition-colors duration-500"
            style={{
              backgroundColor: `${slide.accent}20`,
              color: slide.accent,
            }}
          >
            {slide.eyebrow}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#17131D] dark:text-white tracking-tight leading-snug">
            {slide.title}
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">
            {slide.subtitle}
          </p>
        </div>
      </main>

      {/* Barre inférieure : Indicateurs de pagination & Bouton principal */}
      <footer className="relative z-20 px-6 pb-8 pt-4 max-w-md mx-auto w-full space-y-4">
        {/* Pagination Dots Apple-style */}
        <div className="flex items-center justify-center gap-2" aria-label="Progression">
          {ONBOARDING_SLIDES.map((item, idx) => {
            const isActive = idx === currentStep;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentStep(idx)}
                aria-label={`Aller à l'étape ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'w-8 bg-[#6600FF] dark:bg-[#A78BFA]'
                    : 'w-2 bg-gray-300 dark:bg-white/20'
                }`}
              />
            );
          })}
        </div>

        {/* Bouton d'action principal */}
        <button
          type="button"
          onClick={handleNext}
          className="w-full py-4 rounded-full bg-[#6600FF] hover:bg-[#5800DC] active:scale-[0.98] text-white font-black text-base flex items-center justify-center gap-2 shadow-[0_12px_30px_rgba(102,0,255,0.35)] transition-all"
        >
          <span>
            {currentStep < ONBOARDING_SLIDES.length - 1
              ? 'Continuer'
              : 'Démarrer l’expérience'}
          </span>
          <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
        </button>
      </footer>
    </div>
  );
}
