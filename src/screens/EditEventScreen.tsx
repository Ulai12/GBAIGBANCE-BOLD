import { useEffect, useRef, useState, useMemo } from 'react';
import {
  AlertCircle,
  Calendar,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  Clock,
  DollarSign,
  Eye,
  Film,
  GraduationCap,
  ImagePlus,
  Info,
  Landmark,
  Loader2,
  Lock,
  MapPin,
  Mic,
  Music,
  Palette,
  PartyPopper,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Theater,
  Ticket as TicketIcon,
  Trash2,
  Upload,
  UserCheck,
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
  removeCollaborator,
  isEventTerminated,
  cancelEvent,
  deleteEvent,
} from '@/services/events';
import type { Artist, Event, EventCategory, EventStatus, EventCollaborator } from '@/types';
import type { ToastData } from '@/components/Toast';
import { formatNumber } from '@/utils/format';

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

// Helper: Format ISO / date string to local "YYYY-MM-DDTHH:mm" without UTC offset issues
function toLocalDateTimeInput(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Category Icon renderer with visual fallback
function getCategoryIcon(value: string) {
  switch (value) {
    case 'concert':
      return <Music className="w-5 h-5" />;
    case 'festival':
      return <PartyPopper className="w-5 h-5" />;
    case 'conference':
      return <Mic className="w-5 h-5" />;
    case 'formation':
      return <GraduationCap className="w-5 h-5" />;
    case 'exposition':
      return <Palette className="w-5 h-5" />;
    case 'spectacle':
      return <Theater className="w-5 h-5" />;
    case 'cultural':
      return <Landmark className="w-5 h-5" />;
    case 'private':
      return <Lock className="w-5 h-5" />;
    default:
      return <Music className="w-5 h-5" />;
  }
}

// Extract YouTube ID if valid
function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export function EditEventScreen({ eventId, onBack, onSaved, onToast }: EditEventScreenProps) {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('infos');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [rawEvent, setRawEvent] = useState<Event | null>(null);

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

  // Modals & confirmation dialogs
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'cancel' | 'delete'>('cancel');
  const [deleting, setDeleting] = useState(false);

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

        setRawEvent(eventData);
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

        setStartsAt(toLocalDateTimeInput(eventData.starts_at));
        setEndsAt(toLocalDateTimeInput(eventData.ends_at));

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
              quantity_sold: t.quantity_sold || 0,
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
              quantity_sold: 0,
            },
          ]);
        }

        setExistingCollabs(collabData || []);
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

  // Determine if this event is terminated (past date or completed status)
  const isTerminated = useMemo(() => {
    if (status === 'completed') return true;
    if (rawEvent && isEventTerminated(rawEvent)) return true;
    if (endsAt) {
      return new Date(endsAt).getTime() < Date.now();
    }
    if (startsAt) {
      // If startsAt was more than 8 hours ago and no endsAt specified
      return new Date(startsAt).getTime() + 8 * 3600 * 1000 < Date.now();
    }
    return false;
  }, [status, rawEvent, endsAt, startsAt]);

  // Statistics calculation for Header KPI
  const stats = useMemo(() => {
    const totalTicketsSold = tickets.reduce((acc, t) => acc + (t.quantity_sold || 0), 0);
    const totalCapacity = Number(capacity) || tickets.reduce((acc, t) => acc + (Number(t.quantity_total) || 0), 0);
    const estimatedRevenue = tickets.reduce((acc, t) => acc + (t.quantity_sold || 0) * (Number(t.price) || 0), 0);
    const progressPercent = totalCapacity > 0 ? Math.min(100, Math.round((totalTicketsSold / totalCapacity) * 100)) : 0;

    return {
      views: rawEvent?.views_count || 0,
      likes: rawEvent?.likes_count || 0,
      ticketsSold: totalTicketsSold,
      capacity: totalCapacity,
      progressPercent,
      revenue: estimatedRevenue,
    };
  }, [tickets, capacity, rawEvent]);

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
    onToast({ message: `${artist.name} ajouté aux artistes invités`, type: 'success' });
  };

  const handleRemoveExistingCollab = async (collabId: string, userId: string) => {
    try {
      await removeCollaborator(eventId, userId);
      setExistingCollabs((prev) => prev.filter((c) => c.id !== collabId));
      onToast({ message: 'Collaborateur retiré', type: 'info' });
    } catch {
      onToast({ message: 'Impossible de retirer le collaborateur', type: 'error' });
    }
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
        quantity_sold: 0,
      },
    ]);
  };

  const handleRemoveTicket = (index: number) => {
    const target = tickets[index];
    if (target && target.quantity_sold && target.quantity_sold > 0) {
      onToast({
        message: `Impossible de supprimer ce pass : ${target.quantity_sold} billet(s) déjà vendu(s).`,
        type: 'error',
      });
      return;
    }
    if (tickets.length <= 1) {
      onToast({ message: 'Il faut au moins un pass pour l’événement', type: 'error' });
      return;
    }
    setTickets((prev) => prev.filter((_, i) => i !== index));
  };

  // Reschedule Action for Terminated Events
  const handleExecuteReschedule = () => {
    if (!rescheduleDate) {
      onToast({ message: 'Veuillez choisir une date future', type: 'error' });
      return;
    }
    const chosenStart = new Date(rescheduleDate);
    if (chosenStart.getTime() <= Date.now()) {
      onToast({ message: 'La date choisie doit être dans le futur', type: 'error' });
      return;
    }

    // Propose 4 hours duration
    const chosenEnd = new Date(chosenStart.getTime() + 4 * 3600 * 1000);
    setStartsAt(toLocalDateTimeInput(chosenStart.toISOString()));
    setEndsAt(toLocalDateTimeInput(chosenEnd.toISOString()));
    setStatus('published');
    setShowRescheduleModal(false);
    onToast({
      message: 'Nouvelle date programmée et statut remis en ligne ! Cliquez sur Enregistrer pour confirmer.',
      type: 'success',
    });
  };

  // Quick Action: Switch to Media Tab for Memoires / Aftermovie
  const handleOpenMemoriesMode = () => {
    setActiveTab('media');
    onToast({
      message: 'Mode Souvenirs : Téléchargez les photos du public et ajoutez votre aftermovie vidéo !',
      type: 'info',
    });
  };

  // Confirmation of Delete / Cancel
  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      if (deleteMode === 'cancel') {
        await cancelEvent(eventId);
        setStatus('cancelled');
        onToast({ message: 'Événement marqué comme annulé.', type: 'info' });
      } else {
        await deleteEvent(eventId);
        onToast({ message: 'Événement supprimé définitivement.', type: 'success' });
        window.dispatchEvent(new CustomEvent('gba-refresh-events'));
        onBack();
        return;
      }
      setShowDeleteModal(false);
      window.dispatchEvent(new CustomEvent('gba-refresh-events'));
    } catch {
      onToast({ message: 'Erreur lors de l’opération', type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      onToast({ message: 'Le titre est obligatoire', type: 'error' });
      setActiveTab('infos');
      return;
    }
    if (!startsAt) {
      onToast({ message: 'La date et l’heure de début sont requises', type: 'error' });
      setActiveTab('location_dates');
      return;
    }

    // Chronological validation
    if (endsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
      onToast({ message: 'La date de fin doit être postérieure à la date de début', type: 'error' });
      setActiveTab('location_dates');
      return;
    }

    // Ticket quota validation against sold tickets
    for (const tkt of tickets) {
      const total = Number(tkt.quantity_total) || 0;
      const sold = tkt.quantity_sold || 0;
      if (total < sold) {
        onToast({
          message: `Le quota pour "${tkt.label}" (${total}) ne peut pas être inférieur aux billets vendus (${sold})`,
          type: 'error',
        });
        setActiveTab('tickets');
        return;
      }
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

      // 3. Compute accurate minimum price (fixing Math.min 0 bug!)
      const numericPrices = tickets.map((t) => Number(t.price) || 0);
      const priceMin = numericPrices.length > 0 ? Math.min(...numericPrices) : 0;

      // 4. Format tickets payload
      const ticketPayload = tickets.map((t) => ({
        id: t.id,
        ticket_type: t.ticket_type,
        label: t.label.trim() || 'Billet Standard',
        price: Number(t.price) || 0,
        quantity_total: Number(t.quantity_total) || 100,
        description: t.description.trim() || undefined,
      }));

      // 5. Format collaborator payload
      const collabPayload = newCollabs.map((c) => ({
        user_id: c.user_id,
        role: c.role,
      }));

      const updated = await updateEventFull(
        eventId,
        {
          title: title.trim(),
          description: description.trim(),
          category,
          location_name: locationName.trim() || 'Lieu à définir',
          location_address: locationAddress.trim() || null,
          city,
          country,
          latitude,
          longitude,
          starts_at: new Date(startsAt).toISOString(),
          ends_at: endsAt ? new Date(endsAt).toISOString() : null,
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
        window.dispatchEvent(new CustomEvent('gba-refresh-events'));
        window.dispatchEvent(new CustomEvent('gba-event-updated', { detail: { event: updated } }));
        onToast({ message: 'Événement mis à jour avec succès !', type: 'success' });
        onSaved(updated);
      } else {
        window.dispatchEvent(new CustomEvent('gba-refresh-events'));
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

  const youtubeId = getYouTubeId(videoUrl);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FE] dark:bg-[#0D0B14]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#6600FF] animate-spin" />
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            Chargement de l'événement en cours...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-36 bg-[#F8F9FE] dark:bg-[#0D0B14] text-[#17131D] dark:text-white">
      {/* Top Bar iOS Apple Navigation */}
      <header className="sticky top-0 z-40 px-5 pt-safe-header pb-3.5 bg-white/90 dark:bg-[#12101F]/90 backdrop-blur-2xl border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/15 transition-colors cursor-pointer active:scale-95 shrink-0"
            aria-label="Retour"
          >
            <ChevronLeft className="w-5 h-5 text-[#17131D] dark:text-white" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-black tracking-tight leading-tight line-clamp-1">
              Modifier l'événement
            </h1>
            <p className="text-[11px] text-gray-400 font-medium line-clamp-1">
              {title || 'Sans titre'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
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
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-xl mx-auto px-5 pt-4 space-y-4">
        {/* BANNIÈRE SPÉCIALE : Événement terminé / Passé repensé */}
        {isTerminated && (
          <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/[0.12] via-purple-500/[0.08] to-indigo-500/[0.12] border border-amber-500/25 dark:border-amber-400/20 shadow-xs space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <CalendarCheck2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Événement passé / Archivé
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                    Terminé
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                  Cet événement s'est achevé. La billetterie est automatiquement clôturée. Vous pouvez publier les photos souvenirs & aftermovie, ou le reprogrammer pour une nouvelle date.
                </p>
              </div>
            </div>

            {/* Actions rapides pour événement terminé */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const nextSaturday = new Date();
                  nextSaturday.setDate(nextSaturday.getDate() + ((6 - nextSaturday.getDay() + 7) % 7 || 7));
                  nextSaturday.setHours(20, 0, 0, 0);
                  setRescheduleDate(toLocalDateTimeInput(nextSaturday.toISOString()));
                  setShowRescheduleModal(true);
                }}
                className="px-3.5 py-2.5 rounded-2xl bg-[#6600FF] hover:bg-[#5200cc] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-[#6600FF]/25 active:scale-95 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reprogrammer une édition</span>
              </button>

              <button
                type="button"
                onClick={handleOpenMemoriesMode}
                className="px-3.5 py-2.5 rounded-2xl bg-white dark:bg-white/10 hover:bg-black/5 text-[#17131D] dark:text-white border border-black/10 dark:border-white/10 text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Film className="w-3.5 h-3.5 text-[#6600FF]" />
                <span>Ajouter l'Aftermovie & Photos</span>
              </button>
            </div>
          </div>
        )}

        {/* Live Event Performance Summary Card (New Feature) */}
        <div className="p-4 rounded-3xl bg-white dark:bg-[#14121E] border border-black/[0.06] dark:border-white/[0.08] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#6600FF]" />
              Performances de l'événement
            </span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/20">
              En direct
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-2xl bg-gray-50/80 dark:bg-white/[0.03] border border-black/[0.03] dark:border-white/[0.04]">
              <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
                <Eye className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase">Vues</span>
              </div>
              <p className="text-sm sm:text-base font-black text-[#17131D] dark:text-white">
                {formatNumber(stats.views)}
              </p>
            </div>

            <div className="p-2.5 rounded-2xl bg-gray-50/80 dark:bg-white/[0.03] border border-black/[0.03] dark:border-white/[0.04]">
              <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
                <TicketIcon className="w-3.5 h-3.5 text-[#6600FF]" />
                <span className="text-[10px] font-bold uppercase">Billets</span>
              </div>
              <p className="text-sm sm:text-base font-black text-[#6600FF]">
                {stats.ticketsSold} <span className="text-[10px] text-gray-400 font-normal">/ {stats.capacity}</span>
              </p>
            </div>

            <div className="p-2.5 rounded-2xl bg-gray-50/80 dark:bg-white/[0.03] border border-black/[0.03] dark:border-white/[0.04]">
              <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[10px] font-bold uppercase">Ventes</span>
              </div>
              <p className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 truncate">
                {stats.revenue > 0 ? `${formatNumber(stats.revenue)} F` : '0 F'}
              </p>
            </div>
          </div>

          {/* Progress bar of ticket sales */}
          {stats.capacity > 0 && (
            <div className="mt-3 pt-2.5 border-t border-black/[0.04] dark:border-white/[0.05]">
              <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                <span className="text-gray-400">Remplissage de la salle</span>
                <span className="text-[#6600FF] font-black">{stats.progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#6600FF] to-purple-400 rounded-full transition-all duration-500"
                  style={{ width: `${stats.progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Segmented iOS Tabs */}
        <div className="flex gap-1 p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-2xl overflow-x-auto no-scrollbar border border-black/[0.04] dark:border-white/[0.06]">
          {[
            { id: 'infos' as Tab, label: 'Infos générales' },
            { id: 'location_dates' as Tab, label: 'Lieu & Dates' },
            { id: 'media' as Tab, label: 'Médias & Teaser' },
            { id: 'tickets' as Tab, label: 'Pass & Billets' },
            { id: 'collabs' as Tab, label: 'Artistes invités' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-[#6600FF] text-[#17131D] dark:text-white shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: INFOS */}
        {activeTab === 'infos' && (
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Titre de l'événement *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Lomé Afro-Beats Fest 2026"
                className="w-full px-4 py-3.5 bg-white dark:bg-[#1A1829] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl text-sm font-bold text-[#17131D] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40 shadow-xs"
              />
            </div>

            {/* Category: Corrected icons and values! */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Catégorie *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {EVENT_CATEGORIES.map((cat) => {
                  const isSelected = category === cat.value;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value as EventCategory)}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#6600FF] text-white border-[#6600FF] shadow-sm shadow-[#6600FF]/30 scale-[1.02]'
                          : 'bg-white dark:bg-[#1A1829] border-black/[0.07] dark:border-white/[0.08] text-gray-600 dark:text-gray-300 hover:border-black/20'
                      }`}
                    >
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-white/20 text-white' : 'bg-[#6600FF]/10 text-[#6600FF]'}`}>
                        {getCategoryIcon(cat.value)}
                      </div>
                      <span className="truncate w-full text-center">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lifecycle Status: All 4 statuses supported */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Statut du cycle de vie
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'published', label: 'Publié', desc: 'En ligne & réservable' },
                  { id: 'paused', label: 'En pause', desc: 'Ventes suspendues' },
                  { id: 'completed', label: 'Terminé', desc: 'Événement achevé' },
                  { id: 'cancelled', label: 'Annulé', desc: 'Signalé annulé' },
                ].map((st) => {
                  const isSelected = status === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStatus(st.id as EventStatus)}
                      className={`py-2.5 px-2 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? st.id === 'cancelled'
                            ? 'bg-red-600 text-white border-red-600 shadow-xs'
                            : st.id === 'completed'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : st.id === 'paused'
                            ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                            : 'bg-[#6600FF] text-white border-[#6600FF] shadow-xs'
                          : 'bg-white dark:bg-[#1A1829] border-black/[0.07] dark:border-white/[0.08] text-gray-600 dark:text-gray-300 hover:border-black/20'
                      }`}
                    >
                      <p className="text-xs font-black">{st.label}</p>
                      <p className={`text-[9.5px] mt-0.5 leading-tight ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                        {st.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Description détaillée du programme
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez le déroulement, les têtes d'affiche, le dress code, les commodités..."
                rows={5}
                className="w-full px-4 py-3.5 bg-white dark:bg-[#1A1829] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl text-sm text-[#17131D] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40 shadow-xs leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* TAB 2: LIEU & DATES */}
        {activeTab === 'location_dates' && (
          <div className="space-y-4">
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
                  placeholder="Ex: Palais des Congrès de Lomé"
                  className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-[#1A1829] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl text-sm font-semibold text-[#17131D] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40 shadow-xs"
                />
              </div>
            </div>

            {/* Location Address */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Adresse précise & repère
              </label>
              <input
                type="text"
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                placeholder="Ex: Boulevard de la Marina, en face du Ministère"
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
                  className="w-full px-4 py-3.5 bg-white dark:bg-[#1A1829] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl text-sm font-semibold text-[#17131D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40 shadow-xs cursor-pointer"
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
                  className="w-full px-4 py-3.5 bg-white dark:bg-[#1A1829] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl text-sm font-semibold text-[#17131D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40 shadow-xs cursor-pointer"
                >
                  {COUNTRIES.map((cty) => (
                    <option key={cty.code} value={cty.code}>
                      {cty.flag} {cty.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dates with validation */}
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
                Capacité totale du lieu (nombre de places)
              </label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="Ex: 1000"
                className="w-full px-4 py-3.5 bg-white dark:bg-[#1A1829] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl text-sm font-semibold text-[#17131D] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40 shadow-xs"
              />
            </div>
          </div>
        )}

        {/* TAB 3: MÉDIAS & TEASER */}
        {activeTab === 'media' && (
          <div className="space-y-4">
            {/* Cover Image */}
            <div className="p-4 rounded-3xl bg-white dark:bg-[#1A1829] border border-black/[0.07] dark:border-white/[0.08] shadow-xs space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Affiche / Couverture principale
              </label>
              {coverUrl ? (
                <div className="relative h-48 rounded-2xl overflow-hidden border border-black/[0.08]">
                  <img src={coverUrl} alt="Couverture" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md text-white text-xs font-bold hover:bg-black/90 flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                  >
                    <Upload className="w-3.5 h-3.5" /> Changer l'affiche
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="w-full h-36 border-2 border-dashed border-gray-300 dark:border-white/20 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-[#6600FF] transition-colors cursor-pointer"
                >
                  <ImagePlus className="w-8 h-8 text-gray-400" />
                  <span className="text-xs font-bold text-gray-500">Sélectionner une affiche</span>
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

            {/* Video Teaser / Aftermovie with live preview! */}
            <div className="p-4 rounded-3xl bg-white dark:bg-[#1A1829] border border-black/[0.07] dark:border-white/[0.08] shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-[#6600FF] dark:text-purple-300">
                <Video className="w-4 h-4" />
                <h3 className="text-sm font-bold text-[#17131D] dark:text-white">
                  Vidéo Teaser ou Aftermovie rétrospectif
                </h3>
              </div>
              <p className="text-xs text-gray-400">
                Collez un lien YouTube ou un fichier MP4 pour intégrer la bande-annonce ou les meilleurs moments de la soirée.
              </p>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/..."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-sm text-[#17131D] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40 shadow-xs"
              />

              {/* YouTube Preview Card */}
              {youtubeId && (
                <div className="rounded-2xl overflow-hidden border border-black/[0.08] bg-black/5 dark:bg-black/40">
                  <div className="relative aspect-video w-full">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
                      title="Aperçu de la vidéo"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  </div>
                  <div className="p-2.5 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Vidéo validée pour l'événement
                    </span>
                    <button
                      type="button"
                      onClick={() => setVideoUrl('')}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Gallery Images */}
            <div className="p-4 rounded-3xl bg-white dark:bg-[#1A1829] border border-black/[0.07] dark:border-white/[0.08] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-[#6600FF]" />
                  <h3 className="text-sm font-bold text-[#17131D] dark:text-white">
                    Photos de galerie ({galleryUrls.length + newGalleryFiles.length})
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
                  <div key={url} className="relative aspect-square rounded-2xl overflow-hidden border border-black/[0.08] group shadow-xs">
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
                  <div key={item.preview} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-[#6600FF] group shadow-xs">
                    <img src={item.preview} alt="Nouvelle" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-full bg-[#6600FF] text-[9px] font-black text-white">
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
                  className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 dark:border-white/20 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-[#6600FF] hover:border-[#6600FF] transition-colors cursor-pointer"
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-[#17131D] dark:text-white">
                  Types de billets & Tarification
                </h3>
                <p className="text-xs text-gray-400">
                  Définissez vos pass standards, VIP, tables et quotas.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddTicket}
                className="px-3.5 py-1.5 rounded-full bg-[#6600FF] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-[#6600FF]/30 cursor-pointer active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Nouveau Pass
              </button>
            </div>

            {isTerminated && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 font-medium flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>Billetterie clôturée : cet événement est passé. Reprogrammez une nouvelle date pour rouvrir les ventes.</span>
              </div>
            )}

            <div className="space-y-3">
              {tickets.map((tkt, idx) => {
                const total = Number(tkt.quantity_total) || 0;
                const sold = tkt.quantity_sold || 0;
                const remaining = Math.max(0, total - sold);

                return (
                  <div
                    key={tkt.id || idx}
                    className="p-4 rounded-3xl bg-white dark:bg-[#1A1829] border border-black/[0.08] dark:border-white/[0.08] shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-xl bg-[#6600FF]/10 text-[#6600FF] flex items-center justify-center font-black text-xs">
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
                          className="px-3 py-1.5 bg-gray-100 dark:bg-white/[0.08] rounded-xl text-xs font-bold focus:outline-none cursor-pointer"
                        >
                          <option value="free">Gratuit</option>
                          <option value="standard">Standard</option>
                          <option value="vip">VIP</option>
                          <option value="vvip">VVIP / Table</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        {tkt.quantity_sold !== undefined && (
                          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                            {sold} vendu{sold > 1 ? 's' : ''} · <strong className="text-emerald-600 dark:text-emerald-400">{remaining} restant{remaining > 1 ? 's' : ''}</strong>
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
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.06] rounded-xl text-xs font-bold text-[#17131D] dark:text-white focus:ring-1 focus:ring-[#6600FF]"
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
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.06] rounded-xl text-xs font-bold text-[#17131D] dark:text-white focus:ring-1 focus:ring-[#6600FF]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                          Quota total (places)
                        </label>
                        <input
                          type="number"
                          value={tkt.quantity_total}
                          min={tkt.quantity_sold || 0}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTickets((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, quantity_total: val } : item))
                            );
                          }}
                          placeholder="100"
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.06] rounded-xl text-xs font-bold text-[#17131D] dark:text-white focus:ring-1 focus:ring-[#6600FF]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                        Inclusions & Avantages
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
                        placeholder="Ex: Entrée coupe-file, boisson offerte, espace salon lounge..."
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.06] rounded-xl text-xs text-[#17131D] dark:text-white focus:ring-1 focus:ring-[#6600FF]"
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
          <div className="space-y-4">
            <div className="p-4 rounded-3xl bg-white dark:bg-[#1A1829] border border-black/[0.07] dark:border-white/[0.08] shadow-xs space-y-3">
              <h3 className="text-sm font-black text-[#17131D] dark:text-white">
                Associer des artistes & co-organisateurs
              </h3>
              <p className="text-xs text-gray-400">
                Les artistes associés apparaîtront officiellement sur l'affiche et dans les recherches.
              </p>

              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={artistSearch}
                  onChange={(e) => setArtistSearch(e.target.value)}
                  placeholder="Rechercher un artiste par son nom..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40"
                />
              </div>

              {artistResults.length > 0 && (
                <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08] max-h-48 overflow-y-auto border border-black/[0.06] dark:border-white/[0.08] rounded-2xl">
                  {artistResults.map((art) => (
                    <div
                      key={art.id}
                      className="p-3 flex items-center justify-between hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={art.photo_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100'}
                          alt={art.name}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                        <div>
                          <p className="text-xs font-bold text-[#17131D] dark:text-white">{art.name}</p>
                          <p className="text-[10px] text-gray-400">{art.genres?.join(', ') || 'Artiste'}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddArtistCollab(art)}
                        className="px-3 py-1.5 rounded-full bg-[#6600FF] text-white text-[11px] font-bold hover:bg-[#5200cc] cursor-pointer active:scale-95 transition-all"
                      >
                        + Associer
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Associated Collabs with Delete capability */}
              <div className="pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Artistes et collaborateurs confirmés ({existingCollabs.length + newCollabs.length})
                </h4>
                <div className="space-y-2">
                  {existingCollabs.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-2xl bg-gray-50 dark:bg-white/[0.04] flex items-center justify-between border border-black/[0.04]"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#6600FF]/10 text-[#6600FF] flex items-center justify-center font-bold text-xs">
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#17131D] dark:text-white">
                            {c.profile?.name || c.artist?.name || 'Artiste confirmé'}
                          </p>
                          <span className="text-[9.5px] font-bold text-[#6600FF]">
                            {c.role === 'performer' ? 'Artiste invité' : 'Co-organisateur'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingCollab(c.id, c.user_id)}
                        className="w-7 h-7 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center justify-center transition-colors cursor-pointer"
                        title="Retirer ce collaborateur"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {newCollabs.map((c, i) => (
                    <div
                      key={c.user_id}
                      className="p-3 rounded-2xl bg-[#6600FF]/5 flex items-center justify-between border border-[#6600FF]/20"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#6600FF] text-white flex items-center justify-center font-bold text-xs">
                          <Plus className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#17131D] dark:text-white">
                            {c.name}
                          </p>
                          <span className="text-[9.5px] font-bold text-[#6600FF]">
                            En attente d'enregistrement
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewCollabs((prev) => prev.filter((_, idx) => idx !== i))}
                        className="w-7 h-7 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center justify-center cursor-pointer"
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

        {/* Bottom Actions: Danger zone (Cancel / Delete) */}
        <div className="pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">Options avancées</span>
            <button
              type="button"
              onClick={() => {
                setDeleteMode('cancel');
                setShowDeleteModal(true);
              }}
              className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Annuler ou supprimer l'événement</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL : Reprogrammer une nouvelle édition pour un événement terminé */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-5">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#1A1829] border border-black/10 dark:border-white/10 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#6600FF]">
                <CalendarClock className="w-5 h-5" />
                <h3 className="text-base font-black text-[#17131D] dark:text-white">
                  Reprogrammer l'événement
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRescheduleModal(false)}
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Choisissez la nouvelle date de début pour cet événement. Le statut sera automatiquement remis à <strong>"Publié"</strong> et les réservations réactivées.
            </p>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                Nouvelle Date & Heure
              </label>
              <input
                type="datetime-local"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-sm font-bold text-[#17131D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6600FF]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRescheduleModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-xs font-bold hover:bg-black/5 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleExecuteReschedule}
                className="flex-1 py-2.5 rounded-xl bg-[#6600FF] text-white text-xs font-bold hover:bg-[#5200cc] shadow-sm shadow-[#6600FF]/30 cursor-pointer"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL : Suppression / Annulation */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-5">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#1A1829] border border-black/10 dark:border-white/10 p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-base font-black text-[#17131D] dark:text-white">
                Gestion du statut
              </h3>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Que souhaitez-vous faire avec cet événement ?
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setDeleteMode('cancel')}
                className={`w-full p-3 rounded-2xl border text-left transition-all ${
                  deleteMode === 'cancel'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                    : 'border-black/[0.08] dark:border-white/[0.08]'
                }`}
              >
                <p className="text-xs font-black">Marquer comme Annulé (Recommandé)</p>
                <p className="text-[10px] text-gray-400">
                  Conserve l'historique et prévient les acheteurs d'un remboursement.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setDeleteMode('delete')}
                className={`w-full p-3 rounded-2xl border text-left transition-all ${
                  deleteMode === 'delete'
                    ? 'border-red-600 bg-red-600/10 text-red-900 dark:text-red-200'
                    : 'border-black/[0.08] dark:border-white/[0.08]'
                }`}
              >
                <p className="text-xs font-black text-red-600">Supprimer définitivement</p>
                <p className="text-[10px] text-gray-400">
                  Supprime l'événement de la base de données.
                </p>
              </button>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-xs font-bold hover:bg-black/5 cursor-pointer"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Traitement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
