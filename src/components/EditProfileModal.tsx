import { useState } from 'react';
import { Camera, Loader2, Check, X, Sliders } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useApp } from '@/hooks/useApp';
import { updateProfile } from '@/services/auth';
import { UserAvatar } from '@/components/UserAvatar';
import { ProfilePictureModal } from '@/components/ProfilePictureModal';
import { CITIES, COUNTRY_FLAGS, COUNTRY_NAMES } from '@/constants';
import type { ToastData } from '@/components/Toast';

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  onToast: (toast: Omit<ToastData, 'id'>) => void;
}

export function EditProfileModal({ open, onClose, onToast }: EditProfileModalProps) {
  const { user, refreshProfile } = useApp();
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [city, setCity] = useState(user?.city || 'Lomé');
  const [country, setCountry] = useState(user?.country || 'TG');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [pictureModalOpen, setPictureModalOpen] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, { name, bio, city, country, avatar_url: avatarUrl });
      await refreshProfile();
      onToast({ message: 'Profil mis à jour avec succès', type: 'success' });
      onClose();
    } catch {
      onToast({ message: 'Erreur lors de la sauvegarde', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title="Modifier le profil">
        {/* Zone Avatar avec outil de recadrage/redimensionnement */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative group cursor-pointer" onClick={() => setPictureModalOpen(true)}>
            <div className="ring-4 ring-gray-100 dark:ring-white/10 rounded-full shadow-lg">
              <UserAvatar
                src={avatarUrl}
                name={name || 'Membre'}
                role={user?.role || 'attendee'}
                size="2xl"
              />
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPictureModalOpen(true);
              }}
              className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-[#6600FF] flex items-center justify-center shadow-lg active:scale-90 transition-transform ring-4 ring-white dark:ring-[#1A1A2E] text-white"
              title="Changer et recadrer la photo de profil"
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setPictureModalOpen(true)}
            className="text-xs font-semibold text-[#6600FF] dark:text-[#A78BFA] mt-3 hover:underline flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            Recadrer ou changer la photo
          </button>
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

    <ProfilePictureModal
      open={pictureModalOpen}
      onClose={() => setPictureModalOpen(false)}
      onSuccess={(newAvatarUrl: string) => {
        setAvatarUrl(newAvatarUrl);
      }}
      onToast={onToast}
    />
  </>
  );
}
