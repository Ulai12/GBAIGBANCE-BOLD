import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  Clock,
  Film,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import { EVENT_CATEGORIES, CITIES, COUNTRIES } from '@/constants';
import {
  fetchEventById,
  fetchTicketOptions,
  fetchCollaborators,
  updateEventFull,
  uploadEventImage,
  searchArtists,
} from '@/services/events';
import type { Artist, Event, EventCategory, EventStatus, EventCollaborator } from '@/types';
import type { ToastData } from '@/components/Toast';

interface EditEventScreenProps {
  eventId: string;
  onBack: () => void;
  onSaved: (updatedEvent: Event) => void;
  onToast: (toast: Omit<ToastData, 'id'>) => void;
}

type Tab = 'infos' | 'location_dates' | 'media' | 'tickets' | 'collabs';

interface LocalTicket {
  id?: string;
  ticket_type: string;
  label: string;
  price: string;
  quantity_total: string;
  description: string;
  quantity_sold?: number;
}

const CITY_COORDINATES: Record<string, { lat: number; lng: number; country: string }> = {
  Lomé: { lat: 6.1375, lng: 1.2123, country: 'TG' },
  Cotonou: { lat: 6.3703, lng: 2.3912, country: 'BJ' },
  Abidjan: { lat: 5.3600, lng: -4.0083, country: 'CI' },
  Accra: { lat: 5.6037, lng: -0.1870, country: 'GH' },
  Dakar: { lat: 14.6928, lng: -17.4467, country: 'SN' },
  Bamako: { lat: 12.6392, lng: -8.0029, country: 'ML' },
};

