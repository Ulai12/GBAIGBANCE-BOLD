import { useState } from 'react';
import { MapPin, Globe, Loader2, Navigation, Wifi } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { COUNTRY_FLAGS, COUNTRY_NAMES } from '@/constants';

interface LocationInfo {
  ip: string;
  city: string;
  country: string;
  countryCode: string;
  region: string;
  timezone: string;
  lat: number;
  lon: number;
  isp: string;
}

interface DeviceLocation {
  lat: number;
  lon: number;
  accuracy: number;
  city?: string;
  country?: string;
}

interface LocationModalProps {
  open: boolean;
  onClose: () => void;
}

export function LocationModal({ open, onClose }: LocationModalProps) {
  const [ipLocation, setIpLocation] = useState<LocationInfo | null>(null);
  const [deviceLocation, setDeviceLocation] = useState<DeviceLocation | null>(null);
  const [loadingIp, setLoadingIp] = useState(false);
  const [loadingDevice, setLoadingDevice] = useState(false);
  const [errorIp, setErrorIp] = useState('');
  const [errorDevice, setErrorDevice] = useState('');

  const fetchIpLocation = async () => {
    setLoadingIp(true);
    setErrorIp('');
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setIpLocation({
        ip: data.ip,
        city: data.city || 'Inconnue',
        country: data.country_name || 'Inconnu',
        countryCode: data.country_code || '',
        region: data.region || '',
        timezone: data.timezone || '',
        lat: data.latitude,
        lon: data.longitude,
        isp: data.org || 'Inconnu',
      });
    } catch {
      setErrorIp('Impossible de récupérer la localisation IP');
    } finally {
      setLoadingIp(false);
    }
  };

  const fetchDeviceLocation = () => {
    setLoadingDevice(true);
    setErrorDevice('');
    if (!navigator.geolocation) {
      setErrorDevice('Géolocalisation non supportée');
      setLoadingDevice(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDeviceLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLoadingDevice(false);
      },
      (err) => {
        setErrorDevice(err.message || 'Erreur de géolocalisation');
        setLoadingDevice(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Localisation">
      <p className="text-sm text-gray-500 mb-5">
        Visualisez votre localisation IP et la position de votre appareil.
      </p>

      <div className="glass-surface rounded-3xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-xl bg-[#6600FF]/10 flex items-center justify-center">
            <Wifi className="w-4.5 h-4.5 text-[#6600FF]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#1A1A2E]">Localisation IP</p>
            <p className="text-xs text-gray-400">Basée sur votre adresse réseau</p>
          </div>
        </div>

        {!ipLocation && !loadingIp && (
          <button onClick={fetchIpLocation} className="w-full py-2.5 rounded-full bg-[#6600FF]/10 text-[#6600FF] text-sm font-semibold active:scale-95 transition-transform">
            Detecter mon IP
          </button>
        )}

        {loadingIp && (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="w-5 h-5 text-[#6600FF] animate-spin" />
          </div>
        )}

        {errorIp && <p className="text-xs text-red-500 text-center py-2">{errorIp}</p>}

        {ipLocation && (
          <div className="space-y-2 animate-slide-up">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Adresse IP</span>
              <span className="font-mono font-semibold text-[#1A1A2E]">{ipLocation.ip}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Ville</span>
              <span className="font-semibold text-[#1A1A2E]">{COUNTRY_FLAGS[ipLocation.countryCode]} {ipLocation.city}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Pays</span>
              <span className="font-semibold text-[#1A1A2E]">{ipLocation.country}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Région</span>
              <span className="font-semibold text-[#1A1A2E]">{ipLocation.region}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Fuseau</span>
              <span className="font-semibold text-[#1A1A2E]">{ipLocation.timezone}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">FAI</span>
              <span className="font-semibold text-[#1A1A2E] text-right text-xs">{ipLocation.isp}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Coordonnées</span>
              <span className="font-mono font-semibold text-[#1A1A2E] text-xs">{ipLocation.lat.toFixed(2)}, {ipLocation.lon.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="glass-surface rounded-3xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Navigation className="w-4.5 h-4.5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#1A1A2E]">Localisation appareil</p>
            <p className="text-xs text-gray-400">Basée sur le GPS du téléphone</p>
          </div>
        </div>

        {!deviceLocation && !loadingDevice && (
          <button onClick={fetchDeviceLocation} className="w-full py-2.5 rounded-full bg-emerald-500/10 text-emerald-600 text-sm font-semibold active:scale-95 transition-transform">
            Localiser mon appareil
          </button>
        )}

        {loadingDevice && (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
          </div>
        )}

        {errorDevice && <p className="text-xs text-red-500 text-center py-2">{errorDevice}</p>}

        {deviceLocation && (
          <div className="space-y-2 animate-slide-up">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Latitude</span>
              <span className="font-mono font-semibold text-[#1A1A2E]">{deviceLocation.lat.toFixed(4)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Longitude</span>
              <span className="font-mono font-semibold text-[#1A1A2E]">{deviceLocation.lon.toFixed(4)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Précision</span>
              <span className="font-semibold text-[#1A1A2E]">±{deviceLocation.accuracy.toFixed(0)}m</span>
            </div>
            <a
              href={`https://www.openstreetmap.org/?mlat=${deviceLocation.lat}&mlon=${deviceLocation.lon}&zoom=15`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 mt-2 py-2 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-semibold active:scale-95 transition-transform"
            >
              <MapPin className="w-3.5 h-3.5" /> Voir sur la carte
            </a>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
        <Globe className="w-3.5 h-3.5" />
        <span>Vos données de localisation restent privées et ne sont pas partagées.</span>
      </div>
    </Modal>
  );
}
