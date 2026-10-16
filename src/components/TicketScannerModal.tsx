import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Camera,
  Flashlight,
  FlashlightOff,
  RefreshCw,
  Keyboard,
  Image as ImageIcon,
  History,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Wifi,
  WifiOff,
  Search,
  Trash2,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  User,
  Ticket as TicketIcon
} from 'lucide-react';
import jsQR from 'jsqr';
import { haptic } from '@/hooks/useHaptics';
import {
  gateAudio,
  processTicketGateValidation,
  preloadEventTicketsForOffline,
  fetchEventGateStats,
  getSavedGateHistory,
  saveGateScanRecord,
  clearGateScanHistory,
  syncOfflineGateQueue,
  type GateScanRecord,
  type GateValidationResult
} from '@/services/ticketScannerService';
import type { Event } from '@/types';
import type { ToastData } from '@/components/Toast';

interface TicketScannerModalProps {
  open: boolean;
  onClose: () => void;
  events: Event[];
  initialEventId?: string;
  onToast: (toast: Omit<ToastData, 'id'>) => void;
}

export function TicketScannerModal({
  open,
  onClose,
  events,
  initialEventId,
  onToast,
}: TicketScannerModalProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId || (events[0]?.id ?? 'all'));
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);

  // Scan state
  const [isScanning, setIsScanning] = useState(true);
  const [lastScannedResult, setLastScannedResult] = useState<GateValidationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [countdownPercent, setCountdownPercent] = useState(100);

  // Mode & Panels
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyList, setHistoryList] = useState<GateScanRecord[]>([]);

  // Gate stats
  const [stats, setStats] = useState<{ totalTickets: number; scannedCount: number; activeCount: number }>({
    totalTickets: 0,
    scannedCount: 0,
    activeCount: 0,
  });
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  // Sync selected event when initialEventId changes
  useEffect(() => {
    if (initialEventId) {
      setSelectedEventId(initialEventId);
    } else if (events.length > 0 && selectedEventId === 'all') {
      setSelectedEventId(events[0].id);
    }
  }, [initialEventId, events, selectedEventId]);

  const loadStats = useCallback(async () => {
    if (!selectedEventId || selectedEventId === 'all') return;
    const res = await fetchEventGateStats(selectedEventId);
    setStats(res);
  }, [selectedEventId]);

  const triggerSync = useCallback(async () => {
    setIsSyncing(true);
    const { synced, failed } = await syncOfflineGateQueue();
    setIsSyncing(false);
    if (synced > 0) {
      onToast({ message: `${synced} billet(s) synchronisé(s) avec succès !`, type: 'success' });
      loadStats();
    }
    if (failed > 0) {
      onToast({ message: `${failed} billet(s) en attente de synchronisation`, type: 'info' });
    }
  }, [loadStats, onToast]);

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      onToast({ message: 'Connexion rétablie ! Synchronisation du guichet...', type: 'info' });
      triggerSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      onToast({ message: 'Mode Guichet Hors-Ligne activé ⚡', type: 'info' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onToast, triggerSync]);

  useEffect(() => {
    if (open) {
      setHistoryList(getSavedGateHistory());
      loadStats();
      if (selectedEventId && selectedEventId !== 'all') {
        preloadEventTicketsForOffline(selectedEventId);
      }
    }
  }, [open, selectedEventId, loadStats]);

  // Start Camera
  const startCamera = useCallback(async () => {
    setCameraPermissionError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraPermissionError("Votre navigateur ne permet pas l'accès direct à la caméra.");
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: cameraFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
      }

      // Check torch support
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities ? (videoTrack.getCapabilities() as { torch?: boolean }) : {};
        setTorchAvailable(!!capabilities.torch);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      const isDenied = (err as Error)?.name === 'NotAllowedError' || (err as Error)?.name === 'PermissionDeniedError';
      setCameraPermissionError(
        isDenied
          ? "Accès caméra refusé. Autorisez l'accès dans vos paramètres pour scanner."
          : "Impossible de démarrer la caméra. Utilisez la saisie manuelle ou l'import photo."
      );
      setCameraActive(false);
    }
  }, [cameraFacing]);

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  }, []);

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && 'applyConstraints' in track) {
      try {
        const nextState = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState } as unknown as MediaTrackConstraintSet],
        });
        setTorchOn(nextState);
        haptic.selection();
      } catch {
        onToast({ message: 'Torche indisponible sur cet appareil', type: 'info' });
      }
    }
  };

  // Flip Camera
  const flipCamera = () => {
    haptic.selection();
    setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Process a detected QR code
  const handleValidateCode = useCallback(
    async (code: string) => {
      if (isProcessing) return;
      setIsProcessing(true);
      setIsScanning(false);

      const result = await processTicketGateValidation({
        rawCode: code,
        selectedEventId,
        availableEvents: events,
      });

      setLastScannedResult(result);

      // Audio & Haptic feedback
      if (result.status === 'valid') {
        gateAudio.play('valid');
        haptic.success();
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate([70, 40, 70]); } catch { /* ignore */ }
        }
      } else if (result.status === 'already_used') {
        gateAudio.play('already_used');
        haptic.warning();
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate([120, 60, 120]); } catch { /* ignore */ }
        }
      } else if (result.status === 'wrong_event') {
        gateAudio.play('wrong_event');
        haptic.warning();
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate([100, 50, 100]); } catch { /* ignore */ }
        }
      } else {
        gateAudio.play('invalid');
        haptic.error();
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate([220]); } catch { /* ignore */ }
        }
      }

      // Record in history
      const currentEvent = events.find((e) => e.id === selectedEventId);
      const newRecord: GateScanRecord = {
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        qrCode: code,
        ticketId: result.ticket?.id,
        eventId: selectedEventId,
        eventTitle: result.eventTitle || currentEvent?.title || 'Événement',
        status: result.status,
        participantName: result.participantName || 'Participant',
        ticketType: result.ticketType,
        seatInfo: result.seatInfo,
        scannedAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        isOffline: result.isOffline,
      };

      saveGateScanRecord(newRecord);
      setHistoryList(getSavedGateHistory());

      // Update gate counter
      if (result.status === 'valid') {
        setStats((prev) => ({
          ...prev,
          scannedCount: prev.scannedCount + 1,
          activeCount: Math.max(0, prev.activeCount - 1),
        }));
      }

      // Start auto-resume countdown (1.5 seconds - Fast continuous scan mode)
      setCountdownPercent(100);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

      const startTime = Date.now();
      const duration = 1500;
      countdownIntervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setCountdownPercent(remaining);
        if (elapsed >= duration) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          resumeScanning();
        }
      }, 40);

      setIsProcessing(false);
    },
    [isProcessing, selectedEventId, events]
  );

  const resumeScanning = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setLastScannedResult(null);
    setIsScanning(true);
  };

  // Continuous Scan Loop
  useEffect(() => {
    if (!open || !cameraActive || !isScanning) {
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
        scanLoopRef.current = null;
      }
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const scanFrame = () => {
      if (!isScanning) return;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qr = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          if (qr && qr.data && qr.data.trim().length > 0) {
            handleValidateCode(qr.data);
            return;
          }
        }
      }

      scanLoopRef.current = requestAnimationFrame(scanFrame);
    };

    scanLoopRef.current = requestAnimationFrame(scanFrame);

    return () => {
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
        scanLoopRef.current = null;
      }
    };
  }, [open, cameraActive, isScanning, handleValidateCode]);

  // Manage camera on modal open/close
  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      resumeScanning();
    }
    return () => {
      stopCamera();
    };
  }, [open, startCamera, stopCamera]);

  // Handle Photo Gallery QR Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });
          if (code && code.data) {
            onToast({ message: 'QR Code détecté sur la photo !', type: 'info' });
            handleValidateCode(code.data);
          } else {
            onToast({ message: 'Aucun QR code lisible sur cette image', type: 'error' });
            haptic.error();
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Submit manual code
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    setShowManualInput(false);
    handleValidateCode(manualCode.trim());
    setManualCode('');
  };

  if (!open) return null;

  const percentScanned =
    stats.totalTickets > 0 ? Math.round((stats.scannedCount / stats.totalTickets) * 100) : 0;

  const filteredHistory = historyList.filter(
    (item) =>
      item.participantName.toLowerCase().includes(historySearch.toLowerCase()) ||
      item.qrCode.toLowerCase().includes(historySearch.toLowerCase()) ||
      (item.ticketType && item.ticketType.toLowerCase().includes(historySearch.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col font-sans select-none overflow-hidden animate-fade-in">
      {/* Hidden elements */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* TOP HEADER */}
      <div className="pt-safe-header px-4 pb-3 z-30 bg-gradient-to-b from-black/90 via-black/60 to-transparent flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
              aria-label="Fermer le scanner"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10">
              <Camera className="w-4 h-4 text-[#A855F7]" />
              <span className="text-xs font-bold tracking-wide">Scanner de Billets</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Online / Offline indicator */}
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border backdrop-blur-md ${
                isOnline
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
              }`}
            >
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span>{isOnline ? 'En ligne' : 'Hors-ligne'}</span>
            </div>

            {/* Sync button for offline logs */}
            {isOnline && (
              <button
                onClick={triggerSync}
                disabled={isSyncing}
                title="Synchroniser les scans locaux"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 text-white ${isSyncing ? 'animate-spin text-[#A855F7]' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Event Selector & Live Progress */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 border border-white/10 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1 min-w-0">
              <select
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value);
                  haptic.selection();
                }}
                className="w-full bg-transparent text-sm font-bold text-white pr-7 truncate appearance-none focus:outline-none cursor-pointer"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id} className="bg-zinc-900 text-white font-medium">
                    {ev.title} ({ev.city})
                  </option>
                ))}
                <option value="all" className="bg-zinc-900 text-white font-medium">
                  🌐 Tous mes événements (Auto-détection)
                </option>
              </select>
              <ChevronDown className="w-4 h-4 text-white/60 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {selectedEventId !== 'all' && (
              <div className="shrink-0 flex items-center gap-1.5 bg-[#6600FF]/30 px-2.5 py-1 rounded-xl border border-[#6600FF]/40 text-xs font-mono font-bold text-purple-200">
                <ShieldCheck className="w-3.5 h-3.5 text-[#A855F7]" />
                <span>
                  {stats.scannedCount} / {stats.totalTickets}
                </span>
              </div>
            )}
          </div>

          {/* Mini progress bar */}
          {selectedEventId !== 'all' && stats.totalTickets > 0 && (
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#6600FF] to-emerald-400 transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, percentScanned)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* CAMERA VIEWPORT */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {/* HTML5 Video element */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {/* Camera Permission or Initialization Error */}
        {cameraPermissionError && (
          <div className="absolute inset-0 bg-zinc-950/90 z-20 flex flex-col items-center justify-center px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Accès Caméra</h3>
            <p className="text-sm text-gray-300 max-w-xs mb-6">{cameraPermissionError}</p>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <button
                onClick={startCamera}
                className="w-full py-3 rounded-2xl bg-[#6600FF] text-white font-bold text-sm active:scale-98 transition-all flex items-center justify-center gap-2 shadow-purple"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Réessayer la caméra</span>
              </button>
              <button
                onClick={() => setShowManualInput(true)}
                className="w-full py-3 rounded-2xl bg-white/10 text-white font-semibold text-sm active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <Keyboard className="w-4 h-4" />
                <span>Saisie manuelle du code</span>
              </button>
            </div>
          </div>
        )}

        {/* Darkened Reticle Vignette */}
        {!cameraPermissionError && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Vignette cut-out effect */}
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-3xl border-2 border-white/20 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#A855F7] rounded-tl-2xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#A855F7] rounded-tr-2xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#A855F7] rounded-bl-2xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#A855F7] rounded-br-2xl" />

              {/* Animated Laser Scanning Line */}
              {isScanning && !lastScannedResult && (
                <div className="absolute left-2 right-2 h-1 bg-gradient-to-r from-transparent via-[#A855F7] to-transparent shadow-[0_0_12px_#A855F7] animate-laser-scan" />
              )}

              {/* Scanning status hint inside reticle */}
              <div className="absolute -bottom-10 left-0 right-0 text-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-medium text-white/80 border border-white/10">
                  <Sparkles className="w-3.5 h-3.5 text-[#A855F7] animate-spin" />
                  Pointez le QR code du participant
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SCAN RESULT OVERLAY MODAL */}
        {lastScannedResult && (
          <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-5 animate-fade-in">
            <div className="w-full max-w-sm rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl border transition-all animate-scale-up relative overflow-hidden bg-zinc-900 border-white/15">
              {/* Top Countdown Bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/10">
                <div
                  className={`h-full transition-all duration-75 ${
                    lastScannedResult.status === 'valid'
                      ? 'bg-emerald-400'
                      : lastScannedResult.status === 'already_used'
                      ? 'bg-amber-400'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${countdownPercent}%` }}
                />
              </div>

              {/* Status Icon */}
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-transform ${
                  lastScannedResult.status === 'valid'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-bounce'
                    : lastScannedResult.status === 'already_used'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.3)]'
                    : lastScannedResult.status === 'wrong_event'
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 shadow-[0_0_30px_rgba(249,115,22,0.3)]'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.3)]'
                }`}
              >
                {lastScannedResult.status === 'valid' && <CheckCircle2 className="w-12 h-12" />}
                {lastScannedResult.status === 'already_used' && <AlertTriangle className="w-12 h-12" />}
                {lastScannedResult.status === 'wrong_event' && <AlertTriangle className="w-12 h-12" />}
                {lastScannedResult.status === 'invalid' && <XCircle className="w-12 h-12" />}
                {lastScannedResult.status === 'cancelled' && <XCircle className="w-12 h-12" />}
              </div>

              {/* Status Header Title */}
              <h2
                className={`text-2xl font-black uppercase tracking-tight mb-1 ${
                  lastScannedResult.status === 'valid'
                    ? 'text-emerald-400'
                    : lastScannedResult.status === 'already_used'
                    ? 'text-amber-400'
                    : lastScannedResult.status === 'wrong_event'
                    ? 'text-orange-400'
                    : 'text-rose-400'
                }`}
              >
                {lastScannedResult.status === 'valid' && 'Entrée Accordée 🎉'}
                {lastScannedResult.status === 'already_used' && 'Billet Déjà Validé !'}
                {lastScannedResult.status === 'wrong_event' && 'Mauvais Événement'}
                {lastScannedResult.status === 'invalid' && 'Billet Invalide'}
                {lastScannedResult.status === 'cancelled' && 'Billet Annulé'}
              </h2>

              <p className="text-xs text-zinc-300 font-medium mb-4 max-w-xs">{lastScannedResult.message}</p>

              {/* Attendee Details Card */}
              {lastScannedResult.participantName && (
                <div className="w-full bg-white/5 rounded-2xl p-4 border border-white/10 mb-5 flex flex-col gap-2.5 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-purple-400" /> Participant
                    </span>
                    <span className="font-bold text-white text-sm">
                      {lastScannedResult.participantName}
                    </span>
                  </div>

                  {lastScannedResult.ticketType && (
                    <div className="flex items-center justify-between border-t border-white/5 pt-2">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <TicketIcon className="w-3.5 h-3.5 text-purple-400" /> Formule
                      </span>
                      <span className="font-extrabold text-xs px-2.5 py-0.5 rounded-full bg-[#6600FF]/20 text-purple-300 border border-[#6600FF]/40">
                        {lastScannedResult.ticketType}
                      </span>
                    </div>
                  )}

                  {lastScannedResult.seatInfo && (
                    <div className="flex items-center justify-between border-t border-white/5 pt-2">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Place / Siège</span>
                      <span className="font-mono text-xs text-white font-semibold">
                        {lastScannedResult.seatInfo}
                      </span>
                    </div>
                  )}

                  {lastScannedResult.eventTitle && (
                    <div className="flex items-center justify-between border-t border-white/5 pt-2">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Événement</span>
                      <span className="text-xs text-gray-300 truncate max-w-[160px]">
                        {lastScannedResult.eventTitle}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <button
                onClick={resumeScanning}
                className="w-full py-3.5 rounded-2xl bg-white text-zinc-950 font-bold text-sm active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <span>Scanner le billet suivant</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM CONTROLS FLOATING BAR */}
      <div className="pb-safe-bottom pt-3 px-6 z-30 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col gap-3">
        <div className="flex items-center justify-around bg-zinc-900/80 backdrop-blur-lg rounded-3xl p-2 border border-white/10 shadow-2xl">
          {/* Torch Toggle */}
          <button
            onClick={toggleTorch}
            disabled={!cameraActive || !torchAvailable}
            title={torchAvailable ? "Allumer / Éteindre la torche" : "Torche non disponible sur cette caméra"}
            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              !torchAvailable ? 'opacity-40 cursor-not-allowed' : ''
            } ${
              torchOn
                ? 'bg-amber-400 text-zinc-950 shadow-[0_0_15px_rgba(251,191,36,0.5)]'
                : 'text-white/80 hover:bg-white/10'
            }`}
          >
            {torchOn ? <Flashlight className="w-5 h-5" /> : <FlashlightOff className="w-5 h-5" />}
          </button>

          {/* Flip Camera */}
          <button
            onClick={flipCamera}
            disabled={!cameraActive}
            title="Basculer caméra avant / arrière"
            className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-white/80 hover:bg-white/10 transition-all cursor-pointer"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          {/* Manual Alphanumeric Code Entry */}
          <button
            onClick={() => {
              haptic.selection();
              setShowManualInput(true);
            }}
            title="Saisie manuelle du code"
            className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-white/80 hover:bg-white/10 transition-all cursor-pointer"
          >
            <Keyboard className="w-5 h-5" />
          </button>

          {/* Image Upload from Gallery */}
          <button
            onClick={() => {
              haptic.selection();
              fileInputRef.current?.click();
            }}
            title="Importer une photo de QR Code"
            className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-white/80 hover:bg-white/10 transition-all cursor-pointer"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          {/* Scan History Drawer */}
          <button
            onClick={() => {
              haptic.selection();
              setShowHistory(true);
            }}
            title="Historique des scans du guichet"
            className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-white/80 hover:bg-white/10 transition-all cursor-pointer relative"
          >
            <History className="w-5 h-5" />
            {historyList.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#A855F7]" />
            )}
          </button>
        </div>
      </div>

      {/* MANUAL CODE ENTRY SHEET / MODAL */}
      {showManualInput && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-zinc-900 rounded-3xl p-6 border border-white/15 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-[#A855F7]" />
                <h3 className="font-bold text-white text-base">Saisie Manuelle du Billet</h3>
              </div>
              <button
                onClick={() => setShowManualInput(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-400 mb-4">
              Si le QR Code est illisible ou que l'écran du participant est fissuré, saisissez le code alphanumérique imprimé sous le pass (ex: <span className="font-mono text-purple-300">GBC-A1B2C3D4</span>).
            </p>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="Ex: GBC-984F72A1"
                autoFocus
                className="w-full px-4 py-3.5 bg-black/60 border border-white/20 rounded-2xl text-white font-mono text-center tracking-wider text-lg uppercase focus:outline-none focus:ring-2 focus:ring-[#6600FF]"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualInput(false)}
                  className="flex-1 py-3 rounded-2xl bg-white/10 text-white font-semibold text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="flex-1 py-3 rounded-2xl bg-[#6600FF] hover:bg-[#5200cc] text-white font-bold text-sm disabled:opacity-40 transition-all shadow-purple"
                >
                  Valider le pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCAN HISTORY DRAWER */}
      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="w-full sm:max-w-md h-[80vh] bg-zinc-900 rounded-t-3xl sm:rounded-3xl p-5 border border-white/15 shadow-2xl flex flex-col animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#A855F7]" />
                <h3 className="font-bold text-white text-base">Historique des Scans ({historyList.length})</h3>
              </div>
              <div className="flex items-center gap-2">
                {historyList.length > 0 && (
                  <button
                    onClick={() => {
                      clearGateScanHistory();
                      setHistoryList([]);
                      onToast({ message: 'Historique effacé', type: 'info' });
                    }}
                    title="Vider l'historique"
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setShowHistory(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search filter in history */}
            <div className="relative my-3">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Rechercher un participant ou code..."
                className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#6600FF]"
              />
            </div>

            {/* History list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar">
              {filteredHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                  <TicketIcon className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-xs font-semibold">Aucun scan enregistré pour le moment</p>
                </div>
              ) : (
                filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          item.status === 'valid'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : item.status === 'already_used'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {item.status === 'valid' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : item.status === 'already_used' ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{item.participantName}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                          <span className="font-mono text-purple-300">{item.qrCode}</span>
                          {item.ticketType && <span>· {item.ticketType}</span>}
                          {item.isOffline && <span className="text-amber-400">⚡ Hors-ligne</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-gray-400 font-mono">{item.scannedAt}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowHistory(false)}
              className="mt-3 w-full py-3 rounded-2xl bg-white/10 text-white font-bold text-xs"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
