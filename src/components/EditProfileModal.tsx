import { useState, useRef } from 'react';
import { Camera, Loader2, Check, X } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useApp } from '@/hooks/useApp';
import { updateProfile } from '@/services/auth';
import { supabase } from '@/services/supabase';
import { CITIES, COUNTRY_FLAGS, COUNTRY_NAMES } from '@/constants';
import type { ToastData } from '@/components/Toast';

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  onToast: (toast: Omit<ToastData, 'id'>) => void;
}

export function EditProfileModal({ open, onClose, onToast }: EditProfileModalProps) {
  const { user, refreshProfile } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [city, setCity] = useState(user?.city || 'Lomé');
  const [country, setCountry] = useState(user?.country || 'TG');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { cacheControl: '3600', upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(pub.publicUrl);
      onToast({ message: 'Photo mise à jour', type: 'success' });
    } catch { onToast({ message: 'Erreur lors de l\'upload', type: 'error' }); } finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, { name, bio, city, country, avatar_url: avatarUrl });
      await refreshProfile();
      onToast({ message: 'Profil mis à jour', type: 'success' });
      onClose();
    } catch { onToast({ message: 'Erreur lors de la sauvegarde', type: 'error' }); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Modifier le profil">
      <div className="flex flex-col items-center mb-5">
        <div className="relative">
          <div className="w-24 h-24 rounded-full ring-4 ring-[#6600FF]/20 overflow-hidden bg-[#6600FF]/10 flex items-center justify-center">
            {avatarUrl ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" /> : <span className="text-3xl font-extrabold text-[#6600FF]">{name.charAt(0).toUpperCase()}</span>}
          </div>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#6600FF] flex items-center justify-center shadow-lg active:scale-90 transition-transform disabled:opacity-50">
            {uploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </div>
        <p className="text-xs text-gray-400 mt-2">Appuyez sur l'appareil photo pour changer</p>
      </div>
      <div className="space-y-4">
        <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Nom</label><input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-medium text-[#1A1A2E] focus:outline-none focus:border-[#6600FF] focus:ring-2 focus:ring-[#6600FF]/10 transition-all" /></div>
        <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Bio</label><textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={200} className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm text-[#1A1A2E] focus:outline-none focus:border-[#6600FF] focus:ring-2 focus:ring-[#6600FF]/10 transition-all resize-none" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Ville</label><select value={city} onChange={(e) => { setCity(e.target.value); const c = CITIES.find((c) => c.value === e.target.value); if (c) setCountry(c.country); }} className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-medium text-[#1A1A2E] focus:outline-none focus:border-[#6600FF] transition-all">{CITIES.map((c) => <option key={c.value} value={c.value}>{c.value}</option>)}</select></div>
          <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Pays</label><div className="px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-medium text-[#1A1A2E] flex items-center gap-2"><span className="text-lg">{COUNTRY_FLAGS[country]}</span><span>{COUNTRY_NAMES[country]}</span></div></div>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="flex-1 py-3 rounded-full bg-gray-100 text-gray-600 text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"><X className="w-4 h-4" /> Annuler</button>
        <button onClick={handleSave} disabled={saving || !name.trim()} className="flex-1 py-3 rounded-full bg-[#6600FF] text-white text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform disabled:opacity-40 shadow-lg shadow-[#6600FF]/30">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Enregistrer</>}</button>
      </div>
    </Modal>
  );
}
