import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

export type DataSaverPreference = 'auto' | 'enabled' | 'disabled';

interface NetworkConnectionInfo {
  saveData?: boolean;
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  downlink?: number;
  rtt?: number;
}

interface DataSaverContextValue {
  isDataSaverActive: boolean;
  preference: DataSaverPreference;
  setPreference: (pref: DataSaverPreference) => void;
  toggleDataSaver: () => void;
  effectiveType: string;
  isRestrictedConnection: boolean;
  isSaveDataHeaderDetected: boolean;
}

const STORAGE_KEY = 'gba_data_saver_preference_v1';

const defaultContextValue: DataSaverContextValue = {
  isDataSaverActive: false,
  preference: 'auto',
  setPreference: () => {},
  toggleDataSaver: () => {},
  effectiveType: '4g',
  isRestrictedConnection: false,
  isSaveDataHeaderDetected: false,
};

const DataSaverContext = createContext<DataSaverContextValue>(defaultContextValue);

function getNetworkConnection(): NetworkConnectionInfo | null {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as unknown as {
    connection?: NetworkConnectionInfo & EventTarget;
    mozConnection?: NetworkConnectionInfo & EventTarget;
    webkitConnection?: NetworkConnectionInfo & EventTarget;
  };
  return nav.connection || nav.mozConnection || nav.webkitConnection || null;
}

export const DataSaverProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preference, setPreferenceState] = useState<DataSaverPreference>(() => {
    if (typeof window === 'undefined') return 'auto';
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'enabled' || saved === 'disabled' || saved === 'auto') {
        return saved as DataSaverPreference;
      }
    } catch {
      // Ignore
    }
    return 'auto';
  });

  const [networkInfo, setNetworkInfo] = useState<NetworkConnectionInfo>(() => {
    const conn = getNetworkConnection();
    return {
      saveData: conn?.saveData ?? false,
      effectiveType: conn?.effectiveType ?? '4g',
      downlink: conn?.downlink,
      rtt: conn?.rtt,
    };
  });

  // Listen to network connection updates (e.g. user moves between WiFi and 3G/Edge)
  useEffect(() => {
    const conn = getNetworkConnection();
    if (!conn || !('addEventListener' in conn)) return;

    const handleConnectionChange = () => {
      setNetworkInfo({
        saveData: conn.saveData ?? false,
        effectiveType: conn.effectiveType ?? '4g',
        downlink: conn.downlink,
        rtt: conn.rtt,
      });
    };

    conn.addEventListener('change', handleConnectionChange);
    return () => {
      conn.removeEventListener('change', handleConnectionChange);
    };
  }, []);

  const isSaveDataHeaderDetected = Boolean(networkInfo.saveData);
  const isRestrictedConnection = useMemo(() => {
    const type = networkInfo.effectiveType;
    return type === 'slow-2g' || type === '2g' || type === '3g';
  }, [networkInfo.effectiveType]);

  const isDataSaverActive = useMemo(() => {
    if (preference === 'enabled') return true;
    if (preference === 'disabled') return false;
    // Mode 'auto' : s'active si saveData est activé ou sur connexion lente (2G/3G)
    return isSaveDataHeaderDetected || isRestrictedConnection;
  }, [preference, isSaveDataHeaderDetected, isRestrictedConnection]);

  // Sync HTML root class for global styling and pausing heavy background animations
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (isDataSaverActive) {
      root.classList.add('gba-data-saver');
    } else {
      root.classList.remove('gba-data-saver');
    }
  }, [isDataSaverActive]);

  const setPreference = useCallback((pref: DataSaverPreference) => {
    setPreferenceState(pref);
    try {
      localStorage.setItem(STORAGE_KEY, pref);
    } catch {
      // Ignore
    }
  }, []);

  const toggleDataSaver = useCallback(() => {
    // Si actif, on bascule vers 'disabled', sinon vers 'enabled'
    setPreference(isDataSaverActive ? 'disabled' : 'enabled');
  }, [isDataSaverActive, setPreference]);

  const value = useMemo(
    () => ({
      isDataSaverActive,
      preference,
      setPreference,
      toggleDataSaver,
      effectiveType: networkInfo.effectiveType || '4g',
      isRestrictedConnection,
      isSaveDataHeaderDetected,
    }),
    [isDataSaverActive, preference, setPreference, toggleDataSaver, networkInfo.effectiveType, isRestrictedConnection, isSaveDataHeaderDetected]
  );

  return <DataSaverContext.Provider value={value}>{children}</DataSaverContext.Provider>;
};

export function useDataSaver(): DataSaverContextValue {
  return useContext(DataSaverContext);
}
