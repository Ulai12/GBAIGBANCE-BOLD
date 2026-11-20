import { Plus, Radio, Trash2, Video, Award, Calendar, Clock, Tv, Globe2, Building2, Sparkles } from 'lucide-react';
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

const TIERS: { value: SponsorTier; labelKey: string; tone: string }[] = [
  { value: 'gold', labelKey: 'tierGold', tone: 'border-amber-400/30 bg-amber-400/10 text-amber-700 dark:text-amber-300' },
  { value: 'silver', labelKey: 'tierSilver', tone: 'border-slate-400/30 bg-slate-400/10 text-slate-600 dark:text-slate-300' },
  { value: 'bronze', labelKey: 'tierBronze', tone: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300' },
  { value: 'partner', labelKey: 'tierPartner', tone: 'border-[#6600FF]/20 bg-[#6600FF]/[0.07] text-[#6600FF] dark:text-purple-300' },
];

const inputClass = 'w-full min-w-0 rounded-2xl border border-black/[0.07] bg-white px-4 py-3.5 text-sm font-medium text-[#17131D] shadow-xs transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40 dark:border-white/[0.08] dark:bg-[#1A1829] dark:text-white';
const labelClass = 'mb-1.5 block text-[11px] font-bold text-gray-500 dark:text-gray-400';
const cardClass = 'rounded-[22px] border border-black/[0.06] bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#1A1829]';

export function EventOptionalSteps({
  step, scheduleItems, setScheduleItems, liveItems, setLiveItems,
  isLiveEvent, setIsLiveEvent, sponsorItems, setSponsorItems,
}: EventOptionalStepsProps) {
  const { t } = useApp();
  const copy = (key: string) => t('events', `creation.optional.${key}`);

  if (step === 'Programme') {
    const update = (index: number, patch: Partial<ScheduleItem>) =>
      setScheduleItems(scheduleItems.map((item, i) => i === index ? { ...item, ...patch } : item));
    const addSlot = () => setScheduleItems([...scheduleItems, {
      day_label: `${t('common', 'day')} 1`, stage_name: copy('mainStage'),
      start_time: '', end_time: '', title: '', artist_id: '',
    }]);
    const completeCount = scheduleItems.filter((item) => item.title.trim() && item.start_time).length;
    return (
      <section className="space-y-4 animate-slide-up">
        <div className="rounded-[24px] bg-gradient-to-br from-[#6600FF]/[0.11] via-[#8B5CF6]/[0.06] to-transparent p-4 dark:from-[#6600FF]/20">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-[#6600FF] dark:text-purple-300"><Calendar className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-[0.15em]">{copy('programEyebrow')}</span></div>
              <h2 className="text-xl font-extrabold text-[#17131D] dark:text-white">{copy('programTitle')}</h2>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-gray-600 dark:text-gray-400">{copy('programDescription')}</p>
            </div>
            <div className="rounded-2xl bg-white/80 px-3 py-2 text-center shadow-sm dark:bg-white/10">
              <p className="text-lg font-black tabular-nums text-[#6600FF] dark:text-purple-300">{completeCount}</p>
              <p className="text-[9px] font-bold text-gray-500">{copy('programReady')}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{copy('programSlots')}</p>
          <button type="button" onClick={addSlot} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#6600FF] px-4 text-xs font-bold text-white shadow-[0_6px_18px_rgba(102,0,255,.2)] transition-transform active:scale-95"><Plus className="h-4 w-4" />{copy('addSlot')}</button>
        </div>
        {scheduleItems.length === 0 ? (
          <div className={`${cardClass} border-dashed py-9 text-center`}><Calendar className="mx-auto mb-3 h-9 w-9 text-[#6600FF]/50" /><p className="text-sm font-bold text-[#17131D] dark:text-white">{copy('emptyProgram')}</p><p className="mt-1 text-xs text-gray-500">{copy('emptyProgramHint')}</p></div>
        ) : scheduleItems.map((item, index) => (
          <article key={index} className={`${cardClass} space-y-3`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#6600FF]/10 text-xs font-black text-[#6600FF] dark:text-purple-300">{String(index + 1).padStart(2, '0')}</span><span className="text-sm font-extrabold text-[#17131D] dark:text-white">{copy('slotNumber').replace('{number}', String(index + 1))}</span></div>
              <button type="button" onClick={() => setScheduleItems(scheduleItems.filter((_, i) => i !== index))} aria-label={copy('removeSlot')} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"><Trash2 className="h-4 w-4" /></button>
            </div>
            <label><span className={labelClass}>{copy('momentTitleLabel')}</span><input className={inputClass} value={item.title} onChange={(event) => update(index, { title: event.target.value })} placeholder={copy('momentTitle')} /></label>
            <div className="grid grid-cols-2 gap-2">
              <label><span className={labelClass}>{copy('dayLabel')}</span><input className={inputClass} value={item.day_label} onChange={(event) => update(index, { day_label: event.target.value })} placeholder={copy('dayPlaceholder')} /></label>
              <label><span className={labelClass}>{copy('stageLabel')}</span><input className={inputClass} value={item.stage_name} onChange={(event) => update(index, { stage_name: event.target.value })} placeholder={copy('mainStage')} /></label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label><span className={labelClass}>{copy('startTime')}</span><span className="relative block"><Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input aria-label={copy('startTime')} className={`${inputClass} pl-9`} type="datetime-local" value={item.start_time} onChange={(event) => update(index, { start_time: event.target.value })} /></span></label>
              <label><span className={labelClass}>{copy('endTime')}</span><span className="relative block"><Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input aria-label={copy('endTime')} className={`${inputClass} pl-9`} type="datetime-local" min={item.start_time || undefined} value={item.end_time} onChange={(event) => update(index, { end_time: event.target.value })} /></span></label>
            </div>
          </article>
        ))}
        <p className="flex items-start gap-2 px-1 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6600FF]" />{copy('programHint')}</p>
      </section>
    );
  }

  if (step === 'Live') {
    const update = (index: number, patch: Partial<LiveItem>) =>
      setLiveItems(liveItems.map((item, i) => i === index ? { ...item, ...patch } : item));
    const addLive = () => setLiveItems([...liveItems, { platform: 'YouTube', url: '', title: '' }]);
    const readyCount = liveItems.filter((item) => item.url.trim()).length;
    return (
      <section className="space-y-4 animate-slide-up">
        <div className="rounded-[24px] bg-gradient-to-br from-red-500/[0.09] via-[#6600FF]/[0.06] to-transparent p-4 dark:from-red-500/10">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500 text-white"><Radio className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1"><h2 className="text-xl font-extrabold text-[#17131D] dark:text-white">{copy('liveTitle')}</h2><p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400">{copy('liveDescription')}</p></div>
            <button type="button" role="switch" aria-checked={isLiveEvent} aria-label={copy('enableLive')} onClick={() => setIsLiveEvent(!isLiveEvent)} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${isLiveEvent ? 'bg-[#6600FF]' : 'bg-gray-300 dark:bg-gray-600'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${isLiveEvent ? 'translate-x-6' : 'translate-x-1'}`} /></button>
          </div>
          <p className="mt-3 text-[10px] font-bold text-gray-500 dark:text-gray-400">{isLiveEvent ? copy('liveEnabled') : copy('liveDisabled')}</p>
        </div>
        {isLiveEvent && <>
          <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold text-gray-500 dark:text-gray-400">{copy('liveLinks')} · {readyCount}</p><button type="button" onClick={addLive} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#6600FF] px-4 text-xs font-bold text-white"><Plus className="h-4 w-4" />{copy('addLiveLink')}</button></div>
          {liveItems.length === 0 ? <div className={`${cardClass} border-dashed py-7 text-center`}><Video className="mx-auto mb-2 h-8 w-8 text-[#6600FF]/50" /><p className="text-sm font-bold text-[#17131D] dark:text-white">{copy('emptyLive')}</p></div> : liveItems.map((item, index) => (
            <article key={index} className={`${cardClass} space-y-3`}>
              <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm font-extrabold text-[#17131D] dark:text-white"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/10 text-red-500"><Tv className="h-4 w-4" /></span>{copy('liveNumber').replace('{number}', String(index + 1))}</span><button type="button" onClick={() => setLiveItems(liveItems.filter((_, i) => i !== index))} aria-label={copy('removeLiveLink')} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button></div>
              <label><span className={labelClass}>{copy('platform')}</span><select className={inputClass} value={item.platform} onChange={(event) => update(index, { platform: event.target.value })}><option>YouTube</option><option>Twitch</option><option>Facebook</option><option>Instagram</option><option>TikTok</option><option>Other</option></select></label>
              <label><span className={labelClass}>{copy('liveUrl')}</span><input type="url" inputMode="url" className={inputClass} value={item.url} onChange={(event) => update(index, { url: event.target.value })} placeholder="https://..." /></label>
              <label><span className={labelClass}>{copy('optionalTitle')}</span><input className={inputClass} value={item.title} onChange={(event) => update(index, { title: event.target.value })} placeholder={copy('liveTitlePlaceholder')} /></label>
            </article>
          ))}
        </>}
        {!isLiveEvent && <div className={`${cardClass} border-dashed py-7 text-center`}><Video className="mx-auto mb-2 h-8 w-8 text-gray-400" /><p className="text-sm font-bold text-[#17131D] dark:text-white">{copy('liveOffTitle')}</p><p className="mt-1 text-xs text-gray-500">{copy('liveOffHint')}</p></div>}
      </section>
    );
  }

  const updateSponsor = (index: number, patch: Partial<SponsorItem>) =>
    setSponsorItems(sponsorItems.map((item, i) => i === index ? { ...item, ...patch } : item));
  const addSponsor = () => setSponsorItems([...sponsorItems, { name: '', website_url: '', tier: 'partner', logo_url: '', logo_source: 'manual' }]);
  const configuredSponsors = sponsorItems.filter((item) => item.name.trim()).length;
  return (
    <section className="space-y-4 animate-slide-up">
      <div className="rounded-[24px] bg-gradient-to-br from-amber-400/[0.14] via-[#6600FF]/[0.05] to-transparent p-4 dark:from-amber-400/10">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="mb-2 flex items-center gap-2 text-amber-600 dark:text-amber-300"><Award className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-[0.15em]">{copy('sponsorsEyebrow')}</span></div><h2 className="text-xl font-extrabold text-[#17131D] dark:text-white">{copy('sponsorsTitle')}</h2><p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400">{copy('sponsorsDescription')}</p></div><span className="rounded-2xl bg-white/80 px-3 py-2 text-lg font-black tabular-nums text-amber-600 shadow-sm dark:bg-white/10 dark:text-amber-300">{configuredSponsors}</span></div>
      </div>
      <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold text-gray-500 dark:text-gray-400">{copy('sponsorList')}</p><button type="button" onClick={addSponsor} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#6600FF] px-4 text-xs font-bold text-white"><Plus className="h-4 w-4" />{copy('addSponsor')}</button></div>
      {sponsorItems.length === 0 ? <div className={`${cardClass} border-dashed py-8 text-center`}><Award className="mx-auto mb-2 h-9 w-9 text-amber-500/60" /><p className="text-sm font-bold text-[#17131D] dark:text-white">{copy('emptySponsors')}</p><p className="mt-1 text-xs text-gray-500">{copy('emptySponsorsHint')}</p></div> : sponsorItems.map((item, index) => (
        <article key={index} className={`${cardClass} space-y-3`}>
          <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm font-extrabold text-[#17131D] dark:text-white"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600"><Building2 className="h-4 w-4" /></span>{copy('partnerNumber').replace('{number}', String(index + 1))}</span><button type="button" onClick={() => setSponsorItems(sponsorItems.filter((_, i) => i !== index))} aria-label={copy('removeSponsor')} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button></div>
          <label><span className={labelClass}>{copy('sponsorName')}</span><input className={inputClass} value={item.name} onChange={(event) => updateSponsor(index, { name: event.target.value })} placeholder={copy('sponsorNamePlaceholder')} /></label>
          <label><span className={labelClass}>{copy('websiteOptional')}</span><input type="url" inputMode="url" className={inputClass} value={item.website_url} onChange={(event) => updateSponsor(index, { website_url: event.target.value, logo_source: 'auto' })} placeholder="https://..." /></label>
          <label><span className={labelClass}>{copy('logoUrlOptional')}</span><input type="url" inputMode="url" className={inputClass} value={item.logo_url} onChange={(event) => updateSponsor(index, { logo_url: event.target.value, logo_source: 'manual' })} placeholder="https://..." /></label>
          {item.logo_url && <div className="flex items-center gap-3 rounded-2xl bg-black/[0.025] p-3 dark:bg-white/[0.04]"><img src={item.logo_url} alt="" className="h-10 w-10 rounded-xl bg-white object-contain p-1" /><span className="text-xs font-semibold text-gray-500">{copy('logoPreview')}</span></div>}
          <div><span className={labelClass}>{copy('sponsorTier')}</span><div className="grid grid-cols-2 gap-2">{TIERS.map((tier) => <button type="button" key={tier.value} aria-pressed={item.tier === tier.value} onClick={() => updateSponsor(index, { tier: tier.value })} className={`min-h-11 rounded-2xl border px-3 text-xs font-bold transition-colors ${item.tier === tier.value ? tier.tone : 'border-black/[0.06] bg-black/[0.02] text-gray-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-400'}`}>{copy(tier.labelKey)}</button>)}</div></div>
        </article>
      ))}
      <p className="flex items-start gap-2 px-1 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400"><Globe2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6600FF]" />{copy('sponsorHint')}</p>
    </section>
  );
}
