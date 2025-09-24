import { getBridgeStatus } from '@/lib/whisperService';

export interface DeviceInfo {
  class: 'mobile' | 'laptop' | 'desktop';
  memory: number; // GB approximation
  powerState: 'battery' | 'ac' | 'unknown';
  online: boolean;
  connection?: {
    type?: string;
    downlink?: number; // Mbps
    effectiveType?: string;
  };
}

export interface BridgeInfo {
  available: boolean;
  models: string[];
  device?: 'cpu' | 'metal' | 'cuda';
}

export interface CachedModels {
  tiny: boolean;
  base: boolean;
  small: boolean;
  medium: boolean;
}

export interface EnvironmentProbe {
  device: DeviceInfo;
  bridge: BridgeInfo;
  cached: CachedModels;
  timestamp: number;
}

/**
 * Détecte les modèles Whisper déjà en cache
 */
export async function getCachedModels(): Promise<CachedModels> {
  try {
    // Check IndexedDB for cached HuggingFace models
    const caches = await window.caches?.keys();
    const hasCache = (model: string) => 
      caches?.some(cacheName => cacheName.includes(`whisper-${model}`)) || false;

    return {
      tiny: hasCache('tiny'),
      base: hasCache('base'),
      small: hasCache('small'), // Bridge only, but can check
      medium: false // Bridge only
    };
  } catch (error) {
    console.debug('Cache detection failed:', error);
    return { tiny: false, base: false, small: false, medium: false };
  }
}

/**
 * Détecte l'état d'alimentation (batterie vs secteur)
 */
export async function getPowerState(): Promise<'battery' | 'ac' | 'unknown'> {
  try {
    // @ts-ignore - Battery API is experimental
    const battery = await navigator.getBattery?.();
    if (battery) {
      return battery.charging ? 'ac' : 'battery';
    }
  } catch (error) {
    console.debug('Battery API not available:', error);
  }
  return 'unknown';
}

/**
 * Détermine la classe d'appareil et estimation de RAM
 */
export function getDeviceClass(): { class: 'mobile' | 'laptop' | 'desktop', memory: number } {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
  const isTablet = /ipad|tablet|kindle/.test(userAgent);
  
  // @ts-ignore - Device Memory API is experimental
  const deviceMemory = (navigator as any).deviceMemory || 4; // GB fallback
  
  let deviceClass: 'mobile' | 'laptop' | 'desktop';
  
  if (isMobile && !isTablet) {
    deviceClass = 'mobile';
  } else if (isTablet || deviceMemory <= 8) {
    deviceClass = 'laptop';
  } else {
    deviceClass = 'desktop';
  }
  
  return { class: deviceClass, memory: deviceMemory };
}

/**
 * Informations de connexion réseau
 */
export function getNetworkInfo() {
  try {
    // @ts-ignore - Connection API is experimental
    const connection = (navigator as any).connection || (navigator as any).mozConnection;
    
    if (connection) {
      return {
        type: connection.type,
        downlink: connection.downlink, // Mbps
        effectiveType: connection.effectiveType, // '4g', '3g', etc.
      };
    }
  } catch (error) {
    console.debug('Network API not available:', error);
  }
  
  return undefined;
}

/**
 * Détecte le bridge Whisper local
 */
export async function detectBridge(): Promise<BridgeInfo> {
  try {
    const status = await getBridgeStatus();
    
    if (status?.ok) {
      return {
        available: true,
        models: status.models?.map(m => m.name) || [],
        device: status.device
      };
    }
  } catch (error) {
    console.debug('Bridge detection failed:', error);
  }
  
  return {
    available: false,
    models: []
  };
}

/**
 * Sonde complète de l'environnement
 */
export async function probeEnvironment(): Promise<EnvironmentProbe> {
  const [bridge, cached, powerState] = await Promise.all([
    detectBridge(),
    getCachedModels(),
    getPowerState()
  ]);
  
  const { class: deviceClass, memory } = getDeviceClass();
  const connection = getNetworkInfo();
  
  const device: DeviceInfo = {
    class: deviceClass,
    memory,
    powerState,
    online: navigator.onLine,
    connection
  };
  
  return {
    device,
    bridge,
    cached,
    timestamp: Date.now()
  };
}