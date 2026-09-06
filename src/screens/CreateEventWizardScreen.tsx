import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Building2, Check, ChevronLeft, ImagePlus, Info, Loader2, Music2, Plus, Search, Ticket as TicketIcon, X } from 'lucide-react';
import { EventOptionalSteps, type LiveItem, type ScheduleItem, type SponsorItem } from '@/components/EventOptionalSteps';
import { useApp } from '@/hooks/useApp';
import { EVENT_CATEGORIES } from '@/constants';
import { createEventWithCollaborators, searchArtists, searchOrganizations, uploadEventImage, addScheduleSlot, addEventLiveLink, addEventSponsor, getFaviconUrl } from '@/services/events';
import type { Artist, Event, EventCategory, Organization } from '@/types';
import type { ToastData } from '@/components/Toast';

interface Props { onBack: () => void; onCreated: (event: Event) => void; onToast: (toast: Omit<ToastData, 'id'>) => void; }
type Step = 'Infos' | 'Billets' | 'Collaborateurs' | 'Programme' | 'Live' | 'Sponsors' | 'Confirmation';
type CollabType = 'artist' | 'organizer';
interface SelectedCollab { user_id: string; name: string; role: 'co_organizer' | 'performer'; type: CollabType; }
const STEPS: Step[] = ['Infos', 'Billets', 'Collaborateurs', 'Programme', 'Live', 'Sponsors', 'Confirmation'];
const fieldClass = 'w-full px-4 py-3.5 form-surface rounded-2xl text-[#171726] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40';

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
  const [form, setForm] = useState({ title: '', description: '', category: 'concert' as EventCategory, location_name: '', city: 'Lomé', starts_at: '', cover_url: '', capacity: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [tickets, setTickets] = useState([{ ticket_type: 'standard', label: 'Standard', price: '0', quantity_total: '100', description: '' }]);
  const [collaborators, setCollaborators] = useState<SelectedCollab[]>([]);
  const [collabRole, setCollabRole] = useState<'co_organizer' | 'performer'>('performer');
  const [collabSearch, setCollabSearch] = useState('');
  const [results, setResults] = useState<{ artists: Artist[]; orgs: Organization[] }>({ artists: [], orgs: [] });
  const [searching, setSearching] = useState(false);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [liveItems, setLiveItems] = useState<LiveItem[]>([]);
  const [isLiveEvent, setIsLiveEvent] = useState(false);
  const [sponsorItems, setSponsorItems] = useState<SponsorItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stepIndex = STEPS.indexOf(step);

  useEffect(() => {
    if (!collabSearch.trim()) { setResults({ artists: [], orgs: [] }); return; }
    setSearching(true);
    const timer = window.setTimeout(() => {
      Promise.all([searchArtists(collabSearch), searchOrganizations(collabSearch)]).then(([artists, orgs]) => setResults({ artists, orgs })).catch(() => setResults({ artists: [], orgs: [] })).finally(() => setSearching(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [collabSearch]);

  const updateForm = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));
  const addCollaborator = (id: string, name: string, type: CollabType) => {
    if (!id || id === user?.id || collaborators.some((item) => item.user_id === id)) return;
    setCollaborators([...collaborators, { user_id: id, name, role: collabRole, type }]);
    setCollabSearch('');
  };

  const validateInfos = () => {
    const missing: string[] = [];
    if (!form.title.trim()) missing.push('le titre');
    if (!form.starts_at) missing.push("la date et l'heure");
    if (!form.location_name.trim()) missing.push('le lieu');
    if (!form.city.trim()) missing.push('la ville');
    if (missing.length) { setError(`Champs obligatoires manquants : ${missing.join(', ')}.`); return false; }
    setError('');
    return true;
  };

  const createEvent = async () => {
    if (!user || !validateInfos()) return;
    setCreating(true); setError('');
    try {
      const coverUrl = imageFile ? await uploadEventImage(imageFile, user.id) || '' : form.cover_url;
      const validTickets = tickets.filter((ticket) => ticket.label.trim() && ticket.quantity_total).map((ticket) => ({ ticket_type: ticket.ticket_type, label: ticket.label.trim(), price: Math.max(0, Number(ticket.price) || 0), quantity_total: Math.max(1, Number(ticket.quantity_total) || 1), description: ticket.description || undefined }));
      const event = await createEventWithCollaborators({ title: form.title.trim(), description: form.description.trim(), category: form.category, location_name: form.location_name.trim(), city: form.city.trim(), starts_at: form.starts_at, price_min: validTickets.length ? Math.min(...validTickets.map((ticket) => ticket.price)) : 0, cover_url: coverUrl, capacity: form.capacity ? Math.max(1, Number(form.capacity)) : undefined, created_by_role: user.role === 'artist' ? 'artist' : 'organizer' }, collaborators.map((item) => ({ user_id: item.user_id, role: item.role })), validTickets, user.id);
      if (!event) throw new Error('Échec de création');
      await Promise.all(scheduleItems.filter((item) => item.title && item.start_time).map((item, index) => addScheduleSlot({ event_id: event.id, day_label: item.day_label, stage_name: item.stage_name, start_time: new Date(item.start_time).toISOString(), end_time: item.end_time ? new Date(item.end_time).toISOString() : null, title: item.title, artist_id: item.artist_id || null, sort_order: index })));
      await Promise.all(isLiveEvent ? liveItems.filter((item) => item.url.trim()).map((item) => addEventLiveLink(event.id, item.platform, item.url.trim(), item.title.trim() || undefined)) : []);
      await Promise.all(sponsorItems.filter((item) => item.name.trim()).map((item) => addEventSponsor({ event_id: event.id, name: item.name.trim(), website_url: item.website_url.trim() || undefined, logo_url: item.website_url ? getFaviconUrl(item.website_url) : item.logo_url || undefined, tier: item.tier, logo_source: item.logo_source })));
      onToast({ message: collaborators.length ? 'Événement créé, en attente des collaborateurs.' : 'Événement créé et publié.', type: 'success' });
      onCreated(event);
    } catch (caught) { const message = getErrorMessage(caught); setError(message); onToast({ message, type: 'error' }); } finally { setCreating(false); }
  };

  const next = () => {
    if (step === 'Infos' && !validateInfos()) return;
    setStep(STEPS[Math.min(stepIndex + 1, STEPS.length - 1)]);
  };
  const previous = () => setStep(STEPS[Math.max(stepIndex - 1, 0)]);

  return (
    <div className="min-h-screen bg-[#EDE8FF] pb-32">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { onToast({ message: 'Image trop lourde (max 5MB)', type: 'error' }); return; } setImageFile(file); setImagePreview(URL.createObjectURL(file)); }} />
      <header className="sticky top-0 z-30 px-5 py-4 bg-[#EDE8FF]/85 backdrop-blur-xl border-b border-white/40"><div className="max-w-md mx-auto flex items-center gap-3"><button type="button" onClick={onBack} aria-label="Retour" className="w-10 h-10 rounded-full glass-surface flex items-center justify-center"><ChevronLeft className="w-5 h-5" /></button><div className="flex-1"><p className="text-[10px] uppercase tracking-[0.16em] text-[#6600FF] font-bold">Nouvel événement</p><h1 className="text-lg font-extrabold text-[#171726]">Créer un événement</h1><p className="text-xs text-gray-500">Étape {stepIndex + 1}/{STEPS.length} · {step}</p></div></div><div className="max-w-md mx-auto mt-3 flex gap-1.5">{STEPS.map((item, index) => <div key={item} className={`h-1.5 flex-1 rounded-full ${index <= stepIndex ? 'bg-[#6600FF]' : 'bg-white/70'}`} />)}</div></header>
      <main className="max-w-md mx-auto px-5 mt-6">
        {error && <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 rounded-2xl text-sm text-red-600"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</div>}
        {step === 'Infos' && <section className="space-y-4 animate-slide-up"><div><label className="block text-sm font-semibold text-gray-700 mb-2">Image de couverture</label>{imagePreview ? <div className="relative h-40 rounded-2xl overflow-hidden"><img src={imagePreview} alt="Aperçu" className="w-full h-full object-cover" /><button type="button" onClick={() => { setImageFile(null); setImagePreview(''); }} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center"><X className="w-4 h-4" /></button></div> : <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full h-40 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2"><ImagePlus className="w-8 h-8 text-gray-400" /><span className="text-sm text-gray-500">Ajouter une image</span><span className="text-xs text-gray-400">JPG, PNG · 5 MB maximum</span></button>}</div><input className={fieldClass} value={form.title} onChange={(event) => updateForm('title', event.target.value)} placeholder="Titre de l'événement *" /><textarea className={`${fieldClass} min-h-28 resize-none`} value={form.description} onChange={(event) => updateForm('description', event.target.value)} placeholder="Description facultative" /><div className="grid grid-cols-2 gap-3"><input className={fieldClass} type="datetime-local" value={form.starts_at} onChange={(event) => updateForm('starts_at', event.target.value)} /><input className={fieldClass} value={form.location_name} onChange={(event) => updateForm('location_name', event.target.value)} placeholder="Lieu *" /></div><div className="grid grid-cols-2 gap-3"><select className={fieldClass} value={form.category} onChange={(event) => updateForm('category', event.target.value as EventCategory)}>{EVENT_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{t('events', `categories.${category.value}`)}</option>)}</select><input className={fieldClass} value={form.city} onChange={(event) => updateForm('city', event.target.value)} placeholder="Ville *" /></div><input className={fieldClass} type="number" min="1" value={form.capacity} onChange={(event) => updateForm('capacity', event.target.value)} placeholder="Capacité (facultatif)" /></section>}
        {step === 'Billets' && <section className="space-y-4 animate-slide-up"><div className="flex items-center gap-2 p-3 bg-[#6600FF]/5 rounded-2xl text-sm text-gray-600"><Info className="w-4 h-4 text-[#6600FF]" />Les billets sont facultatifs : un événement gratuit peut garder le prix à 0.</div>{tickets.map((ticket, index) => <div key={index} className="card p-4 space-y-3"><div className="flex justify-between items-center"><select className={fieldClass} value={ticket.ticket_type} onChange={(event) => setTickets(tickets.map((item, itemIndex) => itemIndex === index ? { ...item, ticket_type: event.target.value } : item))}><option value="free">Gratuit</option><option value="standard">Standard</option><option value="vip">VIP</option><option value="vvip">VVIP</option></select>{tickets.length > 1 && <button type="button" onClick={() => setTickets(tickets.filter((_, itemIndex) => itemIndex !== index))} className="ml-2 text-red-500"><X className="w-4 h-4" /></button>}</div><input className={fieldClass} value={ticket.label} onChange={(event) => setTickets(tickets.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} placeholder="Nom du billet" /><div className="grid grid-cols-2 gap-2"><input className={fieldClass} type="number" min="0" value={ticket.price} onChange={(event) => setTickets(tickets.map((item, itemIndex) => itemIndex === index ? { ...item, price: event.target.value } : item))} placeholder="Prix FCFA" /><input className={fieldClass} type="number" min="1" value={ticket.quantity_total} onChange={(event) => setTickets(tickets.map((item, itemIndex) => itemIndex === index ? { ...item, quantity_total: event.target.value } : item))} placeholder="Quantité" /></div></div>)}<button type="button" onClick={() => setTickets([...tickets, { ticket_type: 'standard', label: '', price: '0', quantity_total: '100', description: '' }])} className="w-full py-3 rounded-2xl border border-dashed border-[#6600FF]/40 text-[#6600FF] font-bold flex items-center justify-center gap-2"><Plus className="w-4 h-4" />Ajouter un type de billet</button></section>}
        {step === 'Collaborateurs' && <section className="space-y-4 animate-slide-up"><div className="flex gap-2"><button type="button" onClick={() => setCollabRole('performer')} className={`chip flex-1 justify-center ${collabRole === 'performer' ? 'chip-active' : 'chip-inactive'}`}><Music2 className="w-4 h-4" />Artiste</button><button type="button" onClick={() => setCollabRole('co_organizer')} className={`chip flex-1 justify-center ${collabRole === 'co_organizer' ? 'chip-active' : 'chip-inactive'}`}><Building2 className="w-4 h-4" />Co-organisateur</button></div><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6600FF]/70" /><input className={`${fieldClass} pl-12`} value={collabSearch} onChange={(event) => setCollabSearch(event.target.value)} placeholder="Rechercher un collaborateur (facultatif)" /></div>{searching && <p className="text-sm text-gray-500 text-center">Recherche...</p>}<div className="space-y-2">{results.artists.map((artist) => <button type="button" key={artist.id} onClick={() => addCollaborator(artist.user_id || '', artist.name, 'artist')} className="w-full card p-3 flex items-center gap-3 text-left"><Music2 className="w-4 h-4 text-[#6600FF]" /><span className="text-sm font-semibold">{artist.name}</span></button>)}{results.orgs.map((organization) => <button type="button" key={organization.id} onClick={() => addCollaborator(organization.owner_id || '', organization.name, 'organizer')} className="w-full card p-3 flex items-center gap-3 text-left"><Building2 className="w-4 h-4 text-[#6600FF]" /><span className="text-sm font-semibold">{organization.name}</span></button>)}</div>{collaborators.length > 0 && <div className="card p-4 space-y-2">{collaborators.map((item) => <div key={item.user_id} className="flex items-center justify-between text-sm"><span>{item.name}</span><button type="button" onClick={() => setCollaborators(collaborators.filter((current) => current.user_id !== item.user_id))} className="text-red-500"><X className="w-4 h-4" /></button></div>)}</div>}</section>}
        {(['Programme', 'Live', 'Sponsors'] as const).includes(step as 'Programme' | 'Live' | 'Sponsors') && <EventOptionalSteps step={step as 'Programme' | 'Live' | 'Sponsors'} scheduleItems={scheduleItems} setScheduleItems={setScheduleItems} liveItems={liveItems} setLiveItems={setLiveItems} isLiveEvent={isLiveEvent} setIsLiveEvent={setIsLiveEvent} sponsorItems={sponsorItems} setSponsorItems={setSponsorItems} />}
        {step === 'Confirmation' && <section className="space-y-4 animate-slide-up"><div className="card p-5 space-y-3"><h2 className="text-xl font-extrabold text-[#171726]">{form.title || 'Votre événement'}</h2><div className="flex flex-wrap gap-2 text-xs"><span className="px-2.5 py-1 rounded-full bg-[#6600FF]/10 text-[#6600FF]">{t('events', `categories.${form.category}`)}</span><span className="px-2.5 py-1 rounded-full bg-gray-100">{form.city}</span>{scheduleItems.length > 0 && <span className="px-2.5 py-1 rounded-full bg-gray-100">{scheduleItems.length} créneau(x)</span>}{isLiveEvent && liveItems.length > 0 && <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-600">Live</span>}{sponsorItems.length > 0 && <span className="px-2.5 py-1 rounded-full bg-gray-100">{sponsorItems.length} sponsor(s)</span>}</div></div><div className="card p-5"><h3 className="flex items-center gap-2 font-bold"><TicketIcon className="w-4 h-4 text-[#6600FF]" />Billets</h3>{tickets.map((ticket) => <div key={ticket.label} className="flex justify-between text-sm mt-2"><span>{ticket.label || 'Sans nom'}</span><span>{Number(ticket.price) === 0 ? 'Gratuit' : `${Number(ticket.price).toLocaleString('fr-FR')} FCFA`}</span></div>)}</div><p className="text-sm text-gray-500 flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" />Les options sans contenu ne seront pas enregistrées.</p></section>}
        <div className="flex gap-3 mt-6">{stepIndex > 0 && <button type="button" onClick={previous} className="flex-1 py-3.5 rounded-full bg-white text-gray-600 font-semibold">Retour</button>}{step === 'Confirmation' ? <button type="button" onClick={createEvent} disabled={creating} className="btn-purple flex-1 py-3.5 flex items-center justify-center gap-2">{creating ? <><Loader2 className="w-4 h-4 animate-spin" />Création...</> : 'Publier l’événement'}</button> : <button type="button" onClick={next} className="btn-purple flex-1 py-3.5">Continuer</button>}</div>
        {step !== 'Confirmation' && <button type="button" onClick={onBack} className="w-full mt-3 text-sm text-gray-500">Annuler</button>}
      </main>
    </div>
  );
}
