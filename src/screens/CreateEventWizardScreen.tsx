import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Briefcase,
  Building2,
  Calendar,
  Check,
  ChevronLeft,
  Clock,
  ExternalLink,
  Eye,
  Flame,
  Heart,
  ImagePlus,
  Info,
  Layers,
  Loader2,
  MapPin,
  MessageCircle,
  Music2,
  Navigation,
  Palette,
  Plus,
  Search,
  Smartphone,
  Sparkles,
  Ticket as TicketIcon,
  Trash2,
  Trophy,
  X,
  type LucideIcon,
} from 'lucide-react';
import { EventOptionalSteps, type LiveItem, type ScheduleItem, type SponsorItem } from '@/components/EventOptionalSteps';
import { useApp } from '@/hooks/useApp';
import { CITIES, COUNTRIES } from '@/constants';
import {
  MAIN_CATEGORIES,
  getMainCategoryById,
  getSubcategoryById,
} from '@/constants/categories';
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
import type { Artist, Event, EventCategory, EventAccessType, Organization } from '@/types';
import type { MainCategoryId, SubCategoryId } from '@/constants/categories';
import type { ToastData } from '@/components/Toast';
import { EventPreviewModal } from '@/components/EventPreviewModal';
import { EventCard } from '@/components/EventCard';
import { getDefaultEventCover } from '@/utils/defaultImages';

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
const STEP_TRANSLATION_KEYS: Record<Step, string> = {
  Infos: 'infos',
  'Lieu & Dates': 'locationDates',
  Photos: 'photos',
  Billets: 'tickets',
  Collaborateurs: 'collaborators',
  Programme: 'program',
  Live: 'live',
  Sponsors: 'sponsors',
  Confirmation: 'confirmation',
};

const fieldClass =
  'w-full max-w-full min-w-0 box-border px-4 py-3.5 bg-white dark:bg-[#1A1829] border border-black/[0.07] dark:border-white/[0.08] rounded-2xl text-[#171726] dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40 text-sm font-medium transition-all shadow-xs';

const WIZARD_CATEGORY_ICONS: Record<string, LucideIcon> = {
  Palette,
  Briefcase,
  Flame,
  Trophy,
  Heart,
  Sparkles,
};

const categoryChipClass = (selected: boolean) =>
  [
    'inline-flex min-h-11 shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-xs font-bold',
    'transition-colors motion-reduce:transition-none active:scale-[0.98] motion-reduce:active:scale-100 cursor-pointer',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#14121E]',
    selected
      ? 'bg-[#6600FF] text-white shadow-[0_6px_18px_rgba(102,0,255,0.22)]'
      : 'border border-black/[0.05] bg-black/[0.03] text-gray-700 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-gray-200',
  ].join(' ');

function getSplitDateTime(val: string) {
  if (!val) return { date: '', time: '' };
  const parts = val.split('T');
  return { date: parts[0] || '', time: parts[1] ? parts[1].slice(0, 5) : '' };
}

function formatFriendlyDateTime(val: string, language: string) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Pays associé aux villes proposées (aucune coordonnée GPS fictive du lieu).
const CITY_COUNTRIES: Record<string, string> = {
  Lomé: 'TG',
  Cotonou: 'BJ',
  Abidjan: 'CI',
  Accra: 'GH',
  Dakar: 'SN',
  Bamako: 'ML',
};

function getErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('row-level security')) return "Vous n'avez pas la permission de créer cet événement.";
  if (message.includes('duplicate key')) return 'Un événement similaire existe déjà.';
  if (message.includes('foreign key')) return 'Une des références est invalide.';
  return message || 'La création de l’événement a échoué.';
}

