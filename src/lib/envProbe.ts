import { checkModelAvailability, type WhisperModel } from '@/lib/whisperService';

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

export interface WebGPUInfo {
  available: boolean;
  supported: boolean;
  reason?: string;
  adapter?: string;
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
  webgpu: WebGPUInfo;
  timestamp: number;
}

/**
 * Détecte les modèles Whisper déjà en cache via IndexedDB
 */
export async function getCachedModels(): Promise<CachedModels> {
  try {
    // Check IndexedDB for cached HuggingFace models using checkModelAvailability
    const models: WhisperModel[] = ['tiny', 'base', 'small', 'medium'];
    const results = await Promise.all(
      models.map(model => checkModelAvailability(model))
    );

    return {
      tiny: results[0],
      base: results[1],
      small: results[2],
      medium: results[3]
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
  
  // @ts-ignore - Device Memory API is experimental (capped at 8GB for privacy)
  const reportedMemory = (navigator as any).deviceMemory || 4;
  const coreCount = navigator.hardwareConcurrency || 4;
  
  // Améliorer l'estimation pour les Mac M-series
  let estimatedMemory = reportedMemory;
  
  // Détecter Mac M-series qui ont généralement plus de RAM
  if (/mac|macintosh/.test(userAgent)) {
    if (/arm64|apple silicon/.test(userAgent) || coreCount >= 8) {
      // Mac M-series détecté (8+ cores = probablement M1 Pro/Max, M2/M3/M4 avec plus de RAM)
      if (coreCount >= 10) {
        estimatedMemory = Math.max(32, reportedMemory); // M3/M4 Pro/Max = 36GB+
      } else if (coreCount >= 8) {
        estimatedMemory = Math.max(16, reportedMemory); // M1 Pro/Max, M2 Pro = 16GB+
      } else {
        estimatedMemory = Math.max(8, reportedMemory); // M1/M2 base = 8-16GB
      }
    }
  }
  
  // Classification d'appareil basée sur les specs améliorées
  let deviceClass: 'mobile' | 'laptop' | 'desktop';
  
  if (isMobile && !isTablet) {
    deviceClass = 'mobile';
  } else if (isTablet) {
    deviceClass = 'laptop';
  } else if (estimatedMemory >= 16 && coreCount >= 8) {
    deviceClass = 'desktop'; // Machine puissante
  } else {
    deviceClass = 'laptop';
  }
  
  return { class: deviceClass, memory: estimatedMemory };
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
    // Check if user has enabled bridge in preferences
    const { getTranscriptionDB } = await import('./transcriptionStorage');
    const db = await getTranscriptionDB();
    const useBridgePref = await db.get('prefs', 'useBridge');
    
    // If user hasn't enabled bridge, skip network ping
    if (useBridgePref?.value === false) {
      return {
        available: false,
        models: []
      };
    }
    
    // Ping bridge with timeout
    const { pingBridge } = await import('@/services/bridgeClient');
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 1500);
    
    try {
      const status = await pingBridge(ac.signal);
      clearTimeout(timeout);
      
      if (status?.ok) {
        return {
          available: true,
          models: ['small', 'medium'], // Bridge typically supports these
          device: status.device as 'cpu' | 'metal' | 'cuda'
        };
      }
    } catch (pingError) {
      clearTimeout(timeout);
      console.debug('Bridge ping failed:', pingError);
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
 * Teste WebGPU et fournit des informations détaillées
 */
export async function checkWebGPU(): Promise<WebGPUInfo> {
  try {
    // Vérifier si WebGPU est disponible dans le navigateur
    if (!('gpu' in navigator)) {
      const userAgent = navigator.userAgent.toLowerCase();
      if (/safari/.test(userAgent) && !/chrome/.test(userAgent)) {
        return {
          available: false,
          supported: false,
          reason: 'WebGPU disponible mais désactivé. Activez-le dans Develop > Experimental Features > WebGPU'
        };
      } else if (/chrome/.test(userAgent)) {
        return {
          available: false,
          supported: false,
          reason: 'WebGPU disponible mais désactivé. Activez-le dans chrome://flags/#enable-unsafe-webgpu'
        };
      } else if (/firefox/.test(userAgent)) {
        return {
          available: false,
          supported: false,
          reason: 'WebGPU disponible mais désactivé. Activez-le dans about:config → dom.webgpu.enabled'
        };
      }
      return {
        available: false,
        supported: false,
        reason: 'WebGPU non supporté par ce navigateur'
      };
    }

    // Tester l'adaptateur WebGPU
    const gpu = (navigator as any).gpu;
    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      return {
        available: false,
        supported: true,
        reason: 'Aucun adaptateur WebGPU trouvé'
      };
    }

    return {
      available: true,
      supported: true,
      adapter: adapter.info?.description || 'Adaptateur WebGPU détecté'
    };
  } catch (error) {
    return {
      available: false,
      supported: true,
      reason: `Erreur WebGPU: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
    };
  }
}

/**
 * Sonde complète de l'environnement
 */
export async function probeEnvironment(): Promise<EnvironmentProbe> {
  const [bridge, cached, powerState, webgpu] = await Promise.all([
    detectBridge(),
    getCachedModels(),
    getPowerState(),
    checkWebGPU()
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
    webgpu,
    timestamp: Date.now()
  };
}