export function EditEventScreen({ eventId, onBack, onSaved, onToast }: EditEventScreenProps) {
  const { user, t } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('infos');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<EventCategory>('concert');
  const [status, setStatus] = useState<EventStatus>('published');

  // Location & Dates
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [city, setCity] = useState('Lomé');
  const [country, setCountry] = useState('TG');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [capacity, setCapacity] = useState('');

  // Media
  const [coverUrl, setCoverUrl] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [newGalleryFiles, setNewGalleryFiles] = useState<{ file: File; preview: string }[]>([]);
  const [videoUrl, setVideoUrl] = useState('');

  // Tickets
  const [tickets, setTickets] = useState<LocalTicket[]>([]);

  // Collaborators
  const [existingCollabs, setExistingCollabs] = useState<EventCollaborator[]>([]);
  const [newCollabs, setNewCollabs] = useState<{ user_id: string; name: string; role: 'co_organizer' | 'performer' }[]>([]);
  const [artistSearch, setArtistSearch] = useState('');
  const [artistResults, setArtistResults] = useState<Artist[]>([]);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isCancelled = false;
    async function loadData() {
      try {
        setLoading(true);
        const [eventData, ticketData, collabData] = await Promise.all([
          fetchEventById(eventId),
          fetchTicketOptions(eventId),
          fetchCollaborators(eventId),
        ]);

        if (isCancelled) return;
        if (!eventData) {
          setError('Événement introuvable');
          return;
        }

        setTitle(eventData.title || '');
        setDescription(eventData.description || '');
        setCategory(eventData.category || 'concert');
        setStatus(eventData.status || 'published');
        setLocationName(eventData.location_name || '');
        setLocationAddress(eventData.location_address || '');
        setCity(eventData.city || 'Lomé');
        setCountry(eventData.country || 'TG');
        setLatitude(eventData.latitude);
        setLongitude(eventData.longitude);

        if (eventData.starts_at) {
          const d = new Date(eventData.starts_at);
          setStartsAt(d.toISOString().slice(0, 16));
        }
        if (eventData.ends_at) {
          const d = new Date(eventData.ends_at);
          setEndsAt(d.toISOString().slice(0, 16));
        }
        setCapacity(eventData.capacity ? String(eventData.capacity) : '');
        setCoverUrl(eventData.cover_url || '');
        setGalleryUrls(eventData.images || []);
        setVideoUrl(eventData.video_url || '');

        if (ticketData && ticketData.length > 0) {
          setTickets(
            ticketData.map((t) => ({
              id: t.id,
              ticket_type: t.ticket_type,
              label: t.label,
              price: String(t.price),
              quantity_total: String(t.quantity_total),
              description: t.description || '',
              quantity_sold: t.quantity_sold,
            }))
          );
        } else {
          setTickets([
            {
              ticket_type: 'standard',
              label: 'Billet Standard',
              price: String(eventData.price_min || 0),
              quantity_total: '100',
              description: "Accès standard à l'événement",
            },
          ]);
        }

        setExistingCollabs(collabData);
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Erreur de chargement');
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      isCancelled = true;
    };
  }, [eventId]);

  const handleCityChange = (cityName: string) => {
    setCity(cityName);
    const preset = CITY_COORDINATES[cityName];
    if (preset) {
      setCountry(preset.country);
      setLatitude(preset.lat);
      setLongitude(preset.lng);
    }
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const preview = URL.createObjectURL(file);
      setCoverUrl(preview);
    }
  };

  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const newItems = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setNewGalleryFiles((prev) => [...prev, ...newItems]);
  };

  const removeGalleryUrl = (index: number) => {
    setGalleryUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewGalleryFile = (index: number) => {
    setNewGalleryFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Artist search for collaborators
  useEffect(() => {
    if (!artistSearch.trim()) {
      setArtistResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchArtists(artistSearch)
        .then(setArtistResults)
        .catch(() => setArtistResults([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [artistSearch]);

  const handleAddArtistCollab = (artist: Artist) => {
    if (existingCollabs.some((c) => c.user_id === artist.id) || newCollabs.some((c) => c.user_id === artist.id)) {
      onToast({ message: 'Artiste déjà associé', type: 'info' });
      return;
    }
    setNewCollabs((prev) => [
      ...prev,
      { user_id: artist.id, name: artist.name, role: 'performer' },
    ]);
    setArtistSearch('');
    setArtistResults([]);
  };

  const handleAddTicket = () => {
    setTickets((prev) => [
      ...prev,
      {
        ticket_type: 'standard',
        label: `Pass ${prev.length + 1}`,
        price: '5000',
        quantity_total: '50',
        description: '',
      },
    ]);
  };

  const handleRemoveTicket = (index: number) => {
    if (tickets.length <= 1) {
      onToast({ message: 'Il faut au moins un pass pour l’événement', type: 'error' });
      return;
    }
    setTickets((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      onToast({ message: 'Le titre est obligatoire', type: 'error' });
      setActiveTab('infos');
      return;
    }
    if (!startsAt) {
      onToast({ message: 'La date et l’heure sont requises', type: 'error' });
      setActiveTab('location_dates');
      return;
    }

    try {
      setSaving(true);

      // 1. Upload new cover if selected
      let finalCoverUrl = coverUrl;
      if (coverFile && user) {
        const uploaded = await uploadEventImage(coverFile, user.id);
        if (uploaded) finalCoverUrl = uploaded;
      }

      // 2. Upload new gallery files if any
      const uploadedGalleryUrls: string[] = [...galleryUrls];
      if (newGalleryFiles.length > 0 && user) {
        for (const item of newGalleryFiles) {
          try {
            const up = await uploadEventImage(item.file, user.id);
            if (up) uploadedGalleryUrls.push(up);
          } catch {
            // continue with others
          }
        }
      }

      // Compute min price
      const numericPrices = tickets.map((t) => Number(t.price) || 0);
      const priceMin = Math.min(...numericPrices, 0);

      // Format tickets payload
      const ticketPayload = tickets.map((t) => ({
        id: t.id,
        ticket_type: t.ticket_type,
        label: t.label.trim() || 'Billet Standard',
        price: Number(t.price) || 0,
        quantity_total: Number(t.quantity_total) || 100,
        description: t.description.trim() || undefined,
      }));

      // Format collaborator payload
      const collabPayload = newCollabs.map((c) => ({
        user_id: c.user_id,
        role: c.role,
      }));

      const updated = await updateEventFull(
        eventId,
        {
          title,
          description,
          category,
          location_name: locationName,
          location_address: locationAddress,
          city,
          country,
          latitude,
          longitude,
          starts_at: startsAt,
          ends_at: endsAt || null,
          price_min: priceMin,
          cover_url: finalCoverUrl,
          images: uploadedGalleryUrls,
          video_url: videoUrl.trim() || null,
          capacity: capacity ? Number(capacity) : null,
          status,
        },
        collabPayload,
        ticketPayload,
        user?.id
      );

      if (updated) {
        onToast({ message: 'Événement mis à jour avec succès !', type: 'success' });
        onSaved(updated);
      } else {
        onToast({ message: 'Événement mis à jour !', type: 'success' });
        onBack();
      }
    } catch (err) {
      onToast({
        message: err instanceof Error ? err.message : 'Erreur lors de la sauvegarde',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0D0B14]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#6600FF] animate-spin" />
          <p className="text-sm font-semibold text-gray-500">Chargement de l'événement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 bg-gray-50 dark:bg-[#0D0B14] text-[#17131D] dark:text-white">
      {/* Top Bar iOS Glass */}
      <header className="sticky top-0 z-30 px-5 py-4 bg-white/80 dark:bg-[#12101F]/80 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center hover:bg-black/10 transition-colors cursor-pointer active:scale-95"
            aria-label="Retour"
          >
            <ChevronLeft className="w-5 h-5 text-[#17131D] dark:text-white" />
          </button>
          <div>
            <h1 className="text-base font-black tracking-tight leading-tight line-clamp-1">
              Modifier l'événement
            </h1>
            <p className="text-xs text-gray-400 font-medium line-clamp-1">{title || 'Sans titre'}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-full bg-[#6600FF] text-white text-xs font-bold hover:bg-[#5200cc] transition-all shadow-sm shadow-[#6600FF]/30 active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>Enregistrer</span>
        </button>
      </header>

      {/* Segmented iOS Tabs */}
      <div className="px-5 pt-4">
        <div className="flex gap-1 p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-2xl overflow-x-auto no-scrollbar border border-black/[0.04] dark:border-white/[0.06]">
          {[
            { id: 'infos' as Tab, label: 'Infos' },
            { id: 'location_dates' as Tab, label: 'Lieu & Dates' },
            { id: 'media' as Tab, label: 'Médias & Teaser' },
            { id: 'tickets' as Tab, label: 'Pass & Billets' },
            { id: 'collabs' as Tab, label: 'Collaborateurs' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-[#6600FF] text-[#17131D] dark:text-white shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-xl mx-auto px-5 pt-6 space-y-6">
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: INFOS */}
        {activeTab === 'infos' && (
          <div className="space-y-4 animate-fade-in">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Titre de l'événement *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Soirée Afro-Beats & Lounge"
                className="w-full px-4 py-3.5 bg-white dark:bg-[#1A1829] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl text-sm font-bold text-[#17131D] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40 shadow-xs"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Catégorie *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {EVENT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id as EventCategory)}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      category === cat.id
                        ? 'bg-[#6600FF] text-white border-[#6600FF] shadow-sm shadow-[#6600FF]/30 scale-[1.02]'
                        : 'bg-white dark:bg-[#1A1829] border-black/[0.07] dark:border-white/[0.08] text-gray-600 dark:text-gray-300 hover:border-black/20'
                    }`}
                  >
                    <span className="text-xl">{cat.icon}</span>
                    <span>{t('events', `categories.${cat.id}`)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Lifecycle Status */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Statut du cycle de vie
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'published', label: 'Publié (Actif)' },
                  { id: 'paused', label: 'Ventes en pause' },
                  { id: 'cancelled', label: 'Annulé' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStatus(st.id as EventStatus)}
                    className={`py-3 px-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      status === st.id
                        ? st.id === 'cancelled'
                          ? 'bg-red-600 text-white border-red-600'
                          : st.id === 'paused'
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-[#6600FF] text-white border-[#6600FF]'
                        : 'bg-white dark:bg-[#1A1829] border-black/[0.07] dark:border-white/[0.08] text-gray-500 hover:border-black/20'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Description & Contenu détaillé
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez le programme, l'ambiance, les artistes invités, le dress-code..."
                rows={5}
                className="w-full px-4 py-3.5 bg-white dark:bg-[#1A1829] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl text-sm text-[#17131D] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40 shadow-xs"
              />
            </div>
          </div>
        )}

        {/* TAB 2: LIEU & DATES */}
        {activeTab === 'location_dates' && (
          <div className="space-y-4 animate-fade-in">
            {/* Location Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Nom du lieu *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#6600FF] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Ex: Palais des Congrès, Hôtel 2 Février"
                  className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-[#1A1829] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl text-sm font-semibold text-[#17131D] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40 shadow-xs"
                />
              </div>
            </div>

            {/* Location Address */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Adresse exacte ou repère
              </label>
              <input
                type="text"
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                placeholder="Ex: Boulevard Circulaire, en face de la banque"
                className="w-full px-4 py-3.5 bg-white dark:bg-[#1A1829] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl text-sm text-[#17131D] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40 shadow-xs"
              />
            </div>

            {/* City & Country */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Ville
                </label>
                <select
                  value={city}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="w-full px-4 py-3.5 bg-white dark:bg-[#1A1829] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl text-sm font-semibold text-[#17131D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40 shadow-xs"
                >
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Pays
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-3.5 bg-white dark:bg-[#1A1829] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl text-sm font-semibold text-[#17131D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40 shadow-xs"
                >
                  {COUNTRIES.map((cty) => (
                    <option key={cty.code} value={cty.code}>
                      {cty.flag} {cty.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Date & Heure de début *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[#6600FF] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-[#1A1829] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl text-sm font-semibold text-[#17131D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40 shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Date & Heure de fin
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-purple-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-[#1A1829] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl text-sm font-semibold text-[#17131D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40 shadow-xs"
                  />
                </div>
              </div>
            </div>

            {/* Capacity */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Capacité totale (places maximum)
              </label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="Ex: 500"
                className="w-full px-4 py-3.5 bg-white dark:bg-[#1A1829] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl text-sm font-semibold text-[#17131D] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40 shadow-xs"
              />
            </div>
          </div>
        )}

        {/* TAB 3: MÉDIAS & TEASER */}
        {activeTab === 'media' && (
          <div className="space-y-5 animate-fade-in">
            {/* Cover Image */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#1A1829] border border-black/[0.07] dark:border-white/[0.08] shadow-xs space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Image de couverture principale
              </label>
              {coverUrl ? (
                <div className="relative h-44 rounded-xl overflow-hidden border border-black/[0.08]">
                  <img src={coverUrl} alt="Couverture" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-bold hover:bg-black/80 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" /> Changer la photo
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="w-full h-36 border-2 border-dashed border-gray-300 dark:border-white/20 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-[#6600FF] transition-colors cursor-pointer"
                >
                  <ImagePlus className="w-8 h-8 text-gray-400" />
                  <span className="text-xs font-bold text-gray-500">Ajouter une image de couverture</span>
                </button>
              )}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverSelect}
                className="hidden"
              />
            </div>

            {/* Video Teaser / Trailer (Pre-season media) */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#1A1829] border border-black/[0.07] dark:border-white/[0.08] shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-[#6600FF] dark:text-purple-300">
                <Video className="w-4 h-4" />
                <h3 className="text-sm font-bold text-[#17131D] dark:text-white">
                  Vidéo Teaser / Trailer de pré-saison
                </h3>
              </div>
              <p className="text-xs text-gray-400">
                Ajoutez une vidéo de promotion, aftermovie de l'édition précédente ou teaser (lien YouTube, Vimeo, MP4 direct).
              </p>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... ou https://.../teaser.mp4"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-sm text-[#17131D] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40 shadow-xs"
              />
            </div>

            {/* Gallery Images */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#1A1829] border border-black/[0.07] dark:border-white/[0.08] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-[#6600FF]" />
                  <h3 className="text-sm font-bold text-[#17131D] dark:text-white">
                    Photos de galerie & pré-saison
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="text-xs font-bold text-[#6600FF] dark:text-purple-400 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter des photos
                </button>
              </div>
              <input
                ref={galleryInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleGallerySelect}
                className="hidden"
              />

              {/* Photos grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 pt-1">
                {galleryUrls.map((url, i) => (
                  <div key={url} className="relative aspect-square rounded-xl overflow-hidden border border-black/[0.08] group">
                    <img src={url} alt={`Galerie ${i}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeGalleryUrl(i)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 shadow-md cursor-pointer transition-transform active:scale-90"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {newGalleryFiles.map((item, i) => (
                  <div key={item.preview} className="relative aspect-square rounded-xl overflow-hidden border-2 border-[#6600FF] group">
                    <img src={item.preview} alt="Nouvelle" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-full bg-[#6600FF] text-[9px] font-bold text-white">
                      Nouveau
                    </span>
                    <button
                      type="button"
                      onClick={() => removeNewGalleryFile(i)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 shadow-md cursor-pointer"
                      aria-label="Supprimer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-white/20 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-[#6600FF] hover:border-[#6600FF] transition-colors cursor-pointer"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-[10px] font-bold">Ajouter</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PASS & BILLETS */}
        {activeTab === 'tickets' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-[#17131D] dark:text-white">
                  Types de billets & Pass
                </h3>
                <p className="text-xs text-gray-400">
                  Gérez les différents tarifs, quotas et places disponibles.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddTicket}
                className="px-3 py-1.5 rounded-full bg-[#6600FF] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-[#6600FF]/30 cursor-pointer active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Nouveau Pass
              </button>
            </div>

            <div className="space-y-3">
              {tickets.map((tkt, idx) => {
                const total = Number(tkt.quantity_total) || 0;
                const sold = tkt.quantity_sold || 0;
                const remaining = Math.max(0, total - sold);

                return (
                  <div
                    key={tkt.id || idx}
                    className="p-4 rounded-2xl bg-white dark:bg-[#1A1829] border border-black/[0.08] dark:border-white/[0.08] shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-[#6600FF]/10 text-[#6600FF] flex items-center justify-center font-black text-xs">
                          {idx + 1}
                        </span>
                        <select
                          value={tkt.ticket_type}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTickets((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, ticket_type: val } : item))
                            );
                          }}
                          className="px-2.5 py-1 bg-gray-100 dark:bg-white/[0.08] rounded-lg text-xs font-bold focus:outline-none"
                        >
                          <option value="free">Gratuit</option>
                          <option value="standard">Standard</option>
                          <option value="vip">VIP</option>
                          <option value="vvip">VVIP</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        {tkt.quantity_sold !== undefined && (
                          <span className="text-[11px] font-bold text-gray-500">
                            {sold} vendus · <strong className="text-emerald-600 dark:text-emerald-400">{remaining} restants</strong>
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveTicket(idx)}
                          className="w-8 h-8 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center justify-center transition-colors cursor-pointer"
                          aria-label="Supprimer ce pass"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                          Nom du Pass
                        </label>
                        <input
                          type="text"
                          value={tkt.label}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTickets((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, label: val } : item))
                            );
                          }}
                          placeholder="Ex: Pass VIP Privilège"
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.05] border border-black/[0.06] rounded-xl text-xs font-bold text-[#17131D] dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                          Prix (FCFA)
                        </label>
                        <input
                          type="number"
                          value={tkt.price}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTickets((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, price: val } : item))
                            );
                          }}
                          placeholder="0"
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.05] border border-black/[0.06] rounded-xl text-xs font-bold text-[#17131D] dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                          Quota total
                        </label>
                        <input
                          type="number"
                          value={tkt.quantity_total}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTickets((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, quantity_total: val } : item))
                            );
                          }}
                          placeholder="100"
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.05] border border-black/[0.06] rounded-xl text-xs font-bold text-[#17131D] dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                        Inclusions & Avantages du pass
                      </label>
                      <input
                        type="text"
                        value={tkt.description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTickets((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, description: val } : item))
                          );
                        }}
                        placeholder="Ex: Entrée coupe-file, espace lounge, boisson offerte..."
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.05] border border-black/[0.06] rounded-xl text-xs text-[#17131D] dark:text-white"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: COLLABORATEURS & ARTISTES */}
        {activeTab === 'collabs' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#1A1829] border border-black/[0.07] dark:border-white/[0.08] shadow-xs space-y-3">
              <h3 className="text-sm font-black text-[#17131D] dark:text-white">
                Associer des artistes & co-organisateurs
              </h3>
              <p className="text-xs text-gray-400">
                Les artistes associés apparaîtront sur l'affiche et pourront interagir officiellement avec le public.
              </p>

              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={artistSearch}
                  onChange={(e) => setArtistSearch(e.target.value)}
                  placeholder="Rechercher un artiste par son nom..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/[0.05] border border-black/[0.08] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40"
                />
              </div>

              {artistResults.length > 0 && (
                <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08] max-h-48 overflow-y-auto border border-black/[0.06] dark:border-white/[0.08] rounded-xl">
                  {artistResults.map((art) => (
                    <div
                      key={art.id}
                      className="p-2.5 flex items-center justify-between hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={art.photo_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100'}
                          alt={art.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div>
                          <p className="text-xs font-bold text-[#17131D] dark:text-white">{art.name}</p>
                          <p className="text-[10px] text-gray-400">{art.genres?.join(', ') || 'Artiste'}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddArtistCollab(art)}
                        className="px-2.5 py-1 rounded-full bg-[#6600FF] text-white text-[11px] font-bold hover:bg-[#5200cc] cursor-pointer"
                      >
                        + Associer
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Associated Collabs */}
              <div className="pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Collaborateurs actuels ({existingCollabs.length + newCollabs.length})
                </h4>
                <div className="space-y-2">
                  {existingCollabs.map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.04] flex items-center justify-between border border-black/[0.04]"
                    >
                      <span className="text-xs font-bold text-[#17131D] dark:text-white">
                        {c.profile?.name || c.artist?.name || 'Collaborateur'}
                      </span>
                      <span className="text-[10px] font-bold text-[#6600FF] bg-[#6600FF]/10 px-2 py-0.5 rounded-full uppercase">
                        {c.role === 'performer' ? 'Artiste' : 'Co-organisateur'}
                      </span>
                    </div>
                  ))}

                  {newCollabs.map((c, i) => (
                    <div
                      key={c.user_id}
                      className="p-2.5 rounded-xl bg-[#6600FF]/5 flex items-center justify-between border border-[#6600FF]/20"
                    >
                      <span className="text-xs font-bold text-[#17131D] dark:text-white">
                        {c.name} <span className="text-[10px] text-[#6600FF]">(Ajouté)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setNewCollabs((prev) => prev.filter((_, idx) => idx !== i))}
                        className="w-6 h-6 rounded-full text-red-500 hover:bg-red-50 flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
