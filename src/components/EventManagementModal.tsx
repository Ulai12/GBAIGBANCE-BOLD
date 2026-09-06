import { useState, useEffect } from 'react';
import { Calendar, Video, Award, Plus, Trash2, Radio, Upload, Globe, X, Check } from 'lucide-react';
import { Modal } from '@/components/Modal';
import {
  fetchEventSchedule, addScheduleSlot, deleteScheduleSlot,
  fetchEventLiveLinks, addEventLiveLink, toggleLiveLink, deleteEventLiveLink,
  fetchEventSponsors, addEventSponsor, deleteEventSponsor,
  getFaviconUrl, searchArtists,
  setEventStatus,
} from '@/services/events';
import type { Event, EventScheduleSlot, EventLiveLink, EventSponsor, Artist, SponsorTier } from '@/types';

interface EventManagementModalProps {
  event: Event | null;
  onClose: () => void;
  onToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
}

type Tab = 'schedule' | 'live' | 'sponsors';

const PLATFORMS = ['YouTube', 'Twitch', 'Facebook', 'Instagram', 'TikTok', 'Other'];
const TIERS: { value: SponsorTier; label: string; color: string }[] = [
  { value: 'gold', label: 'Or', color: 'bg-yellow-400' },
  { value: 'silver', label: 'Argent', color: 'bg-gray-400' },
  { value: 'bronze', label: 'Bronze', color: 'bg-orange-400' },
  { value: 'partner', label: 'Partenaire', color: 'bg-[#6600FF]' },
];