export function CreateEventWizardScreen({ onBack, onCreated, onToast }: Props) {
  const { user, t, language } = useApp();
  const [step, setStep] = useState<Step>('Infos');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Main Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'concert' as EventCategory,
    main_category: 'cultural_artistic' as MainCategoryId,
    subcategory: 'concerts_spectacles' as SubCategoryId,
    location_name: '',
    location_address: '',
    city: 'Lomé',
    country: 'TG',
    latitude: null as number | null,
    longitude: null as number | null,
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

  // Advanced Ticketing / Access modes state
  const [accessType, setAccessType] = useState<EventAccessType>('tickets');
  const [unlimitedCapacity, setUnlimitedCapacity] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [externalTicketUrl, setExternalTicketUrl] = useState('');

  // Preview state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [confirmationTab, setConfirmationTab] = useState<'summary' | 'card' | 'page'>('summary');

  // Tickets state (for Gbaigbance native ticketing)
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
  const collabSearchRequestRef = useRef(0);
  const stepIndex = STEPS.indexOf(step);
  const configuredTicketCount = tickets.filter((ticket) => ticket.label.trim()).length;
  const configuredTicketQuantity = tickets.reduce((total, ticket) => {
    if (!ticket.label.trim()) return total;
    const quantity = Number(ticket.quantity_total);
    return total + (Number.isInteger(quantity) && quantity > 0 ? quantity : 0);
  }, 0);
  const configuredTicketPrices = tickets
    .filter((ticket) => ticket.label.trim() && ticket.price.trim() !== '' && Number.isFinite(Number(ticket.price)) && Number(ticket.price) >= 0)
    .map((ticket) => Number(ticket.price));
  const lowestTicketPrice = configuredTicketPrices.length > 0 ? Math.min(...configuredTicketPrices) : null;
  const phaseIndex = stepIndex < 3 ? 0 : stepIndex < 5 ? 1 : 2;
  const phaseKeys = ['presentation', 'setup', 'publishing'];
  const locationSearchQuery = [
    form.location_name,
    form.location_address,
    form.city,
    COUNTRIES.find((country) => country.code === form.country)?.name,
  ].filter(Boolean).join(', ');
  const locationSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationSearchQuery)}`;

  // Computed preview event for real-time live preview
  const previewEvent: Event = useMemo(() => {
    const validTickets = tickets.filter((t) => t.label.trim()).map((t) => ({ price: Number(t.price) || 0 }));
    const priceMin = accessType === 'free'
      ? 0
      : accessType === 'whatsapp' || accessType === 'external'
      ? Number(tickets[0]?.price) || 0
      : validTickets.length > 0
      ? Math.min(...validTickets.map((t) => t.price))
      : 0;

    return {
      id: 'preview-current-wizard',
      title: form.title.trim() || 'Titre de votre événement',
      description: form.description.trim() || 'Description détaillée de votre événement...',
      category: form.category,
      main_category: form.main_category,
      subcategory: form.subcategory,
      location_name: form.location_name.trim() || 'Lieu de l’événement',
      location_address: form.location_address.trim() || null,
      city: form.city.trim() || 'Lomé',
      country: form.country || 'TG',
      latitude: form.latitude,
      longitude: form.longitude,
      starts_at: form.starts_at || new Date().toISOString(),
      ends_at: form.ends_at || null,
      price_min: priceMin,
      price_max: null,
      currency: 'XOF',
      capacity: unlimitedCapacity ? null : (form.capacity ? Number(form.capacity) : null),
      attendees_count: 0,
      organizer_id: null,
      organizer_user_id: user?.id || null,
      status: 'published',
      cover_url: coverPreview || form.cover_url || getDefaultEventCover(),
      images: galleryFiles.map((g) => g.preview),
      video_url: form.video_url.trim() || null,
      access_type: accessType,
      whatsapp_number: whatsappNumber.trim() || null,
      whatsapp_message: whatsappMessage.trim() || null,
      external_ticket_url: externalTicketUrl.trim() || null,
      unlimited_capacity: unlimitedCapacity,
      is_featured: false,
      likes_count: 0,
      views_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }, [form, tickets, accessType, unlimitedCapacity, whatsappNumber, whatsappMessage, externalTicketUrl, coverPreview, galleryFiles, user]);

  // Auto-search collaborators ciblé selon le rôle actif (artiste ou co-organisateur réel)
  useEffect(() => {
    const requestId = ++collabSearchRequestRef.current;
    const query = collabSearch.trim();
    if (!query) {
      setResults({ artists: [], orgs: [] });
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = window.setTimeout(() => {
      const request = collabRole === 'performer'
        ? searchArtists(query).then((artists) => ({ artists: artists.filter((artist) => Boolean(artist.user_id)), orgs: [] }))
        : searchOrganizations(query).then((orgs) => ({ artists: [], orgs: orgs.filter((organization) => Boolean(organization.owner_id)) }));
      request.then((nextResults) => {
        if (collabSearchRequestRef.current === requestId) setResults(nextResults);
      }).catch(() => {
        if (collabSearchRequestRef.current === requestId) setResults({ artists: [], orgs: [] });
      }).finally(() => {
        if (collabSearchRequestRef.current === requestId) setSearching(false);
      });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      if (collabSearchRequestRef.current === requestId) collabSearchRequestRef.current += 1;
    };
  }, [collabSearch, collabRole]);

  const updateForm = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleCityChange = (cityName: string) => {
    const country = CITY_COUNTRIES[cityName];
    setForm((curr) => ({
      ...curr,
      city: cityName,
      country: country || curr.country,
      // Un changement de ville invalide les coordonnées du lieu précédent.
      latitude: null,
      longitude: null,
    }));
  };

  const currentMainDef = getMainCategoryById(form.main_category);
  const activeSubcategories = currentMainDef ? currentMainDef.subcategories : [];
  const currentSubDef = getSubcategoryById(form.subcategory);

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

      const startDate = new Date(form.starts_at);
      const endDate = form.ends_at ? new Date(form.ends_at) : null;
      if (Number.isNaN(startDate.getTime())) {
        setError('La date et l’heure de début sont invalides.');
        return false;
      }
      if (endDate && (Number.isNaN(endDate.getTime()) || endDate <= startDate)) {
        setError('La fin de l’événement doit être postérieure à son début.');
        return false;
      }
    }
    if (step === 'Programme') {
      const invalidSlot = scheduleItems.find((item) => {
        if (!item.title.trim() || !item.start_time) return false;
        const start = new Date(item.start_time);
        const end = item.end_time ? new Date(item.end_time) : null;
        return Number.isNaN(start.getTime()) || (end !== null && (Number.isNaN(end.getTime()) || end <= start));
      });
      if (invalidSlot) {
        setError('Vérifiez les horaires du programme : la fin doit être postérieure au début.');
        return false;
      }
    }
    if (step === 'Live' && isLiveEvent) {
      const invalidLink = liveItems.find((item) => {
        if (!item.url.trim()) return false;
        try {
          const url = new URL(item.url.trim());
          return url.protocol !== 'https:' && url.protocol !== 'http:';
        } catch { return true; }
      });
      if (invalidLink) {
        setError('Un lien de diffusion est invalide. Utilisez une URL commençant par https:// ou http://.');
        return false;
      }
    }
    if (step === 'Sponsors') {
      const invalidSponsor = sponsorItems.find((item) => [item.website_url, item.logo_url].some((value) => {
        if (!value.trim()) return false;
        try {
          const url = new URL(value.trim());
          return url.protocol !== 'https:' && url.protocol !== 'http:';
        } catch { return true; }
      }));
      if (invalidSponsor) {
        setError('Vérifiez les liens du sponsor : seules les URL http:// et https:// sont acceptées.');
        return false;
      }
    }
    if (step === 'Billets') {
      if (accessType === 'whatsapp') {
        const phoneDigits = whatsappNumber.replace(/\D/g, '');
        if (phoneDigits.length < 8 || phoneDigits.length > 15) {
          setError('Veuillez renseigner un numéro WhatsApp valide (8 à 15 chiffres).');
          return false;
        }
      }
      if (accessType === 'external') {
        if (!externalTicketUrl.trim()) {
          setError('Veuillez renseigner l’URL du site dédié ou de la billetterie externe.');
          return false;
        }
        try {
          const ticketUrl = new URL(externalTicketUrl.trim());
          if (ticketUrl.protocol !== 'http:' && ticketUrl.protocol !== 'https:') throw new Error('Invalid protocol');
        } catch {
          setError('Veuillez saisir une URL valide commençant par https:// ou http://.');
          return false;
        }
      }
      if (!unlimitedCapacity) {
        const capacity = Number(form.capacity);
        if (!Number.isInteger(capacity) || capacity < 1) {
          setError('Veuillez définir une capacité totale valide.');
          return false;
        }
      }
      if (accessType === 'tickets') {
        const configuredTickets = tickets.filter((ticket) => ticket.label.trim());
        if (configuredTickets.length === 0) {
          setError('Veuillez configurer au moins un type de billet.');
          return false;
        }
        const hasInvalidTicket = configuredTickets.some((ticket) => {
          const price = Number(ticket.price);
          const quantity = Number(ticket.quantity_total);
          return (
            ticket.price.trim() === '' ||
            ticket.quantity_total.trim() === '' ||
            !Number.isFinite(price) ||
            price < 0 ||
            !Number.isInteger(quantity) ||
            quantity < 1 ||
            (ticket.ticket_type === 'free' && price !== 0)
          );
        });
        if (hasInvalidTicket) {
          setError('Chaque billet doit avoir un prix valide et une quantité entière supérieure à zéro. Un billet gratuit doit avoir un prix de 0 FCFA.');
          return false;
        }
        if (!unlimitedCapacity) {
          const totalQuantity = configuredTickets.reduce((sum, ticket) => sum + Number(ticket.quantity_total), 0);
          if (totalQuantity > Number(form.capacity)) {
            setError('La quantité totale des billets dépasse la capacité de l’événement.');
            return false;
          }
        }
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

      const validTickets = accessType === 'tickets'
        ? tickets
            .filter((ticket) => ticket.label.trim() && ticket.quantity_total)
            .map((ticket) => ({
              ticket_type: ticket.ticket_type,
              label: ticket.label.trim(),
              price: Math.max(0, Number(ticket.price) || 0),
              quantity_total: Math.max(1, Number(ticket.quantity_total) || 1),
              description: ticket.description || undefined,
            }))
        : [];

      const calculatedPriceMin = accessType === 'free'
        ? 0
        : accessType === 'tickets'
        ? (validTickets.length ? Math.min(...validTickets.map((t) => t.price)) : 0)
        : Math.max(0, Number(tickets[0]?.price) || 0);

      const event = await createEventWithCollaborators(
        {
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category,
          main_category: form.main_category,
          subcategory: form.subcategory,
          location_name: form.location_name.trim(),
          location_address: form.location_address.trim() || null,
          city: form.city.trim(),
          country: form.country,
          latitude: form.latitude,
          longitude: form.longitude,
          starts_at: form.starts_at,
          ends_at: form.ends_at || null,
          price_min: calculatedPriceMin,
          cover_url: coverUrl,
          images: uploadedGalleryUrls,
          video_url: form.video_url.trim() || null,
          capacity: unlimitedCapacity ? null : (form.capacity ? Math.max(1, Number(form.capacity)) : null),
          created_by_role: user.role === 'artist' ? 'artist' : 'organizer',
          access_type: accessType,
          whatsapp_number: whatsappNumber.trim() || null,
          whatsapp_message: whatsappMessage.trim() || null,
          external_ticket_url: externalTicketUrl.trim() || null,
          unlimited_capacity: unlimitedCapacity,
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
      window.dispatchEvent(new CustomEvent('gba-refresh-events'));
      window.dispatchEvent(new CustomEvent('gba-event-created', { detail: { event } }));
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
            onToast({ message: t('events', 'creation.wizard.photos.coverTooLarge'), type: 'error' });
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
      <header className="sticky top-0 z-30 px-5 pt-safe-header pb-4 bg-white/80 dark:bg-[#14121E]/80 backdrop-blur-xl border-b border-black/[0.05] dark:border-white/[0.08]">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                if (stepIndex > 0) {
                  previous();
                } else {
                  onBack();
                }
              }}
              aria-label={t('common', 'back')}
              className="w-10 h-10 rounded-full glass-surface flex items-center justify-center active:scale-95 transition-transform shrink-0 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 text-[#171726] dark:text-white" />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#6600FF] dark:text-[#A78BFA] font-black">
                {t('events', 'creation.wizard.eyebrow')}
              </p>
              <h1 className="text-lg font-extrabold text-[#171726] dark:text-white truncate">
                {t('events', `creation.wizard.steps.${STEP_TRANSLATION_KEYS[step]}`)}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('events', 'creation.wizard.stepIndicator').replace('{current}', String(stepIndex + 1)).replace('{total}', String(STEPS.length))}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="px-3.5 py-2 rounded-full bg-[#6600FF]/10 hover:bg-[#6600FF]/20 text-[#6600FF] dark:text-purple-300 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shrink-0 cursor-pointer shadow-xs"
            title={t('events', 'creation.wizard.previewTitle')}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{t('events', 'creation.wizard.preview')}</span>
          </button>
        </div>

        {/* Progression par grandes phases */}
        <div className="max-w-md mx-auto mt-4 grid grid-cols-3 gap-2">
          {phaseKeys.map((phase, index) => (
            <div key={phase} className={`min-w-0 text-center text-[10px] font-bold transition-colors ${index === phaseIndex ? 'text-[#6600FF] dark:text-purple-300' : index < phaseIndex ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-600'}`}>
              <span className={`mx-auto mb-1 flex h-1.5 w-full rounded-full ${index <= phaseIndex ? 'bg-[#6600FF] dark:bg-purple-400' : 'bg-gray-200 dark:bg-white/10'}`} />
              <span className="block truncate">{t('events', `creation.wizard.phases.${phase}`)}</span>
            </div>
          ))}
        </div>

        {/* Progress Bar détaillée des neuf étapes */}
        <div className="max-w-md mx-auto mt-2 flex gap-1.5">
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
            {/* Couverture immersive — accès direct dès la première étape */}
            <div className="relative isolate overflow-hidden rounded-[26px] border border-black/[0.06] dark:border-white/[0.08] bg-gradient-to-br from-[#25134B] via-[#4B1BB8] to-[#9D3BCB] shadow-lg shadow-[#6600FF]/10">
              {coverPreview ? (
                <img src={coverPreview} alt={t('events', 'creation.wizard.photos.coverAlt')} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 opacity-25" aria-hidden="true">
                  <div className="absolute -right-8 -top-12 h-48 w-48 rounded-full border-[28px] border-white/30" />
                  <div className="absolute -bottom-20 -left-8 h-52 w-52 rounded-full border-[24px] border-white/20" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#171126]/90 via-[#171126]/25 to-black/10" />
              <div className="relative flex min-h-[190px] flex-col justify-between p-4 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/70">{t('events', 'creation.wizard.info.coverTitle')}</p>
                    <p className="mt-1 max-w-[230px] text-xs leading-relaxed text-white/80">{t('events', 'creation.wizard.info.coverSubtitle')}</p>
                  </div>
                  <span className="rounded-full border border-white/20 bg-black/20 px-2.5 py-1 text-[10px] font-semibold backdrop-blur-md">{t('events', 'creation.wizard.photos.coverMaxSize')}</span>
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-extrabold">{form.title || t('events', 'creation.wizard.info.eventTitlePlaceholder')}</p>
                    <p className="mt-0.5 text-xs text-white/75">{t('events', 'creation.wizard.info.coverTitle')}</p>
                  </div>
                  <button type="button" onClick={() => coverInputRef.current?.click()} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-white px-4 text-xs font-extrabold text-[#4B1BB8] shadow-lg transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#4B1BB8]">
                    <ImagePlus className="h-4 w-4" />
                    {coverPreview ? t('events', 'creation.wizard.info.coverChange') : t('events', 'creation.wizard.info.coverAction')}
                  </button>
                </div>
              </div>
            </div>

            <div className="card space-y-3 p-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                {t('events', 'creation.wizard.info.eventTitle')}
              </label>
              <input
                className={fieldClass}
                value={form.title}
                onChange={(e) => updateForm('title', e.target.value)}
                placeholder={t('events', 'creation.wizard.info.eventTitlePlaceholder')}
              />
              </div>
            </div>

            <div className="card space-y-3 p-4">
              <div>
              <p id="wizard-main-category" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('events', 'creation.wizard.info.mainCategory')}
              </p>
              <div
                role="radiogroup"
                aria-labelledby="wizard-main-category"
                className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 no-scrollbar"
              >
                {MAIN_CATEGORIES.map((main) => {
                  const Icon = WIZARD_CATEGORY_ICONS[main.iconName] || Palette;
                  const selected = form.main_category === main.id;
                  return (
                    <button
                      key={main.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        const firstSub = main.subcategories[0];
                        setForm((prev) => ({
                          ...prev,
                          main_category: main.id,
                          subcategory: firstSub ? firstSub.id : prev.subcategory,
                          category: firstSub ? firstSub.defaultLegacyCategory : prev.category,
                        }));
                      }}
                      className={categoryChipClass(selected)}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{t('events', `explore.search.mainCategoriesLabels.${main.id}`)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p id="wizard-subcategory" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('events', 'creation.wizard.info.subcategory')}
              </p>
              <div
                role="radiogroup"
                aria-labelledby="wizard-subcategory"
                className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 no-scrollbar"
              >
                {activeSubcategories.map((sub) => {
                  const selected = form.subcategory === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          subcategory: sub.id,
                          category: sub.defaultLegacyCategory,
                        }));
                      }}
                      className={categoryChipClass(selected)}
                    >
                      {t('events', `explore.search.subcategoriesLabels.${sub.id}`)}
                    </button>
                  );
                })}
              </div>
              {currentSubDef && (
                <p className="mt-2 text-xs leading-relaxed text-gray-600 dark:text-gray-300 bg-purple-500/[0.04] dark:bg-white/[0.04] border border-purple-500/10 dark:border-white/10 rounded-xl p-2.5">
                  <span className="font-semibold text-gray-900 dark:text-white">{t('events', `explore.search.subcategoriesLabels.${currentSubDef.id}`)}.</span> {currentSubDef.description}
                </p>
              )}
              </div>
            </div>

            <div className="card space-y-3 p-4">
              <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                {t('events', 'creation.wizard.info.description')}
              </label>
              <textarea
                className={`${fieldClass} min-h-32 resize-none`}
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                placeholder={t('events', 'creation.wizard.info.descriptionPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                {t('events', 'creation.wizard.info.capacity')}
              </label>
              <input
                type="number"
                min="1"
                className={fieldClass}
                value={form.capacity}
                onChange={(e) => updateForm('capacity', e.target.value)}
                placeholder={t('events', 'creation.wizard.info.capacityPlaceholder')}
              />
              </div>
            </div>
          </section>
        )}

        {/* STEP 2: LIEU & DATES (ENHANCED LOCATION) */}
        {step === 'Lieu & Dates' && (
          <section className="space-y-4 animate-slide-up">
            <div className="card p-4 space-y-3.5">
              <div className="flex items-center gap-2 text-[#6600FF] dark:text-purple-300">
                <MapPin className="w-4 h-4" />
                <h3 className="text-sm font-bold text-[#17131D] dark:text-white">{t('events', 'creation.wizard.location.heading')}</h3>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                  {t('events', 'creation.wizard.location.venue')}
                </label>
                <input
                  className={fieldClass}
                  value={form.location_name}
                  onChange={(e) => setForm((curr) => ({
                    ...curr,
                    location_name: e.target.value,
                    latitude: null,
                    longitude: null,
                  }))}
                  placeholder={t('events', 'creation.wizard.location.venuePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                  {t('events', 'creation.wizard.location.address')}
                </label>
                <input
                  className={fieldClass}
                  value={form.location_address}
                  onChange={(e) => setForm((curr) => ({
                    ...curr,
                    location_address: e.target.value,
                    latitude: null,
                    longitude: null,
                  }))}
                  placeholder={t('events', 'creation.wizard.location.addressPlaceholder')}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                    {t('events', 'creation.wizard.location.city')}
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
                    {t('events', 'creation.wizard.location.country')}
                  </label>
                  <select
                    className={fieldClass}
                    value={form.country}
                    onChange={(e) => setForm((curr) => ({
                      ...curr,
                      country: e.target.value,
                      latitude: null,
                      longitude: null,
                    }))}
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
                    {t('events', 'creation.wizard.location.gps')}
                  </span>
                  <button
                    type="button"
                    onClick={handleLocateMe}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#6600FF] dark:text-purple-300 hover:underline cursor-pointer"
                  >
                    <Navigation className="w-3 h-3" /> {t('events', 'creation.wizard.location.currentPosition')}
                  </button>
                </div>
                <p className="mb-2 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                  {t('events', 'creation.wizard.location.gpsHint')}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-between">
                    <span className="text-gray-400">{t('events', 'creation.wizard.location.latitude')}</span>
                    <span className="font-bold text-[#17131D] dark:text-white tabular-nums">
                      {form.latitude ?? '—'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-between">
                    <span className="text-gray-400">{t('events', 'creation.wizard.location.longitude')}</span>
                    <span className="font-bold text-[#17131D] dark:text-white tabular-nums">
                      {form.longitude ?? '—'}
                    </span>
                  </div>
                </div>
                {locationSearchQuery.trim() && (
                  <a
                    href={locationSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#6600FF]/15 bg-[#6600FF]/[0.06] px-4 text-xs font-bold text-[#6600FF] transition-colors hover:bg-[#6600FF]/[0.1] dark:border-purple-400/20 dark:bg-purple-400/[0.08] dark:text-purple-300"
                  >
                    <MapPin className="h-4 w-4" />
                    {t('events', 'creation.wizard.location.verifyOnMap')}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Dates & Horaires (Entièrement responsives, anti-dépassement, style Apple) */}
            <div className="card p-4 space-y-4 w-full max-w-full min-w-0 overflow-hidden box-border">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#17131D] dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#6600FF] dark:text-purple-300" />
                  <span>{t('events', 'creation.wizard.location.dates')}</span>
                </h3>
                {form.starts_at && (
                  <span className="text-[11px] font-semibold text-[#6600FF] dark:text-purple-300 bg-[#6600FF]/10 dark:bg-[#6600FF]/20 px-2 py-0.5 rounded-full">
                    {formatFriendlyDateTime(form.starts_at, language)}
                  </span>
                )}
              </div>

              {/* Début de l'événement */}
              <div className="space-y-2 w-full max-w-full min-w-0">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  {t('events', 'creation.wizard.location.start')}
                </label>

                <div className="grid grid-cols-2 gap-2 w-full max-w-full min-w-0 box-border">
                  <div className="relative min-w-0">
                    <input
                      type="date"
                      className={`${fieldClass} text-xs py-3 px-3`}
                      value={getSplitDateTime(form.starts_at).date}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        const currTime = getSplitDateTime(form.starts_at).time || '20:00';
                        updateForm('starts_at', newDate ? `${newDate}T${currTime}` : '');
                      }}
                    />
                  </div>
                  <div className="relative min-w-0">
                    <input
                      type="time"
                      className={`${fieldClass} text-xs py-3 px-3`}
                      value={getSplitDateTime(form.starts_at).time || '20:00'}
                      onChange={(e) => {
                        const newTime = e.target.value || '20:00';
                        const currDate = getSplitDateTime(form.starts_at).date || new Date().toISOString().split('T')[0];
                        updateForm('starts_at', `${currDate}T${newTime}`);
                      }}
                    />
                  </div>
                </div>

                {/* Raccourcis rapides */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-gray-400 font-medium mr-1">{t('events', 'creation.wizard.location.suggestions')}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const y = today.getFullYear();
                      const m = String(today.getMonth() + 1).padStart(2, '0');
                      const d = String(today.getDate()).padStart(2, '0');
                      updateForm('starts_at', `${y}-${m}-${d}T20:00`);
                    }}
                    className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-[#6600FF]/10 text-[10px] font-semibold text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                  >
                    {t('events', 'creation.wizard.location.tonight')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      const y = tomorrow.getFullYear();
                      const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
                      const d = String(tomorrow.getDate()).padStart(2, '0');
                      updateForm('starts_at', `${y}-${m}-${d}T20:00`);
                    }}
                    className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-[#6600FF]/10 text-[10px] font-semibold text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                  >
                    {t('events', 'creation.wizard.location.tomorrow')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const day = now.getDay();
                      const diff = (6 - day + 7) % 7 || 7;
                      const saturday = new Date(now);
                      saturday.setDate(now.getDate() + diff);
                      const y = saturday.getFullYear();
                      const m = String(saturday.getMonth() + 1).padStart(2, '0');
                      const d = String(saturday.getDate()).padStart(2, '0');
                      updateForm('starts_at', `${y}-${m}-${d}T21:00`);
                    }}
                    className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-[#6600FF]/10 text-[10px] font-semibold text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                  >
                    {t('events', 'creation.wizard.location.saturday')}
                  </button>
                </div>
              </div>

              {/* Fin de l'événement */}
              <div className="space-y-2 pt-2 border-t border-black/[0.05] dark:border-white/[0.08] w-full max-w-full min-w-0">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    {t('events', 'creation.wizard.location.end')} ({t('events', 'creation.wizard.location.recommended')})
                  </label>
                  {form.ends_at && (
                    <button
                      type="button"
                      onClick={() => updateForm('ends_at', '')}
                      className="text-[10px] text-red-500 hover:underline cursor-pointer"
                    >
                      {t('events', 'creation.wizard.location.clear')}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 w-full max-w-full min-w-0 box-border">
                  <div className="relative min-w-0">
                    <input
                      type="date"
                      className={`${fieldClass} text-xs py-3 px-3`}
                      value={getSplitDateTime(form.ends_at).date}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        const currTime = getSplitDateTime(form.ends_at).time || '23:00';
                        updateForm('ends_at', newDate ? `${newDate}T${currTime}` : '');
                      }}
                    />
                  </div>
                  <div className="relative min-w-0">
                    <input
                      type="time"
                      className={`${fieldClass} text-xs py-3 px-3`}
                      value={getSplitDateTime(form.ends_at).time || (form.ends_at ? '23:00' : '')}
                      onChange={(e) => {
                        const newTime = e.target.value;
                        const currDate = getSplitDateTime(form.ends_at).date || getSplitDateTime(form.starts_at).date || new Date().toISOString().split('T')[0];
                        updateForm('ends_at', newTime ? `${currDate}T${newTime}` : '');
                      }}
                    />
                  </div>
                </div>

                {form.starts_at && !form.ends_at && (
                  <button
                    type="button"
                    onClick={() => {
                      const start = new Date(form.starts_at);
                      if (!isNaN(start.getTime())) {
                        start.setHours(start.getHours() + 4);
                        const y = start.getFullYear();
                        const m = String(start.getMonth() + 1).padStart(2, '0');
                        const d = String(start.getDate()).padStart(2, '0');
                        const h = String(start.getHours()).padStart(2, '0');
                        const min = String(start.getMinutes()).padStart(2, '0');
                        updateForm('ends_at', `${y}-${m}-${d}T${h}:${min}`);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#6600FF]/10 text-[#6600FF] dark:text-purple-300 text-[10px] font-bold hover:bg-[#6600FF]/20 transition-colors cursor-pointer"
                  >
                    <Clock className="w-3 h-3" />
                    <span>{t('events', 'creation.wizard.location.sameDateFourHours')}</span>
                  </button>
                )}
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
                  {t('events', 'creation.wizard.photos.cover')}
                </label>
                <span className="text-[11px] text-gray-400">{t('events', 'creation.wizard.photos.coverCount')}</span>
              </div>

              {coverPreview ? (
                <div className="relative h-44 rounded-2xl overflow-hidden ring-2 ring-[#6600FF]/30">
                  <img src={coverPreview} alt={t('events', 'creation.wizard.photos.coverAlt')} className="w-full h-full object-cover" />
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
                    {t('events', 'creation.wizard.photos.coverBadge')}
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
                    {t('events', 'creation.wizard.photos.selectCover')}
                  </span>
                  <span className="text-[10px] text-gray-400">{t('events', 'creation.wizard.photos.imageFormats')}</span>
                </button>
              )}
            </div>

            {/* Photos secondaires de la galerie */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t('events', 'creation.wizard.photos.gallery')}
                </label>
                <span className="text-[11px] text-[#6600FF] dark:text-purple-300 font-bold">
                  {t('events', 'creation.wizard.photos.galleryCount').replace('{count}', String(galleryFiles.length))}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {galleryFiles.map((item, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-2xl overflow-hidden group ring-1 ring-black/10 dark:ring-white/10"
                  >
                    <img src={item.preview} alt={t('events', 'creation.wizard.photos.galleryAlt').replace('{number}', String(index + 1))} className="w-full h-full object-cover" />
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
                    <span className="text-[10px] font-bold">{t('events', 'creation.wizard.photos.add')}</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                {t('events', 'creation.wizard.photos.galleryDescription')}
              </p>
            </div>

            {/* Vidéo Teaser / Médias de pré-saison */}
            <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.08]">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                {t('events', 'creation.wizard.photos.video')}
              </label>
              <input
                type="url"
                className={fieldClass}
                value={form.video_url}
                onChange={(e) => updateForm('video_url', e.target.value)}
                placeholder={t('events', 'creation.wizard.photos.videoPlaceholder')}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                {t('events', 'creation.wizard.photos.videoDescription')}
              </p>
            </div>
          </section>
        )}

        {/* STEP 4: BILLETS & MODALITÉS D'ACCÈS */}
        {step === 'Billets' && (
          <section className="space-y-4 animate-slide-up">
            {/* Choix du mode d'accès / billetterie */}
            <div className="card p-4 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('events', 'creation.wizard.access.prompt')}
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAccessType('tickets')}
                  className={`p-3 rounded-2xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                    accessType === 'tickets'
                      ? 'border-[#6600FF] bg-[#6600FF]/10 text-[#6600FF] dark:text-purple-300 ring-1 ring-[#6600FF]'
                      : 'border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1A1829] text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <TicketIcon className="w-5 h-5" />
                    {accessType === 'tickets' && <Check className="w-4 h-4 text-[#6600FF] dark:text-purple-300" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight">{t('events', 'creation.wizard.access.gbaTicketing')}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{t('events', 'creation.wizard.access.gbaDescription')}</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAccessType('whatsapp')}
                  className={`p-3 rounded-2xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                    accessType === 'whatsapp'
                      ? 'border-[#25D366] bg-[#25D366]/10 text-emerald-800 dark:text-emerald-300 ring-1 ring-[#25D366]'
                      : 'border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1A1829] text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <MessageCircle className="w-5 h-5 text-[#25D366]" />
                    {accessType === 'whatsapp' && <Check className="w-4 h-4 text-[#25D366]" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight">{t('events', 'creation.wizard.access.reservation')}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{t('events', 'creation.wizard.access.reservationDescription')}</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAccessType('external')}
                  className={`p-3 rounded-2xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                    accessType === 'external'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                      : 'border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1A1829] text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <ExternalLink className="w-5 h-5 text-blue-500" />
                    {accessType === 'external' && <Check className="w-4 h-4 text-blue-500" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight">{t('events', 'creation.wizard.access.external')}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{t('events', 'creation.wizard.access.externalDescription')}</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAccessType('free')}
                  className={`p-3 rounded-2xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                    accessType === 'free'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500'
                      : 'border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1A1829] text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Sparkles className="w-5 h-5 text-emerald-500" />
                    {accessType === 'free' && <Check className="w-4 h-4 text-emerald-500" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight">{t('events', 'creation.wizard.access.free')}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{t('events', 'creation.wizard.access.freeDescription')}</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Jauge / Capacité d'accueil (Gestion des places illimitées) */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-[#17131D] dark:text-white">
                    {t('events', 'creation.wizard.access.capacityTitle')}
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {unlimitedCapacity
                      ? t('events', 'creation.wizard.access.unlimited')
                      : t('events', 'creation.wizard.access.restricted')}
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    aria-label={t('events', 'creation.wizard.access.unlimitedToggle')}
                    checked={unlimitedCapacity}
                    onChange={(e) => setUnlimitedCapacity(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6600FF]"></div>
                </label>
              </div>

              {!unlimitedCapacity && (
                <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.08] animate-fade-in">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    {t('events', 'creation.wizard.access.availablePlaces')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    className={fieldClass}
                    value={form.capacity}
                    onChange={(e) => updateForm('capacity', e.target.value)}
                    placeholder={t('events', 'creation.wizard.info.capacityPlaceholder')}
                  />
                </div>
              )}
            </div>

            {/* Formulaires spécifiques selon le mode d'accès */}
            {accessType === 'whatsapp' ? (
              <div className="card p-4 space-y-3.5 border-emerald-500/20 bg-emerald-500/5 animate-fade-in">
                <div className="flex items-center gap-2 text-[#25D366]">
                  <MessageCircle className="w-5 h-5" />
                    <h4 className="text-sm font-bold text-[#17131D] dark:text-white">
                    {t('events', 'creation.wizard.access.whatsappConfig')}
                  </h4>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    {t('events', 'creation.wizard.access.officialWhatsapp')}
                  </label>
                  <input
                    type="tel"
                    className={fieldClass}
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder={t('events', 'creation.wizard.access.phonePlaceholder')}
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    {t('events', 'creation.wizard.access.whatsappHint')}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    {t('events', 'creation.wizard.access.prefilledMessage')}
                  </label>
                  <input
                    className={fieldClass}
                    value={whatsappMessage}
                    onChange={(e) => setWhatsappMessage(e.target.value)}
                    placeholder={t('events', 'creation.wizard.access.prefilledMessagePlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    {t('events', 'creation.wizard.access.indicativePrice')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    className={fieldClass}
                    value={tickets[0]?.price || '0'}
                    onChange={(e) =>
                      setTickets([
                        {
                          ticket_type: 'standard',
                          label: 'Sur réservation',
                          price: e.target.value,
                          quantity_total: form.capacity || '1000',
                          description: 'Réservation WhatsApp',
                        },
                      ])
                    }
                    placeholder={t('events', 'creation.wizard.access.pricePlaceholder')}
                  />
                </div>
              </div>
            ) : accessType === 'external' ? (
              <div className="card p-4 space-y-3.5 border-blue-500/20 bg-blue-500/5 animate-fade-in">
                <div className="flex items-center gap-2 text-blue-500">
                  <ExternalLink className="w-5 h-5" />
                  <h4 className="text-sm font-bold text-[#17131D] dark:text-white">
                    {t('events', 'creation.wizard.access.externalHeading')}
                  </h4>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    {t('events', 'creation.wizard.access.officialLink')}
                  </label>
                  <input
                    type="url"
                    className={fieldClass}
                    value={externalTicketUrl}
                    onChange={(e) => setExternalTicketUrl(e.target.value)}
                    placeholder={t('events', 'creation.wizard.access.externalPlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    {t('events', 'creation.wizard.access.accessPrice')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    className={fieldClass}
                    value={tickets[0]?.price || '0'}
                    onChange={(e) =>
                      setTickets([
                        {
                          ticket_type: 'standard',
                          label: 'Site externe',
                          price: e.target.value,
                          quantity_total: form.capacity || '1000',
                          description: 'Billetterie externe',
                        },
                      ])
                    }
                    placeholder="ex. 5000"
                  />
                </div>
              </div>
            ) : accessType === 'free' ? (
              <div className="card p-4 space-y-2 border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-900 dark:text-emerald-200 animate-fade-in">
                <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                  <span>{t('events', 'creation.wizard.access.freeBadge')}</span>
                </div>
                <p>
                  Aucune vente de billet ni réservation requise. Le badge « Entrée libre » sera affiché sur les cartes et la page de l'événement.
                </p>
              </div>
            ) : (
              /* Billetterie Gbaigbance standard avec formules de billets */
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#6600FF]/[0.07] text-xs text-[#17131D] dark:bg-[#6600FF]/15 dark:text-white">
                  <Info className="h-4 w-4 shrink-0 text-[#6600FF] dark:text-purple-300" />
                  <span>{t('events', 'creation.wizard.access.ticketHint')}</span>
                </div>

                <div className="grid grid-cols-3 gap-2" aria-live="polite">
                  <div className="rounded-2xl bg-white p-3 dark:bg-[#1A1829]">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('events', 'creation.wizard.access.formulaCount')}</p>
                    <p className="mt-1 text-base font-extrabold tabular-nums text-[#17131D] dark:text-white">{configuredTicketCount}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3 dark:bg-[#1A1829]">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('events', 'creation.wizard.access.placesConfigured')}</p>
                    <p className="mt-1 text-base font-extrabold tabular-nums text-[#17131D] dark:text-white">{configuredTicketQuantity.toLocaleString('fr-FR')}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3 dark:bg-[#1A1829]">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('events', 'creation.wizard.access.fromPrice')}</p>
                    <p className="mt-1 text-sm font-extrabold tabular-nums text-[#6600FF] dark:text-purple-300">{lowestTicketPrice === null ? '—' : `${lowestTicketPrice.toLocaleString('fr-FR')} F`}</p>
                  </div>
                </div>

                {tickets.map((ticket, index) => (
                  <div key={index} className="relative space-y-3 overflow-hidden rounded-[22px] border border-black/[0.06] bg-white p-4 dark:border-white/[0.08] dark:bg-[#1A1829]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6600FF] dark:text-purple-300">{t('events', 'creation.wizard.access.ticketNumber').replace('{number}', String(index + 1))}</p>
                        <p className="mt-0.5 truncate text-sm font-bold text-[#17131D] dark:text-white">{ticket.label || t('events', 'creation.wizard.access.unnamedTicket')}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-[#6600FF]/[0.08] px-2.5 py-1 text-[10px] font-bold text-[#6600FF] dark:text-purple-300">{ticket.ticket_type === 'standard' ? t('events', 'creation.wizard.access.standard') : ticket.ticket_type === 'vip' ? t('events', 'creation.wizard.access.vip') : ticket.ticket_type === 'vvip' ? t('events', 'creation.wizard.access.vvip') : t('events', 'creation.wizard.access.freeTicket')}</span>
                        {tickets.length > 1 && (
                          <button type="button" onClick={() => setTickets((current) => current.filter((_, i) => i !== index))} aria-label={t('events', 'creation.wizard.access.removeTicketType')} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
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
                        <option value="standard">{t('events', 'creation.wizard.access.standard')}</option>
                        <option value="vip">{t('events', 'creation.wizard.access.vip')}</option>
                        <option value="vvip">{t('events', 'creation.wizard.access.vvip')}</option>
                        <option value="free">{t('events', 'creation.wizard.access.freeTicket')}</option>
                      </select>

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
                      placeholder={t('events', 'creation.wizard.access.ticketNamePlaceholder')}
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">{t('events', 'creation.wizard.access.price')}</label>
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
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">{t('events', 'creation.wizard.access.totalQuantity')}</label>
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
                    <label className="block space-y-1">
                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{t('events', 'creation.wizard.access.ticketDescription')}</span>
                      <input className={fieldClass} value={ticket.description} onChange={(e) => setTickets((current) => current.map((item, i) => i === index ? { ...item, description: e.target.value } : item))} placeholder={t('events', 'creation.wizard.access.ticketDescriptionPlaceholder')} />
                    </label>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setTickets((current) => [...current, { ticket_type: 'standard', label: '', price: '0', quantity_total: '100', description: '' }])}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#6600FF]/40 py-3.5 font-bold text-[#6600FF] transition-colors hover:bg-[#6600FF]/5 dark:text-purple-300"
                >
                  <Plus className="w-4 h-4" />
                  {t('events', 'creation.wizard.access.addTicketType')}
                </button>
              </div>
            )}
          </section>
        )}

        {/* STEP 5: COLLABORATEURS */}
        {step === 'Collaborateurs' && (
          <section className="space-y-4 animate-slide-up">
            <div className="rounded-[22px] border border-[#6600FF]/10 bg-[#6600FF]/[0.045] p-4 dark:border-purple-400/15 dark:bg-purple-400/[0.06]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-[#17131D] dark:text-white">{t('events', 'creation.wizard.team.title')}</p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{t('events', 'creation.wizard.team.description')}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold tabular-nums text-[#6600FF] dark:bg-white/10 dark:text-purple-300">{collaborators.length}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCollabRole('performer')}
                className={`chip flex-1 justify-center py-2.5 ${
                  collabRole === 'performer' ? 'chip-active' : 'chip-inactive'
                }`}
              >
                <Music2 className="w-4 h-4" />
                {t('events', 'creation.wizard.team.artists')}
              </button>
              <button
                type="button"
                onClick={() => setCollabRole('co_organizer')}
                className={`chip flex-1 justify-center py-2.5 ${
                  collabRole === 'co_organizer' ? 'chip-active' : 'chip-inactive'
                }`}
              >
                <Building2 className="w-4 h-4" />
                {t('events', 'creation.wizard.team.coOrganizers')}
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6600FF]/70" />
              <input
                className={`${fieldClass} pl-11`}
                value={collabSearch}
                onChange={(e) => setCollabSearch(e.target.value)}
                placeholder={collabRole === 'performer' ? t('events', 'creation.wizard.team.searchArtist') : t('events', 'creation.wizard.team.searchOrganizer')}
                aria-label={collabRole === 'performer' ? t('events', 'creation.wizard.team.searchArtist') : t('events', 'creation.wizard.team.searchOrganizer')}
              />
            </div>

            {searching && <p role="status" className="text-xs text-gray-500 text-center">{t('events', 'creation.wizard.team.searching')}</p>}

            <div className="space-y-2">
              {collabRole === 'performer' &&
                results.artists.map((artist) => (
                  <button
                    type="button"
                    key={artist.id}
                    onClick={() => addCollaborator(artist.user_id || '', artist.name, 'artist')}
                    disabled={artist.user_id === user?.id || collaborators.some((item) => item.user_id === artist.user_id)}
                    className="w-full card flex min-h-14 items-center gap-3 p-3 text-left transition-colors hover:border-[#6600FF]/40 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#6600FF]/10 text-[#6600FF] dark:text-purple-300">
                      {artist.photo_url ? <img src={artist.photo_url} alt="" className="h-full w-full object-cover" /> : <Music2 className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-bold text-[#17131D] dark:text-white">{artist.name}</span>
                    {artist.user_id === user?.id || collaborators.some((item) => item.user_id === artist.user_id) ? <Check className="h-4 w-4 shrink-0 text-emerald-500" /> : <Plus className="h-4 w-4 shrink-0 text-[#6600FF]" />}
                  </button>
                ))}

              {collabRole === 'co_organizer' &&
                results.orgs.map((org) => (
                  <button
                    type="button"
                    key={org.id}
                    onClick={() => addCollaborator(org.owner_id || '', org.name, 'organizer')}
                    disabled={org.owner_id === user?.id || collaborators.some((item) => item.user_id === org.owner_id)}
                    className="w-full card flex min-h-14 items-center gap-3 p-3 text-left transition-colors hover:border-[#6600FF]/40 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#6600FF]/10 text-[#6600FF] dark:text-purple-300">
                      {org.logo_url ? <img src={org.logo_url} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-bold text-[#17131D] dark:text-white">{org.name}</span>
                    {org.owner_id === user?.id || collaborators.some((item) => item.user_id === org.owner_id) ? <Check className="h-4 w-4 shrink-0 text-emerald-500" /> : <Plus className="h-4 w-4 shrink-0 text-[#6600FF]" />}
                  </button>
                ))}

              {collabSearch.trim() && !searching && (
                (collabRole === 'performer' && results.artists.length === 0) ||
                (collabRole === 'co_organizer' && results.orgs.length === 0)
              ) && (
                <div className="rounded-2xl bg-black/[0.03] px-4 py-5 text-center text-xs text-gray-500 dark:bg-white/[0.04] dark:text-gray-400">
                  {t('events', 'creation.wizard.team.noResults').replace('{query}', collabSearch)}
                </div>
              )}
            </div>

            {collaborators.length > 0 && (
              <>
              <div className="rounded-[22px] border border-amber-500/20 bg-amber-500/[0.06] p-3 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{t('events', 'creation.wizard.team.approvalNotice')}</p>
                </div>
              </div>
              <div className="rounded-[22px] border border-black/[0.06] bg-white p-4 dark:border-white/[0.08] dark:bg-[#1A1829]">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">{t('events', 'creation.wizard.team.selected')}</p>
                  <span className="text-[10px] font-bold text-[#6600FF] dark:text-purple-300">{collaborators.length}</span>
                </div>
                <ul className="space-y-2">
                  {collaborators.map((item) => (
                    <li key={item.user_id} className="flex min-w-0 items-center gap-3 rounded-2xl bg-black/[0.025] p-3 dark:bg-white/[0.04]">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#6600FF]/10 text-[#6600FF] dark:text-purple-300">
                        {item.type === 'artist' ? <Music2 className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-[#17131D] dark:text-white">{item.name}</span>
                        <span className="mt-0.5 block text-[10px] text-gray-500 dark:text-gray-400">{item.role === 'performer' ? t('events', 'creation.wizard.team.artistRole') : t('events', 'creation.wizard.team.organizerRole')}</span>
                      </span>
                      <button type="button" onClick={() => setCollaborators((current) => current.filter((collaborator) => collaborator.user_id !== item.user_id))} aria-label={t('events', 'creation.wizard.team.remove')} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30">
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              </>
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

        {/* STEP 9: CONFIRMATION & APERÇU EN DIRECT */}
        {step === 'Confirmation' && (
          <section className="space-y-4 animate-slide-up">
            {/* Segmented Control de vue en Confirmation */}
            <div className="flex p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-2xl">
              <button
                type="button"
                onClick={() => setConfirmationTab('summary')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  confirmationTab === 'summary'
                    ? 'bg-white dark:bg-[#1A1829] text-[#6600FF] dark:text-purple-300 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                📋 Récapitulatif
              </button>
              <button
                type="button"
                onClick={() => setConfirmationTab('card')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  confirmationTab === 'card'
                    ? 'bg-white dark:bg-[#1A1829] text-[#6600FF] dark:text-purple-300 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Aperçu Carte</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmationTab('page')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  confirmationTab === 'page'
                    ? 'bg-white dark:bg-[#1A1829] text-[#6600FF] dark:text-purple-300 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Aperçu Fiche</span>
              </button>
            </div>

            {confirmationTab === 'summary' ? (
              <div className="space-y-4">
                <div className="card p-5 space-y-3">
                  <h2 className="text-xl font-extrabold text-[#171726] dark:text-white leading-tight">
                    {form.title || 'Votre événement'}
                  </h2>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-full bg-[#6600FF]/10 text-[#6600FF] dark:text-purple-300 font-bold">
                      {currentSubDef ? currentSubDef.label : t('events', `categories.${form.category}`)}
                    </span>
                    {currentMainDef && (
                      <span className="px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold">
                        {currentMainDef.shortLabel}
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 font-medium">
                      {form.city}
                    </span>

                    {/* Access Type Badge */}
                    {accessType === 'whatsapp' ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-[#25D366] dark:bg-emerald-950/40 font-bold flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" /> Réservation WhatsApp
                      </span>
                    ) : accessType === 'external' ? (
                      <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 font-bold flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> Billetterie externe
                      </span>
                    ) : accessType === 'free' ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Entrée libre
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-purple-50 text-[#6600FF] dark:bg-purple-950/40 font-bold flex items-center gap-1">
                        <TicketIcon className="w-3 h-3" /> Billetterie Gbaigbance
                      </span>
                    )}

                    {/* Jauge Badge */}
                    <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 font-medium">
                      {unlimitedCapacity ? 'Places illimitées' : `${form.capacity || '—'} places max`}
                    </span>

                    {galleryFiles.length > 0 && (
                      <span className="px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 text-[#6600FF] font-medium">
                        {galleryFiles.length + (coverPreview ? 1 : 0)} photo(s)
                      </span>
                    )}
                  </div>
                </div>

                {/* Détails d'accès & Billetterie */}
                <div className="card p-4 space-y-2.5">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <TicketIcon className="w-4 h-4 text-[#6600FF]" /> Modalité d'accès
                  </h3>

                  {accessType === 'whatsapp' ? (
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-[#17131D] dark:text-white">
                        Réservations directes via WhatsApp : {whatsappNumber || 'Non renseigné'}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400">
                        Tarif indicatif : {tickets[0]?.price ? `${Number(tickets[0].price).toLocaleString('fr-FR')} FCFA` : 'Gratuit'}
                      </p>
                    </div>
                  ) : accessType === 'external' ? (
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-[#17131D] dark:text-white truncate">
                        Billetterie officielle : {externalTicketUrl || 'Lien non renseigné'}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400">
                        Tarif à partir de : {tickets[0]?.price ? `${Number(tickets[0].price).toLocaleString('fr-FR')} FCFA` : 'Gratuit'}
                      </p>
                    </div>
                  ) : accessType === 'free' ? (
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Entrée libre & gratuite pour tous.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {tickets.map((ticket, i) => (
                        <div key={i} className="flex justify-between text-xs py-1 border-b border-black/[0.04] dark:border-white/[0.06] last:border-0">
                          <span className="font-semibold text-[#17131D] dark:text-white">{ticket.label || 'Standard'}</span>
                          <span className="font-bold text-[#6600FF] dark:text-purple-300">
                            {Number(ticket.price) === 0 ? 'Gratuit' : `${Number(ticket.price).toLocaleString('fr-FR')} FCFA`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dates et lieu */}
                <div className="card p-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Calendar className="w-4 h-4 text-[#6600FF]" />
                    <span>Début : {formatFriendlyDateTime(form.starts_at, language) || 'Date à préciser'}</span>
                  </div>
                  {form.ends_at && (
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <Clock className="w-4 h-4 text-[#6600FF]" />
                      <span>Fin : {formatFriendlyDateTime(form.ends_at, language)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <MapPin className="w-4 h-4 text-[#6600FF]" />
                    <span>Lieu : {form.location_name}, {form.city}</span>
                  </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  {t('events', 'creation.wizard.confirmation.publicationNotice')}
                </p>
              </div>
            ) : confirmationTab === 'card' ? (
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-[#6600FF]/10 text-xs text-[#17131D] dark:text-purple-200">
                  ✨ <strong>Aperçu dans le fil d’actualité :</strong> Voici comment votre événement sera affiché sur la page d'accueil et dans les recherches.
                </div>
                <div className="max-w-[340px] mx-auto p-2 rounded-[28px] bg-white dark:bg-[#1A1829] border border-black/10 dark:border-white/10 shadow-lg">
                  <EventCard event={previewEvent} />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-[#6600FF]/10 text-xs text-[#17131D] dark:text-purple-200">
                  📱 <strong>Aperçu de la page de l'événement :</strong> Voici la fiche détaillée que consulteront les festivaliers.
                </div>
                {/* Embedded preview */}
                <div className="card p-4 space-y-4">
                  <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-gray-900">
                    <img
                      src={previewEvent.cover_url || ''}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-3 inset-x-3 text-white">
                      <h4 className="text-base font-black">{previewEvent.title}</h4>
                      <p className="text-xs text-white/80">{previewEvent.location_name}, {previewEvent.city}</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 text-xs flex justify-between items-center">
                    <span>{formatFriendlyDateTime(form.starts_at, language) || 'Date à définir'}</span>
                    <span className="font-extrabold text-[#6600FF] dark:text-purple-300">
                      {previewEvent.price_min === 0 ? 'Gratuit' : `${Number(previewEvent.price_min).toLocaleString('fr-FR')} FCFA`}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-line line-clamp-4">
                    {previewEvent.description || 'Aucune description rédigée.'}
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Commandes persistantes : actions toujours accessibles sur mobile */}
        <div className="sticky bottom-0 z-20 -mx-5 mt-6 bg-gradient-to-t from-white via-white/95 to-white/0 px-5 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-4 backdrop-blur-xl dark:from-[#14121E] dark:via-[#14121E]/95">
        <div className="flex gap-3">
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={previous}
              className="min-h-12 flex-1 rounded-full border border-black/[0.08] bg-white py-3.5 text-sm font-bold text-gray-700 transition-transform active:scale-95 dark:border-white/[0.1] dark:bg-[#1A1829] dark:text-gray-200"
            >
              Retour
            </button>
          )}

          {step === 'Confirmation' ? (
            <button
              type="button"
              onClick={createEvent}
              disabled={creating}
              className="btn-purple flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 py-3.5 text-sm font-bold"
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
              className="btn-purple flex min-h-12 flex-1 cursor-pointer items-center justify-center py-3.5 text-sm font-bold"
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
        </div>
      </main>

      {/* Interactive Modal Preview accessible anytime from the header */}
      <EventPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        event={previewEvent}
        ticketOptions={tickets.map((t) => ({
          ticket_type: t.ticket_type,
          label: t.label || 'Pass',
          price: Number(t.price) || 0,
          quantity_total: Number(t.quantity_total) || 100,
        }))}
        scheduleItems={scheduleItems}
        collaborators={collaborators}
      />
    </div>
  );
}
