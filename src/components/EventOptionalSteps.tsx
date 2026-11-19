import { Plus, Radio, Trash2, Video, Award, Calendar } from 'lucide-react';
import type { SponsorTier } from '@/types';
import { useApp } from '@/hooks/useApp';

export interface ScheduleItem {
  day_label: string;
  stage_name: string;
  start_time: string;
  end_time: string;
  title: string;
  artist_id: string;
}

export interface LiveItem {
  platform: string;
  url: string;
  title: string;
}

export interface SponsorItem {
  name: string;
  website_url: string;
  tier: SponsorTier;
  logo_url: string;
  logo_source: 'auto' | 'manual';
}

interface EventOptionalStepsProps {
  step: 'Programme' | 'Live' | 'Sponsors';
  scheduleItems: ScheduleItem[];
  setScheduleItems: (items: ScheduleItem[]) => void;
  liveItems: LiveItem[];
  setLiveItems: (items: LiveItem[]) => void;
  isLiveEvent: boolean;
  setIsLiveEvent: (value: boolean) => void;
  sponsorItems: SponsorItem[];
  setSponsorItems: (items: SponsorItem[]) => void;
}

const TIERS: { value: SponsorTier; labelKey: string }[] = [
  { value: 'gold', labelKey: 'tierGold' },
  { value: 'silver', labelKey: 'tierSilver' },
  { value: 'bronze', labelKey: 'tierBronze' },
  { value: 'partner', labelKey: 'tierPartner' },
];

const inputClass = 'w-full px-4 py-3 form-surface rounded-2xl text-[#171726] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40';

