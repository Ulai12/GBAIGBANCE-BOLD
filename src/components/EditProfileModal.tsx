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
    } catch {
      onToast({ message: 'Erreur lors de l\'upload', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, { name, bio, city, country, avatar_url: avatarUrl });
      await refreshProfile();
      onToast({ message: 'Profil mis à jour', type: 'success' });
      onClose();
    } catch {
      onToast({ message: 'Erreur lors de la sauvegarde', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Modifier le profil">
      {/* Zone Avatar */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full ring-4 ring-gray-50 dark:ring-[#0F0F1A] overflow-hidden bg-gray-100 dark:bg-white/5 flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-extrabold text-[#6600FF]">{name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-[#6600FF] flex items-center justify-center shadow-md active:scale-90 transition-transform disabled:opacity-50 ring-2 ring-white dark:ring-[#1A1A2E]"
          >
            {uploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">Appuyez pour modifier</p>
      </div>

      {/* Formulaire */}
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block ml-1">Nom complet</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3.5 rounded-2xl text-sm font-medium bg-gray-50 dark:bg-white/5 text-[#1A1A2E] dark:text-white border border-gray-200 dark:border-white/10 focus:outline-none focus:border-[#6600FF] focus:ring-4 focus:ring-[#6600FF]/10 transition-all placeholder:text-gray-400"
            placeholder="Votre nom"
          />
        </div>
        
        <div>
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block ml-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={200}
            className="w-full px-4 py-3.5 rounded-2xl text-sm bg-gray-50 dark:bg-white/5 text-[#1A1A2E] dark:text-white border border-gray-200 dark:border-white/10 focus:outline-none focus:border-[#6600FF] focus:ring-4 focus:ring-[#6600FF]/10 transition-all resize-none placeholder:text-gray-400"
            placeholder="Parlez-nous de vous..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block ml-1">Ville</label>
            <select
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                const c = CITIES.find((c) => c.value === e.target.value);
                if (c) setCountry(c.country);
              }}
              className="w-full px-4 py-3.5 rounded-2xl text-sm font-medium bg-gray-50 dark:bg-white/5 text-[#1A1A2E] dark:text-white border border-gray-200 dark:border-white/10 focus:outline-none focus:border-[#6600FF] focus:ring-4 focus:ring-[#6600FF]/10 transition-all appearance-none"
            >
              {CITIES.map((c) => (
                <option key={c.value} value={c.value}>{c.value}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block ml-1">Pays</label>
            <div className="w-full px-4 py-3.5 rounded-2xl text-sm font-medium bg-gray-100/50 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-white/5 flex items-center gap-2 cursor-not-allowed">
              <span className="text-lg leading-none">{COUNTRY_FLAGS[country]}</span>
              <span className="truncate">{COUNTRY_NAMES[country]}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-8">
        <button
          onClick={onClose}
          className="flex-1 py-3.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-white/10 active:scale-95 transition-all"
        >
          <X className="w-4 h-4" /> Annuler
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex-1 py-3.5 rounded-full bg-[#6600FF] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#5500DD] active:scale-95 transition-all disabled:opacity-50 disabled:hover:bg-[#6600FF]"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Enregistrer</>}
        </button>
      </div>
    </Modal>
  );
}
