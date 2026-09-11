import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  ChevronLeft,
  ImagePlus,
  Info,
  Loader2,
  MapPin,
  Music2,
  Navigation,
  Plus,
  Search,
  Ticket as TicketIcon,
  Trash2,
  X,
} from 'lucide-react';
import { EventOptionalSteps, type LiveItem, type ScheduleItem, type SponsorItem } from '@/components/EventOptionalSteps';
import { useApp } from '@/hooks/useApp';
import { EVENT_CATEGORIES, CITIES, COUNTRIES } from '@/constants';
import {
  createEventWithCollaborators,
  searchArtists,
  searchOrganizations,
  uploadEventImage,
  addScheduleSlot,
  addEventLiveLink,
  addEventSponsor,
  getFaviconUrl,
} from '@/services/events';
import type { Artist, Event, EventCategory, Organization } from '@/types';
import type { ToastData } from '@/components/Toast';

interface Props {
  onBack: () => void;
  onCreated: (event: Event) => void;
  onToast: (toast: Omit<ToastData, 'id'>) => void;
}

type Step = 'Infos' | 'Lieu & Dates' | 'Photos' | 'Billets' | 'Collaborateurs' | 'Programme' | 'Live' | 'Sponsors' | 'Confirmation';
type CollabType = 'artist' | 'organizer';

interface SelectedCollab {
  user_id: string;
  name: string;
  role: 'co_organizer' | 'performer';
  type: CollabType;
}

const STEPS: Step[] = ['Infos', 'Lieu & Dates', 'Photos', 'Billets', 'Collaborateurs', 'Programme', 'Live', 'Sponsors', 'Confirmation'];

const fieldClass =
  'w-full px-4 py-3.5 bg-white dark:bg-[#1A1829] border border-black/[0.07] dark:border-white/[0.08] rounded-2xl text-[#171726] dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40 text-sm font-medium transition-all shadow-xs';

// City GPS presets for instant coordinate fallback
const CITY_COORDINATES: Record<string, { lat: number; lng: number; country: string }> = {
  Lomé: { lat: 6.1375, lng: 1.2123, country: 'TG' },
  Cotonou: { lat: 6.3703, lng: 2.3912, country: 'BJ' },
  Abidjan: { lat: 5.3600, lng: -4.0083, country: 'CI' },
  Accra: { lat: 5.6037, lng: -0.1870, country: 'GH' },
  Dakar: { lat: 14.6928, lng: -17.4467, country: 'SN' },
  Bamako: { lat: 12.6392, lng: -8.0029, country: 'ML' },
};

function getErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('row-level security')) return "Vous n'avez pas la permission de créer cet événement.";
  if (message.includes('duplicate key')) return 'Un événement similaire existe déjà.';
  if (message.includes('foreign key')) return 'Une des références est invalide.';
  return message || 'La création de l’événement a échoué.';
}