export function EventOptionalSteps({
  step,
  scheduleItems,
  setScheduleItems,
  liveItems,
  setLiveItems,
  isLiveEvent,
  setIsLiveEvent,
  sponsorItems,
  setSponsorItems,
}: EventOptionalStepsProps) {
  const { t } = useApp();

  if (step === 'Programme') {
    const addSlot = () => setScheduleItems([...scheduleItems, { day_label: `${t('common', 'day')} 1`, stage_name: t('events', 'creation.optional.mainStage'), start_time: '', end_time: '', title: '', artist_id: '' }]);
    return (
      <div className="space-y-4 animate-slide-up">
        <div className="flex items-center justify-between">
          <div><h2 className="text-lg font-extrabold text-[#171726]">{t('events', 'creation.optional.programTitle')}</h2><p className="text-sm text-gray-500">{t('events', 'creation.optional.programDescription')}</p></div>
          <button type="button" onClick={addSlot} className="w-10 h-10 rounded-full bg-[#6600FF] text-white flex items-center justify-center shadow-purple" aria-label={t('events', 'creation.optional.addSlot')}><Plus className="w-5 h-5" /></button>
        </div>
        {scheduleItems.length === 0 ? <div className="card p-6 text-center"><Calendar className="w-8 h-8 text-[#6600FF]/50 mx-auto mb-2" /><p className="text-sm text-gray-500">{t('events', 'creation.optional.emptyProgram')}</p></div> : scheduleItems.map((item, index) => (
          <div key={index} className="card p-4 space-y-3">
            <div className="flex items-center justify-between"><span className="text-sm font-bold text-[#171726]">{t('events', 'creation.optional.slotNumber').replace('{number}', String(index + 1))}</span><button type="button" onClick={() => setScheduleItems(scheduleItems.filter((_, itemIndex) => itemIndex !== index))} className="text-red-500" aria-label={t('events', 'creation.optional.removeSlot')}><Trash2 className="w-4 h-4" /></button></div>
            <input className={inputClass} value={item.title} onChange={(event) => setScheduleItems(scheduleItems.map((current, itemIndex) => itemIndex === index ? { ...current, title: event.target.value } : current))} placeholder={t('events', 'creation.optional.momentTitle')} />
            <div className="grid grid-cols-2 gap-2"><input className={inputClass} type="datetime-local" value={item.start_time} onChange={(event) => setScheduleItems(scheduleItems.map((current, itemIndex) => itemIndex === index ? { ...current, start_time: event.target.value } : current))} /><input className={inputClass} type="datetime-local" value={item.end_time} onChange={(event) => setScheduleItems(scheduleItems.map((current, itemIndex) => itemIndex === index ? { ...current, end_time: event.target.value } : current))} /></div>
          </div>
        ))}
      </div>
    );
  }

  if (step === 'Live') {
    const addLive = () => setLiveItems([...liveItems, { platform: 'YouTube', url: '', title: '' }]);
    return (
      <div className="space-y-4 animate-slide-up">
        <div className="flex items-center justify-between"><div><h2 className="text-lg font-extrabold text-[#171726]">{t('events', 'creation.optional.liveTitle')}</h2><p className="text-sm text-gray-500">{t('events', 'creation.optional.liveDescription')}</p></div><button type="button" onClick={() => setIsLiveEvent(!isLiveEvent)} className={`w-12 h-7 rounded-full relative transition-colors ${isLiveEvent ? 'bg-[#6600FF]' : 'bg-gray-300'}`} aria-label={t('events', 'creation.optional.enableLive')}><span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${isLiveEvent ? 'translate-x-6' : 'translate-x-1'}`} /></button></div>
        {isLiveEvent && <><button type="button" onClick={addLive} className="w-full py-3 rounded-2xl border border-dashed border-[#6600FF]/40 text-[#6600FF] font-bold flex items-center justify-center gap-2"><Video className="w-4 h-4" /> {t('events', 'creation.optional.addLiveLink')}</button>{liveItems.map((item, index) => <div key={index} className="card p-4 space-y-3"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-bold"><Radio className="w-4 h-4 text-red-500" /> {t('events', 'creation.optional.liveNumber').replace('{number}', String(index + 1))}</span><button type="button" onClick={() => setLiveItems(liveItems.filter((_, itemIndex) => itemIndex !== index))} className="text-red-500" aria-label={t('events', 'creation.optional.removeLiveLink')}><Trash2 className="w-4 h-4" /></button></div><select className={inputClass} value={item.platform} onChange={(event) => setLiveItems(liveItems.map((current, itemIndex) => itemIndex === index ? { ...current, platform: event.target.value } : current))}><option>YouTube</option><option>Facebook</option><option>TikTok</option><option>Instagram</option></select><input className={inputClass} value={item.url} onChange={(event) => setLiveItems(liveItems.map((current, itemIndex) => itemIndex === index ? { ...current, url: event.target.value } : current))} placeholder="https://..." /><input className={inputClass} value={item.title} onChange={(event) => setLiveItems(liveItems.map((current, itemIndex) => itemIndex === index ? { ...current, title: event.target.value } : current))} placeholder={t('events', 'creation.optional.optionalTitle')} /></div>)}</>}
      </div>
    );
  }

  const addSponsor = () => setSponsorItems([...sponsorItems, { name: '', website_url: '', tier: 'partner', logo_url: '', logo_source: 'manual' }]);
  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between"><div><h2 className="text-lg font-extrabold text-[#171726]">{t('events', 'creation.optional.sponsorsTitle')}</h2><p className="text-sm text-gray-500">{t('events', 'creation.optional.sponsorsDescription')}</p></div><button type="button" onClick={addSponsor} className="w-10 h-10 rounded-full bg-[#6600FF] text-white flex items-center justify-center shadow-purple" aria-label={t('events', 'creation.optional.addSponsor')}><Plus className="w-5 h-5" /></button></div>
      {sponsorItems.length === 0 ? <div className="card p-6 text-center"><Award className="w-8 h-8 text-[#6600FF]/50 mx-auto mb-2" /><p className="text-sm text-gray-500">{t('events', 'creation.optional.emptySponsors')}</p></div> : sponsorItems.map((item, index) => <div key={index} className="card p-4 space-y-3"><div className="flex items-center justify-between"><span className="text-sm font-bold text-[#171726]">{t('events', 'creation.optional.partnerNumber').replace('{number}', String(index + 1))}</span><button type="button" onClick={() => setSponsorItems(sponsorItems.filter((_, itemIndex) => itemIndex !== index))} className="text-red-500" aria-label={t('events', 'creation.optional.removeSponsor')}><Trash2 className="w-4 h-4" /></button></div><input className={inputClass} value={item.name} onChange={(event) => setSponsorItems(sponsorItems.map((current, itemIndex) => itemIndex === index ? { ...current, name: event.target.value } : current))} placeholder={t('events', 'creation.optional.sponsorName')} /><input className={inputClass} value={item.website_url} onChange={(event) => setSponsorItems(sponsorItems.map((current, itemIndex) => itemIndex === index ? { ...current, website_url: event.target.value } : current))} placeholder={t('events', 'creation.optional.websiteOptional')} /><select className={inputClass} value={item.tier} onChange={(event) => setSponsorItems(sponsorItems.map((current, itemIndex) => itemIndex === index ? { ...current, tier: event.target.value as SponsorTier } : current))}>{TIERS.map((tier) => <option key={tier.value} value={tier.value}>{t('events', `creation.optional.${tier.labelKey}`)}</option>)}</select></div>)}
    </div>
  );
}