export function EventManagementModal({ event, onClose, onToast }: EventManagementModalProps) {
  const [tab, setTab] = useState<Tab>('schedule');
  const [schedule, setSchedule] = useState<(EventScheduleSlot & { artist?: Artist })[]>([]);
  const [liveLinks, setLiveLinks] = useState<EventLiveLink[]>([]);
  const [sponsors, setSponsors] = useState<EventSponsor[]>([]);
  const [loading, setLoading] = useState(false);
  const [slotForm, setSlotForm] = useState({ day_label: 'Jour 1', stage_name: 'Scène principale', start_time: '', end_time: '', title: '', artist_id: '' });
  const [artistSearch, setArtistSearch] = useState('');
  const [artistResults, setArtistResults] = useState<Artist[]>([]);
  const [linkForm, setLinkForm] = useState({ platform: 'YouTube', url: '', title: '' });
  const [sponsorForm, setSponsorForm] = useState({ name: '', website_url: '', tier: 'partner' as SponsorTier, logo_url: '', logo_source: 'manual' as 'auto' | 'manual' });

  useEffect(() => {
    if (!event) return;
    setLoading(true);
    Promise.all([fetchEventSchedule(event.id), fetchEventLiveLinks(event.id), fetchEventSponsors(event.id)])
      .then(([sched, links, spons]) => { setSchedule(sched); setLiveLinks(links); setSponsors(spons); })
      .catch(() => {}).finally(() => setLoading(false));
  }, [event]);

  useEffect(() => {
    if (!artistSearch.trim()) { setArtistResults([]); return; }
    searchArtists(artistSearch).then(setArtistResults).catch(() => setArtistResults([]));
  }, [artistSearch]);

  if (!event) return null;

  const handleAddSlot = async () => {
    if (!event || !slotForm.start_time || !slotForm.title) return;
    try {
      await addScheduleSlot({ event_id: event.id, day_label: slotForm.day_label, stage_name: slotForm.stage_name, start_time: new Date(slotForm.start_time).toISOString(), end_time: slotForm.end_time ? new Date(slotForm.end_time).toISOString() : null, title: slotForm.title, artist_id: slotForm.artist_id || null, sort_order: schedule.length });
      setSlotForm({ day_label: slotForm.day_label, stage_name: slotForm.stage_name, start_time: '', end_time: '', title: '', artist_id: '' }); setArtistSearch('');
      const data = await fetchEventSchedule(event.id); setSchedule(data);
      onToast({ message: 'Créneau ajouté', type: 'success' });
    } catch { onToast({ message: 'Erreur', type: 'error' }); }
  };

  const handleDeleteSlot = async (id: string) => { try { await deleteScheduleSlot(id); setSchedule(schedule.filter((s) => s.id !== id)); } catch { onToast({ message: 'Erreur', type: 'error' }); } };
  const handleAddLink = async () => { if (!event || !linkForm.url) return; try { await addEventLiveLink(event.id, linkForm.platform, linkForm.url, linkForm.title || undefined); setLinkForm({ platform: 'YouTube', url: '', title: '' }); const data = await fetchEventLiveLinks(event.id); setLiveLinks(data); onToast({ message: 'Lien ajouté', type: 'success' }); } catch { onToast({ message: 'Erreur', type: 'error' }); } };
  const handleToggleLive = async (id: string, isLive: boolean) => { try { await toggleLiveLink(id, isLive); setLiveLinks(liveLinks.map((l) => l.id === id ? { ...l, is_live: isLive } : l)); } catch { onToast({ message: 'Erreur', type: 'error' }); } };
  const handleDeleteLink = async (id: string) => { try { await deleteEventLiveLink(id); setLiveLinks(liveLinks.filter((l) => l.id !== id)); } catch { onToast({ message: 'Erreur', type: 'error' }); } };
  const handleAddSponsor = async () => { if (!event || !sponsorForm.name) return; try { const logoUrl = sponsorForm.logo_source === 'auto' && sponsorForm.website_url ? getFaviconUrl(sponsorForm.website_url) : sponsorForm.logo_url; await addEventSponsor({ event_id: event.id, name: sponsorForm.name, website_url: sponsorForm.website_url || undefined, logo_url: logoUrl || undefined, tier: sponsorForm.tier, logo_source: sponsorForm.logo_source }); setSponsorForm({ name: '', website_url: '', tier: 'partner', logo_url: '', logo_source: 'manual' }); const data = await fetchEventSponsors(event.id); setSponsors(data); onToast({ message: 'Sponsor ajouté', type: 'success' }); } catch { onToast({ message: 'Erreur', type: 'error' }); } };
  const handleDeleteSponsor = async (id: string) => { try { await deleteEventSponsor(id); setSponsors(sponsors.filter((s) => s.id !== id)); } catch { onToast({ message: 'Erreur', type: 'error' }); } };
  const handleAutoFetchLogo = () => { if (!sponsorForm.website_url) return; const fav = getFaviconUrl(sponsorForm.website_url); setSponsorForm({ ...sponsorForm, logo_url: fav, logo_source: 'auto' }); onToast({ message: 'Logo récupéré automatiquement', type: 'success' }); };
  const handleStatusChange = async (status: 'published' | 'paused' | 'cancelled') => {
    try {
      await setEventStatus(event.id, status, status === 'cancelled' ? 'Annulé par l’organisateur' : undefined);
      onToast({ message: status === 'published' ? 'Ventes ouvertes' : status === 'paused' ? 'Ventes mises en pause' : 'Événement annulé', type: 'success' });
      onClose();
    } catch (error) {
      onToast({ message: error instanceof Error ? error.message : 'Transition impossible', type: 'error' });
    }
  };

  const tabs = [{ id: 'schedule' as Tab, label: 'Programme', icon: Calendar }, { id: 'live' as Tab, label: 'Live', icon: Video }, { id: 'sponsors' as Tab, label: 'Sponsors', icon: Award }];

  return (
    <Modal open={!!event} onClose={onClose} title={`Gérer: ${event.title}`}>
      <div className="mb-4 p-3 rounded-2xl bg-[#6600FF]/5">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Cycle de vie</p>
        <div className="flex gap-2">
          {event.status === 'paused' ? <button onClick={() => handleStatusChange('published')} className="flex-1 py-2 rounded-xl bg-[#6600FF] text-white text-xs font-bold">Reprendre les ventes</button> : <button onClick={() => handleStatusChange('paused')} disabled={event.status !== 'published'} className="flex-1 py-2 rounded-xl bg-white text-[#6600FF] text-xs font-bold disabled:opacity-40">Mettre en pause</button>}
          {event.status === 'cancelled' ? <span className="flex-1 py-2 text-center rounded-xl bg-red-100 text-red-600 text-xs font-bold">Annulé</span> : <button onClick={() => handleStatusChange('cancelled')} className="flex-1 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold">Annuler</button>}
        </div>
      </div>
      <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl mb-4">
        {tabs.map((t) => { const Icon = t.icon; return <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${tab === t.id ? 'bg-white shadow-sm text-[#6600FF] scale-105' : 'text-gray-500'}`}><Icon className="w-3.5 h-3.5" /> {t.label}</button>; })}
      </div>
      {loading ? <div className="flex items-center justify-center py-8"><div className="w-8 h-8 rounded-full border-3 border-[#6600FF]/30 border-t-[#6600FF] animate-spin" /></div> : <>
        {tab === 'schedule' && (<div className="space-y-4 animate-fade-in">{schedule.length > 0 && (<div className="space-y-2">{schedule.map((slot) => (<div key={slot.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl"><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-[#1A1A2E]">{slot.title}</p><p className="text-xs text-gray-500">{slot.day_label} · {new Date(slot.start_time).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {slot.stage_name}{slot.artist && ` · ${slot.artist.name}`}</p></div><button onClick={() => handleDeleteSlot(slot.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 className="w-4 h-4" /></button></div>))}</div>)}
          <div className="p-4 bg-white border-2 border-gray-100 rounded-2xl space-y-3"><h3 className="text-sm font-bold text-[#1A1A2E]">Ajouter un créneau</h3><div className="grid grid-cols-2 gap-2"><input type="text" placeholder="Jour (ex: Jour 1)" value={slotForm.day_label} onChange={(e) => setSlotForm({ ...slotForm, day_label: e.target.value })} className="px-3 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40" /><input type="text" placeholder="Scène" value={slotForm.stage_name} onChange={(e) => setSlotForm({ ...slotForm, stage_name: e.target.value })} className="px-3 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40" /></div><input type="text" placeholder="Titre (ex: Concert, Ouverture...)" value={slotForm.title} onChange={(e) => setSlotForm({ ...slotForm, title: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40" /><div className="grid grid-cols-2 gap-2"><input type="datetime-local" placeholder="Début" value={slotForm.start_time} onChange={(e) => setSlotForm({ ...slotForm, start_time: e.target.value })} className="px-3 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40" /><input type="datetime-local" placeholder="Fin" value={slotForm.end_time} onChange={(e) => setSlotForm({ ...slotForm, end_time: e.target.value })} className="px-3 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40" /></div><input type="text" placeholder="Rechercher un artiste (optionnel)..." value={artistSearch} onChange={(e) => { setArtistSearch(e.target.value); setSlotForm({ ...slotForm, artist_id: '' }); }} className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40" />{artistResults.length > 0 && (<div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">{artistResults.map((a) => (<button key={a.id} onClick={() => { setSlotForm({ ...slotForm, artist_id: a.id }); setArtistSearch(a.name); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${slotForm.artist_id === a.id ? 'bg-[#6600FF] text-white' : 'bg-gray-100 text-gray-600'}`}><img src={a.photo_url || `https://i.pravatar.cc/50?u=${a.id}`} alt="" className="w-5 h-5 rounded-full" />{a.name}{slotForm.artist_id === a.id && <Check className="w-3 h-3" />}</button>))}</div>)}<button onClick={handleAddSlot} disabled={!slotForm.start_time || !slotForm.title} className="w-full py-3 bg-[#6600FF] text-white text-sm font-bold rounded-2xl disabled:opacity-40 active:scale-95 transition-transform"><Plus className="w-4 h-4 inline mr-1" /> Ajouter</button></div></div>)}
        {tab === 'live' && (<div className="space-y-4 animate-fade-in">{liveLinks.length > 0 && (<div className="space-y-2">{liveLinks.map((link) => (<div key={link.id} className={`flex items-center gap-3 p-3 rounded-2xl ${link.is_live ? 'bg-red-50 border-2 border-red-200' : 'bg-gray-50'}`}><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-[#1A1A2E]">{link.platform}</p><p className="text-xs text-gray-500 truncate">{link.url}</p></div><button onClick={() => handleToggleLive(link.id, !link.is_live)} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${link.is_live ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 text-gray-600'}`}><Radio className="w-3 h-3 inline mr-1" />{link.is_live ? 'LIVE' : 'Activer'}</button><button onClick={() => handleDeleteLink(link.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 transition-all"><Trash2 className="w-4 h-4" /></button></div>))}</div>)}<div className="p-4 bg-white border-2 border-gray-100 rounded-2xl space-y-3"><h3 className="text-sm font-bold text-[#1A1A2E]">Ajouter un lien de live</h3><select value={linkForm.platform} onChange={(e) => setLinkForm({ ...linkForm, platform: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40">{PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}</select><input type="url" placeholder="https://youtube.com/watch?v=..." value={linkForm.url} onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40" /><input type="text" placeholder="Titre (optionnel)" value={linkForm.title} onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40" /><button onClick={handleAddLink} disabled={!linkForm.url} className="w-full py-3 bg-[#6600FF] text-white text-sm font-bold rounded-2xl disabled:opacity-40 active:scale-95 transition-transform"><Plus className="w-4 h-4 inline mr-1" /> Ajouter</button></div></div>)}
        {tab === 'sponsors' && (<div className="space-y-4 animate-fade-in">{sponsors.length > 0 && (<div className="space-y-2">{sponsors.map((sponsor) => (<div key={sponsor.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">{sponsor.logo_url ? <img src={sponsor.logo_url} alt="" className="w-10 h-10 rounded-xl object-contain" /> : <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-bold text-gray-400">{sponsor.name.charAt(0)}</div>}<div className="flex-1 min-w-0"><p className="text-sm font-semibold text-[#1A1A2E]">{sponsor.name}</p><p className="text-xs text-gray-500 capitalize">{sponsor.tier} {sponsor.logo_source === 'auto' && '· Logo auto'}</p></div><button onClick={() => handleDeleteSponsor(sponsor.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 transition-all"><Trash2 className="w-4 h-4" /></button></div>))}</div>)}<div className="p-4 bg-white border-2 border-gray-100 rounded-2xl space-y-3"><h3 className="text-sm font-bold text-[#1A1A2E]">Ajouter un sponsor</h3><input type="text" placeholder="Nom du sponsor" value={sponsorForm.name} onChange={(e) => setSponsorForm({ ...sponsorForm, name: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40" /><input type="url" placeholder="Site web (https://...)" value={sponsorForm.website_url} onChange={(e) => setSponsorForm({ ...sponsorForm, website_url: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40" /><div className="flex gap-2">{TIERS.map((t) => (<button key={t.value} onClick={() => setSponsorForm({ ...sponsorForm, tier: t.value })} className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${sponsorForm.tier === t.value ? 'ring-2 ring-[#6600FF] scale-105' : 'opacity-60'}`}><div className={`w-3 h-3 rounded-full ${t.color} mx-auto mb-1`} />{t.label}</button>))}</div><div className="flex gap-2"><button onClick={handleAutoFetchLogo} disabled={!sponsorForm.website_url} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#6600FF]/10 text-[#6600FF] rounded-xl text-xs font-semibold disabled:opacity-40 active:scale-95 transition-transform"><Globe className="w-3.5 h-3.5" /> Auto (favicon)</button><label className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-transform"><Upload className="w-3.5 h-3.5" /> Manuel (URL)<input type="url" placeholder="URL du logo" value={sponsorForm.logo_url} onChange={(e) => setSponsorForm({ ...sponsorForm, logo_url: e.target.value, logo_source: 'manual' })} className="hidden" /></label></div>{sponsorForm.logo_url && (<div className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl"><img src={sponsorForm.logo_url} alt="" className="w-8 h-8 rounded-lg object-contain" /><span className="text-xs text-gray-500 flex-1">Logo {sponsorForm.logo_source === 'auto' ? 'récupéré automatiquement' : 'manuel'}</span><button onClick={() => setSponsorForm({ ...sponsorForm, logo_url: '', logo_source: 'manual' })} className="text-gray-400"><X className="w-4 h-4" /></button></div>)}<button onClick={handleAddSponsor} disabled={!sponsorForm.name} className="w-full py-3 bg-[#6600FF] text-white text-sm font-bold rounded-2xl disabled:opacity-40 active:scale-95 transition-transform"><Plus className="w-4 h-4 inline mr-1" /> Ajouter</button></div></div>)}
      </>}
    </Modal>
  );
}