export function CreateEventWizardScreen({ onBack, onCreated, onToast }: Props) {
  const { user, t } = useApp();
  const [step, setStep] = useState<Step>('Infos');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Main Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'concert' as EventCategory,
    location_name: '',
    location_address: '',
    city: 'Lomé',
    country: 'TG',
    latitude: 6.1375 as number | null,
    longitude: 1.2123 as number | null,
    starts_at: '',
    ends_at: '',
    cover_url: '',
    video_url: '',
    capacity: '',
  });

  // Photo management state (Cover + Multiple Gallery Photos)
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [galleryFiles, setGalleryFiles] = useState<{ file: File; preview: string }[]>([]);

  // Tickets state
  const [tickets, setTickets] = useState([
    { ticket_type: 'standard', label: 'Standard', price: '0', quantity_total: '100', description: '' },
  ]);

  // Collaborators state
  const [collaborators, setCollaborators] = useState<SelectedCollab[]>([]);
  const [collabRole, setCollabRole] = useState<'co_organizer' | 'performer'>('performer');
  const [collabSearch, setCollabSearch] = useState('');
  const [results, setResults] = useState<{ artists: Artist[]; orgs: Organization[] }>({ artists: [], orgs: [] });
  const [searching, setSearching] = useState(false);

  // Optional steps state
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [liveItems, setLiveItems] = useState<LiveItem[]>([]);
  const [isLiveEvent, setIsLiveEvent] = useState(false);
  const [sponsorItems, setSponsorItems] = useState<SponsorItem[]>([]);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const stepIndex = STEPS.indexOf(step);

  // Auto-search collaborators
  useEffect(() => {
    if (!collabSearch.trim()) {
      setResults({ artists: [], orgs: [] });
      return;
    }
    setSearching(true);
    const timer = window.setTimeout(() => {
      Promise.all([searchArtists(collabSearch), searchOrganizations(collabSearch)])
        .then(([artists, orgs]) => setResults({ artists, orgs }))
        .catch(() => setResults({ artists: [], orgs: [] }))
        .finally(() => setSearching(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [collabSearch]);

  const updateForm = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleCityChange = (cityName: string) => {
    const coords = CITY_COORDINATES[cityName];
    setForm((curr) => ({
      ...curr,
      city: cityName,
      country: coords ? coords.country : curr.country,
      latitude: coords ? coords.lat : curr.latitude,
      longitude: coords ? coords.lng : curr.longitude,
    }));
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      onToast({ message: 'Géolocalisation non supportée par votre navigateur', type: 'error' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((curr) => ({
          ...curr,
          latitude: parseFloat(pos.coords.latitude.toFixed(6)),
          longitude: parseFloat(pos.coords.longitude.toFixed(6)),
        }));
        onToast({ message: 'Coordonnées GPS synchronisées !', type: 'success' });
      },
      () => {
        onToast({ message: 'Impossible de récupérer votre position GPS', type: 'error' });
      },
      { timeout: 8000 }
    );
  };

  // Add multiple gallery photos
  const handleAddGalleryFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    if (galleryFiles.length + files.length > 8) {
      onToast({ message: 'Maximum 8 photos de galerie autorisées', type: 'error' });
      return;
    }
    const newItems = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setGalleryFiles((curr) => [...curr, ...newItems]);
    if (event.target) event.target.value = '';
  };

  const handleRemoveGalleryPhoto = (index: number) => {
    setGalleryFiles((curr) => curr.filter((_, i) => i !== index));
  };

  const addCollaborator = (id: string, name: string, type: CollabType) => {
    if (!id || id === user?.id || collaborators.some((item) => item.user_id === id)) return;
    setCollaborators([...collaborators, { user_id: id, name, role: collabRole, type }]);
    setCollabSearch('');
  };

  const validateCurrentStep = (): boolean => {
    if (step === 'Infos') {
      if (!form.title.trim()) {
        setError('Le titre de l’événement est requis.');
        return false;
      }
    }
    if (step === 'Lieu & Dates') {
      const missing: string[] = [];
      if (!form.starts_at) missing.push('la date de début');
      if (!form.location_name.trim()) missing.push('le nom du lieu');
      if (!form.city.trim()) missing.push('la ville');
      if (missing.length) {
        setError(`Champs requis : ${missing.join(', ')}.`);
        return false;
      }
    }
    setError('');
    return true;
  };

  const createEvent = async () => {
    if (!user) return;
    if (!form.title.trim() || !form.starts_at || !form.location_name.trim() || !form.city.trim()) {
      setError('Veuillez compléter les informations essentielles (titre, date, lieu, ville).');
      return;
    }

    setCreating(true);
    setError('');

    try {
      // 1. Upload Cover photo
      let coverUrl = form.cover_url;
      if (coverFile) {
        const uploaded = await uploadEventImage(coverFile, user.id);
        if (uploaded) coverUrl = uploaded;
      }

      // 2. Upload multiple Gallery photos
      const uploadedGalleryUrls: string[] = [];
      for (const item of galleryFiles) {
        try {
          const url = await uploadEventImage(item.file, user.id);
          if (url) uploadedGalleryUrls.push(url);
        } catch {
          // continue uploading remaining
        }
      }

      const validTickets = tickets
        .filter((ticket) => ticket.label.trim() && ticket.quantity_total)
        .map((ticket) => ({
          ticket_type: ticket.ticket_type,
          label: ticket.label.trim(),
          price: Math.max(0, Number(ticket.price) || 0),
          quantity_total: Math.max(1, Number(ticket.quantity_total) || 1),
          description: ticket.description || undefined,
        }));

      const event = await createEventWithCollaborators(
        {
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category,
          location_name: form.location_name.trim(),
          location_address: form.location_address.trim() || null,
          city: form.city.trim(),
          country: form.country,
          latitude: form.latitude,
          longitude: form.longitude,
          starts_at: form.starts_at,
          ends_at: form.ends_at || null,
          price_min: validTickets.length ? Math.min(...validTickets.map((t) => t.price)) : 0,
          cover_url: coverUrl,
          images: uploadedGalleryUrls,
          video_url: form.video_url.trim() || null,
          capacity: form.capacity ? Math.max(1, Number(form.capacity)) : undefined,
          created_by_role: user.role === 'artist' ? 'artist' : 'organizer',
        },
        collaborators.map((item) => ({ user_id: item.user_id, role: item.role })),
        validTickets,
        user.id
      );

      if (!event) throw new Error('Échec de la création de l’événement');

      // Add Schedule slots
      await Promise.all(
        scheduleItems
          .filter((item) => item.title && item.start_time)
          .map((item, index) =>
            addScheduleSlot({
              event_id: event.id,
              day_label: item.day_label,
              stage_name: item.stage_name,
              start_time: new Date(item.start_time).toISOString(),
              end_time: item.end_time ? new Date(item.end_time).toISOString() : null,
              title: item.title,
              artist_id: item.artist_id || null,
              sort_order: index,
            })
          )
      );

      // Add Live links
      await Promise.all(
        isLiveEvent
          ? liveItems
              .filter((item) => item.url.trim())
              .map((item) => addEventLiveLink(event.id, item.platform, item.url.trim(), item.title.trim() || undefined))
          : []
      );

      // Add Sponsors
      await Promise.all(
        sponsorItems
          .filter((item) => item.name.trim())
          .map((item) =>
            addEventSponsor({
              event_id: event.id,
              name: item.name.trim(),
              website_url: item.website_url.trim() || undefined,
              logo_url: item.website_url ? getFaviconUrl(item.website_url) : item.logo_url || undefined,
              tier: item.tier,
              logo_source: item.logo_source,
            })
          )
      );

      onToast({
        message: collaborators.length
          ? 'Événement créé avec succès ! Invitations envoyées aux collaborateurs.'
          : 'Événement créé et publié avec succès.',
        type: 'success',
      });
      onCreated(event);
    } catch (caught) {
      const message = getErrorMessage(caught);
      setError(message);
      onToast({ message, type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const next = () => {
    if (!validateCurrentStep()) return;
    setStep(STEPS[Math.min(stepIndex + 1, STEPS.length - 1)]);
  };

  const previous = () => {
    setError('');
    setStep(STEPS[Math.max(stepIndex - 1, 0)]);
  };

  return (
    <div className="min-h-screen pb-36">
      {/* Hidden file inputs */}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) {
            onToast({ message: 'Image de couverture trop lourde (max 5MB)', type: 'error' });
            return;
          }
          setCoverFile(file);
          setCoverPreview(URL.createObjectURL(file));
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleAddGalleryFiles}
      />

      {/* Header */}
      <header className="sticky top-0 z-30 px-5 py-4 bg-white/80 dark:bg-[#14121E]/80 backdrop-blur-xl border-b border-black/[0.05] dark:border-white/[0.08]">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Retour"
            className="w-10 h-10 rounded-full glass-surface flex items-center justify-center active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-5 h-5 text-[#171726] dark:text-white" />
          </button>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#6600FF] dark:text-[#A78BFA] font-black">
              Création Studio
            </p>
            <h1 className="text-lg font-extrabold text-[#171726] dark:text-white">
              {step}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Étape {stepIndex + 1}/{STEPS.length}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="max-w-md mx-auto mt-3 flex gap-1.5">
          {STEPS.map((item, index) => (
            <div
              key={item}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                index <= stepIndex ? 'bg-[#6600FF]' : 'bg-gray-200 dark:bg-white/10'
              }`}
            />
          ))}
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 mt-6">
        {error && (
          <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 rounded-2xl text-xs font-semibold text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900/40">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: INFOS DE BASE */}
        {step === 'Infos' && (
          <section className="space-y-4 animate-slide-up">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Titre de l’événement *
              </label>
              <input
                className={fieldClass}
                value={form.title}
                onChange={(e) => updateForm('title', e.target.value)}
                placeholder="ex. Festival Nuits d'Afrique 2026"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Catégorie *
              </label>
              <select
                className={fieldClass}
                value={form.category}
                onChange={(e) => updateForm('category', e.target.value as EventCategory)}
              >
                {EVENT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {t('events', `categories.${cat.value}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Description & Programme sommaire
              </label>
              <textarea
                className={`${fieldClass} min-h-32 resize-none`}
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                placeholder="Racontez ce qui rend cet événement incontournable, artistes attendus, ambiance..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Capacité maximale attendue (facultatif)
              </label>
              <input
                type="number"
                min="1"
                className={fieldClass}
                value={form.capacity}
                onChange={(e) => updateForm('capacity', e.target.value)}
                placeholder="ex. 2500 participants"
              />
            </div>
          </section>
        )}

        {/* STEP 2: LIEU & DATES (ENHANCED LOCATION) */}
        {step === 'Lieu & Dates' && (
          <section className="space-y-4 animate-slide-up">
            <div className="card p-4 space-y-3.5">
              <div className="flex items-center gap-2 text-[#6600FF] dark:text-purple-300">
                <MapPin className="w-4 h-4" />
                <h3 className="text-sm font-bold text-[#17131D] dark:text-white">Localisation & Accès</h3>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                  Nom du lieu / Salle *
                </label>
                <input
                  className={fieldClass}
                  value={form.location_name}
                  onChange={(e) => updateForm('location_name', e.target.value)}
                  placeholder="ex. Palais des Congrès, Stade de Kégué"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                  Adresse précise / Quartier
                </label>
                <input
                  className={fieldClass}
                  value={form.location_address}
                  onChange={(e) => updateForm('location_address', e.target.value)}
                  placeholder="ex. Avenue de la Libération, Tokoin Doumasséssé"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                    Ville *
                  </label>
                  <select
                    className={fieldClass}
                    value={form.city}
                    onChange={(e) => handleCityChange(e.target.value)}
                  >
                    {CITIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.value}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                    Pays *
                  </label>
                  <select
                    className={fieldClass}
                    value={form.country}
                    onChange={(e) => updateForm('country', e.target.value)}
                  >
                    {COUNTRIES.map((ct) => (
                      <option key={ct.code} value={ct.code}>
                        {ct.flag} {ct.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Coordonnées GPS & Détection automatique */}
              <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.08]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    Coordonnées GPS pour la carte
                  </span>
                  <button
                    type="button"
                    onClick={handleLocateMe}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#6600FF] dark:text-purple-300 hover:underline cursor-pointer"
                  >
                    <Navigation className="w-3 h-3" /> Ma position
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-between">
                    <span className="text-gray-400">Lat:</span>
                    <span className="font-bold text-[#17131D] dark:text-white tabular-nums">
                      {form.latitude ?? '—'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-between">
                    <span className="text-gray-400">Lng:</span>
                    <span className="font-bold text-[#17131D] dark:text-white tabular-nums">
                      {form.longitude ?? '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dates & Heures */}
            <div className="card p-4 space-y-3">
              <h3 className="text-sm font-bold text-[#17131D] dark:text-white">Dates & Horaires</h3>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                  Début de l’événement *
                </label>
                <input
                  type="datetime-local"
                  className={fieldClass}
                  value={form.starts_at}
                  onChange={(e) => updateForm('starts_at', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                  Fin de l’événement (recommandé)
                </label>
                <input
                  type="datetime-local"
                  className={fieldClass}
                  value={form.ends_at}
                  onChange={(e) => updateForm('ends_at', e.target.value)}
                />
              </div>
            </div>
          </section>
        )}

        {/* STEP 3: PHOTOS (COVER + MULTIPLE GALLERY PHOTOS) */}
        {step === 'Photos' && (
          <section className="space-y-4 animate-slide-up">
            {/* Image principale / Cover */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Image de couverture (Principale)
                </label>
                <span className="text-[11px] text-gray-400">1 photo · 5MB max</span>
              </div>

              {coverPreview ? (
                <div className="relative h-44 rounded-2xl overflow-hidden ring-2 ring-[#6600FF]/30">
                  <img src={coverPreview} alt="Couverture" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setCoverFile(null);
                      setCoverPreview('');
                    }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#6600FF] text-white">
                    Couverture
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="w-full h-40 rounded-2xl border-2 border-dashed border-gray-300 dark:border-white/20 flex flex-col items-center justify-center gap-2 hover:border-[#6600FF]/50 transition-colors cursor-pointer"
                >
                  <ImagePlus className="w-8 h-8 text-gray-400" />
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                    Sélectionner l'affiche principale
                  </span>
                  <span className="text-[10px] text-gray-400">JPG, PNG, WebP · Haute résolution</span>
                </button>
              )}
            </div>

            {/* Photos secondaires de la galerie */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Galerie photos additionnelles
                </label>
                <span className="text-[11px] text-[#6600FF] dark:text-purple-300 font-bold">
                  {galleryFiles.length}/8 photos
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {galleryFiles.map((item, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-2xl overflow-hidden group ring-1 ring-black/10 dark:ring-white/10"
                  >
                    <img src={item.preview} alt={`Galerie ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveGalleryPhoto(index)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-1 left-1.5 text-[9px] font-bold text-white/90 drop-shadow-xs">
                      #{index + 1}
                    </span>
                  </div>
                ))}

                {galleryFiles.length < 8 && (
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 dark:border-white/20 flex flex-col items-center justify-center gap-1 hover:border-[#6600FF]/50 transition-colors cursor-pointer text-gray-400 hover:text-[#6600FF]"
                  >
                    <Plus className="w-6 h-6" />
                    <span className="text-[10px] font-bold">Ajouter</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                Ajoutez des photos de la scène, des artistes ou des éditions précédentes.
              </p>
            </div>

            {/* Vidéo Teaser / Médias de pré-saison */}
            <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.08]">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                Vidéo Teaser / Trailer de pré-saison (optionnel)
              </label>
              <input
                type="url"
                className={fieldClass}
                value={form.video_url}
                onChange={(e) => updateForm('video_url', e.target.value)}
                placeholder="Lien YouTube, Vimeo ou URL MP4 directe..."
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Un teaser vidéo augmente significativement l'intérêt et la visibilité de l'événement.
              </p>
            </div>
          </section>
        )}

        {/* STEP 4: BILLETS */}
        {step === 'Billets' && (
          <section className="space-y-4 animate-slide-up">
            <div className="flex items-center gap-2 p-3 bg-[#6600FF]/10 dark:bg-[#6600FF]/20 rounded-2xl text-xs text-[#17131D] dark:text-white">
              <Info className="w-4 h-4 text-[#6600FF] dark:text-purple-300 shrink-0" />
              <span>
                Pour un événement gratuit, définissez le prix à 0 FCFA. Vous pouvez créer plusieurs catégories (Standard, VIP, etc.).
              </span>
            </div>

            {tickets.map((ticket, index) => (
              <div key={index} className="card p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <select
                    className={fieldClass}
                    value={ticket.ticket_type}
                    onChange={(e) =>
                      setTickets(
                        tickets.map((item, i) =>
                          i === index ? { ...item, ticket_type: e.target.value } : item
                        )
                      )
                    }
                  >
                    <option value="free">Gratuit</option>
                    <option value="standard">Standard</option>
                    <option value="vip">VIP</option>
                    <option value="vvip">VVIP</option>
                  </select>

                  {tickets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setTickets(tickets.filter((_, i) => i !== index))}
                      className="ml-2 text-red-500 hover:text-red-600 p-2 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <input
                  className={fieldClass}
                  value={ticket.label}
                  onChange={(e) =>
                    setTickets(
                      tickets.map((item, i) =>
                        i === index ? { ...item, label: e.target.value } : item
                      )
                    )
                  }
                  placeholder="Nom du billet (ex. Pass 1 Jour, VIP Accès Lounge)"
                />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">Prix (FCFA)</label>
                    <input
                      className={fieldClass}
                      type="number"
                      min="0"
                      value={ticket.price}
                      onChange={(e) =>
                        setTickets(
                          tickets.map((item, i) =>
                            i === index ? { ...item, price: e.target.value } : item
                          )
                        )
                      }
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">Quantité totale</label>
                    <input
                      className={fieldClass}
                      type="number"
                      min="1"
                      value={ticket.quantity_total}
                      onChange={(e) =>
                        setTickets(
                          tickets.map((item, i) =>
                            i === index ? { ...item, quantity_total: e.target.value } : item
                          )
                        )
                      }
                      placeholder="100"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                setTickets([
                  ...tickets,
                  { ticket_type: 'standard', label: '', price: '0', quantity_total: '100', description: '' },
                ])
              }
              className="w-full py-3.5 rounded-2xl border border-dashed border-[#6600FF]/40 text-[#6600FF] dark:text-purple-300 font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-[#6600FF]/5"
            >
              <Plus className="w-4 h-4" />
              Ajouter un type de billet
            </button>
          </section>
        )}

        {/* STEP 5: COLLABORATEURS */}
        {step === 'Collaborateurs' && (
          <section className="space-y-4 animate-slide-up">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCollabRole('performer')}
                className={`chip flex-1 justify-center py-2.5 ${
                  collabRole === 'performer' ? 'chip-active' : 'chip-inactive'
                }`}
              >
                <Music2 className="w-4 h-4" />
                Artiste
              </button>
              <button
                type="button"
                onClick={() => setCollabRole('co_organizer')}
                className={`chip flex-1 justify-center py-2.5 ${
                  collabRole === 'co_organizer' ? 'chip-active' : 'chip-inactive'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Co-organisateur
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6600FF]/70" />
              <input
                className={`${fieldClass} pl-11`}
                value={collabSearch}
                onChange={(e) => setCollabSearch(e.target.value)}
                placeholder="Rechercher un artiste ou une organisation..."
              />
            </div>

            {searching && <p className="text-xs text-gray-500 text-center">Recherche en cours...</p>}

            <div className="space-y-2">
              {results.artists.map((artist) => (
                <button
                  type="button"
                  key={artist.id}
                  onClick={() => addCollaborator(artist.user_id || '', artist.name, 'artist')}
                  className="w-full card p-3 flex items-center gap-3 text-left hover:border-[#6600FF]/40 transition-colors"
                >
                  <Music2 className="w-4 h-4 text-[#6600FF] shrink-0" />
                  <span className="text-xs font-bold text-[#17131D] dark:text-white">{artist.name}</span>
                </button>
              ))}

              {results.orgs.map((org) => (
                <button
                  type="button"
                  key={org.id}
                  onClick={() => addCollaborator(org.owner_id || '', org.name, 'organizer')}
                  className="w-full card p-3 flex items-center gap-3 text-left hover:border-[#6600FF]/40 transition-colors"
                >
                  <Building2 className="w-4 h-4 text-[#6600FF] shrink-0" />
                  <span className="text-xs font-bold text-[#17131D] dark:text-white">{org.name}</span>
                </button>
              ))}
            </div>

            {collaborators.length > 0 && (
              <div className="card p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Collaborateurs invités</p>
                {collaborators.map((item) => (
                  <div key={item.user_id} className="flex items-center justify-between text-xs py-1">
                    <span className="font-semibold text-[#17131D] dark:text-white">
                      {item.name} ({item.role === 'performer' ? 'Artiste' : 'Co-org.'})
                    </span>
                    <button
                      type="button"
                      onClick={() => setCollaborators(collaborators.filter((c) => c.user_id !== item.user_id))}
                      className="text-red-500 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* STEPS 6, 7, 8: PROGRAMME, LIVE, SPONSORS */}
        {(['Programme', 'Live', 'Sponsors'] as const).includes(step as 'Programme' | 'Live' | 'Sponsors') && (
          <EventOptionalSteps
            step={step as 'Programme' | 'Live' | 'Sponsors'}
            scheduleItems={scheduleItems}
            setScheduleItems={setScheduleItems}
            liveItems={liveItems}
            setLiveItems={setLiveItems}
            isLiveEvent={isLiveEvent}
            setIsLiveEvent={setIsLiveEvent}
            sponsorItems={sponsorItems}
            setSponsorItems={setSponsorItems}
          />
        )}

        {/* STEP 9: CONFIRMATION */}
        {step === 'Confirmation' && (
          <section className="space-y-4 animate-slide-up">
            <div className="card p-5 space-y-3">
              <h2 className="text-xl font-extrabold text-[#171726] dark:text-white">
                {form.title || 'Votre événement'}
              </h2>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-full bg-[#6600FF]/10 text-[#6600FF] dark:text-purple-300 font-bold">
                  {t('events', `categories.${form.category}`)}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 font-medium">
                  {form.city}
                </span>
                {galleryFiles.length > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 text-[#6600FF] font-medium">
                    {galleryFiles.length + (coverPreview ? 1 : 0)} photo(s)
                  </span>
                )}
                {scheduleItems.length > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/10 font-medium">
                    {scheduleItems.length} créneau(x)
                  </span>
                )}
                {isLiveEvent && liveItems.length > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-600 font-bold">Live activé</span>
                )}
                {sponsorItems.length > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/10 font-medium">
                    {sponsorItems.length} sponsor(s)
                  </span>
                )}
              </div>
            </div>

            <div className="card p-4 space-y-2">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <TicketIcon className="w-4 h-4 text-[#6600FF]" /> Billets prévus
              </h3>
              {tickets.map((ticket, i) => (
                <div key={i} className="flex justify-between text-xs py-1 border-b border-black/[0.04] dark:border-white/[0.06] last:border-0">
                  <span className="font-semibold text-[#17131D] dark:text-white">{ticket.label || 'Standard'}</span>
                  <span className="font-bold text-[#6600FF] dark:text-purple-300">
                    {Number(ticket.price) === 0 ? 'Gratuit' : `${Number(ticket.price).toLocaleString('fr-FR')} FCFA`}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              Toutes les données seront synchronisées et sécurisées sur votre compte.
            </p>
          </section>
        )}

        {/* Wizard Controls */}
        <div className="flex gap-3 mt-6">
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={previous}
              className="flex-1 py-3.5 rounded-full bg-white dark:bg-[#1A1829] border border-black/[0.08] dark:border-white/[0.1] text-gray-700 dark:text-gray-200 font-bold text-sm cursor-pointer active:scale-95 transition-transform"
            >
              Retour
            </button>
          )}

          {step === 'Confirmation' ? (
            <button
              type="button"
              onClick={createEvent}
              disabled={creating}
              className="btn-purple flex-1 py-3.5 flex items-center justify-center gap-2 cursor-pointer font-bold text-sm"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Publication en cours...
                </>
              ) : (
                'Publier l’événement'
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              className="btn-purple flex-1 py-3.5 cursor-pointer font-bold text-sm"
            >
              Continuer
            </button>
          )}
        </div>

        {step !== 'Confirmation' && (
          <button
            type="button"
            onClick={onBack}
            className="w-full mt-3 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            Annuler et quitter
          </button>
        )}
      </main>
    </div>
  );
}
