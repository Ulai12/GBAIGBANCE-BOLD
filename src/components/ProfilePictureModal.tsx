import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Check,
  Loader2,
  Trash2,
  Move,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useApp } from '@/hooks/useApp';
import { updateProfile } from '@/services/auth';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import type { ToastData } from '@/components/Toast';

interface ProfilePictureModalProps {
  open: boolean;
  onClose: () => void;
  onToast: (toast: Omit<ToastData, 'id'>) => void;
  onSuccess?: (url: string) => void | Promise<void>;
}

export function ProfilePictureModal({ open, onClose, onToast, onSuccess }: ProfilePictureModalProps) {
  const { user, refreshProfile } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [saving, setSaving] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset states when modal opens
  useEffect(() => {
    if (open) {
      setSelectedImage(null);
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setSaving(false);
    }
  }, [open]);

  const handleSelectFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onToast({ message: 'Veuillez sélectionner un fichier image valide', type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  };

  const handleImageLoaded = () => {
    // Image natural dimensions loaded
  };

  // Pan & Drag handlers (mouse & touch)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    }
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  // Crop & Export via Canvas
  const getCroppedImageBlob = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!imageRef.current || !containerRef.current) {
        return reject(new Error('Image or viewport not ready'));
      }

      const canvas = document.createElement('canvas');
      const size = 512; // Export size 512x512
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      if (!ctx) return reject(new Error('Unable to create canvas context'));

      const img = imageRef.current;
      const cropRadius = 130; // Preview mask radius in container

      // Draw background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);

      // Translate canvas center
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate((rotation * Math.PI) / 180);

      // Scaling ratio between preview mask and output size
      const scaleFactor = (size / 2) / cropRadius;

      // Draw image with pan and zoom transforms applied
      const drawX = pan.x * scaleFactor;
      const drawY = pan.y * scaleFactor;
      const drawWidth = (img.width * zoom) * scaleFactor;
      const drawHeight = (img.height * zoom) * scaleFactor;

      ctx.drawImage(img, drawX - drawWidth / 2, drawY - drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      // Export as WebP or JPEG fallback
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas export failed'));
        },
        'image/webp',
        0.88
      );
    });
  };

  const handleSaveCropped = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const blob = await getCroppedImageBlob();
      let avatarUrl = '';

      // 1. Try Supabase Storage upload
      if (isSupabaseConfigured) {
        try {
          const path = `${user.id}/avatar-${Date.now()}.webp`;
          const { error: upErr } = await supabase.storage
            .from('avatars')
            .upload(path, blob, {
              contentType: 'image/webp',
              cacheControl: '3600',
              upsert: true,
            });

          if (!upErr) {
            const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
            avatarUrl = pub.publicUrl;
          }
        } catch {
          // Continue to fallback
        }
      }

      // 2. Resilient Fallback: Convert to optimized data URL if storage not accessible
      if (!avatarUrl) {
        const reader = new FileReader();
        avatarUrl = await new Promise<string>((res) => {
          reader.onload = () => res(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      // 3. Update profile record
      await updateProfile(user.id, { avatar_url: avatarUrl });
      await refreshProfile();
      if (onSuccess) {
        await onSuccess(avatarUrl);
      }

      onToast({ message: 'Photo de profil mise à jour avec succès !', type: 'success' });
      onClose();
    } catch {
      onToast({ message: 'Erreur lors de l’enregistrement de la photo', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, { avatar_url: null });
      await refreshProfile();
      if (onSuccess) {
        await onSuccess('');
      }
      onToast({ message: 'Photo de profil supprimée', type: 'info' });
      onClose();
    } catch {
      onToast({ message: 'Erreur lors de la suppression', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Photo de profil">
      <div className="space-y-5">
        {!selectedImage ? (
          /* State 1: Select new photo or remove current */
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#6600FF]/30 dark:border-[#6600FF]/40 hover:border-[#6600FF] bg-[#6600FF]/[0.02] dark:bg-[#6600FF]/[0.05] rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all active:scale-[0.99] group"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#6600FF]/10 text-[#6600FF] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-[#17131D] dark:text-white">
                Choisir une nouvelle photo
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
                Glissez-déposez ou appuyez pour parcourir votre galerie ou prendre une photo
              </p>
              <span className="mt-3 px-3.5 py-1.5 rounded-full bg-[#6600FF]/10 text-[#6600FF] text-xs font-bold">
                JPEG, PNG, WebP
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleSelectFile(e.target.files?.[0])}
            />

            {user?.avatar_url && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={saving}
                className="w-full py-3 px-4 rounded-2xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Supprimer la photo actuelle</span>
              </button>
            )}
          </div>
        ) : (
          /* State 2: Interactive Cropper with zoom and pan */
          <div className="space-y-4">
            {/* Viewport container */}
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              className="relative w-full h-72 rounded-3xl bg-zinc-950 overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center select-none shadow-inner"
            >
              {/* Image being cropped */}
              <img
                ref={imageRef}
                src={selectedImage}
                alt="Crop preview"
                onLoad={handleImageLoaded}
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  maxWidth: 'none',
                  maxHeight: 'none',
                }}
                className="pointer-events-none transition-transform duration-75 ease-out select-none"
                draggable={false}
              />

              {/* Apple iOS Circular Vignette Overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
                  borderRadius: '50%',
                  width: '260px',
                  height: '260px',
                  top: 'calc(50% - 130px)',
                  left: 'calc(50% - 130px)',
                  border: '2px solid rgba(255, 255, 255, 0.85)',
                }}
              />

              {/* Hint badge */}
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-semibold text-white/90 flex items-center gap-1.5 pointer-events-none">
                <Move className="w-3 h-3 text-[#6600FF]" />
                <span>Glissez pour déplacer</span>
              </div>
            </div>

            {/* Controls Bar: Zoom, Rotate */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-3">
              <div className="flex items-center gap-3">
                <ZoomOut className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="range"
                  min="0.8"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-[#6600FF] cursor-pointer"
                />
                <ZoomIn className="w-4 h-4 text-[#6600FF] shrink-0" />
                <span className="text-xs font-mono font-bold text-gray-600 dark:text-gray-300 w-10 text-right">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-[#6600FF] p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Pivoter 90°</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setRotation(0);
                    setPan({ x: 0, y: 0 });
                  }}
                  className="text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-white"
                >
                  Réinitialiser
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                disabled={saving}
                className="flex-1 py-3.5 rounded-2xl border border-gray-200 dark:border-white/10 font-bold text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
              >
                Autre photo
              </button>

              <button
                type="button"
                onClick={handleSaveCropped}
                disabled={saving}
                className="flex-2 py-3.5 rounded-2xl bg-[#6600FF] hover:bg-[#5200cc] active:scale-[0.98] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#6600FF]/25 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Appliquer & Sauvegarder</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
