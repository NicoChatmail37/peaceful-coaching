import type { WhisperModel } from '@/lib/whisperService';
import type { EnvironmentProbe } from '@/lib/envProbe';

export interface ModelRecommendation {
  model: WhisperModel;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  alternatives?: WhisperModel[];
}

/**
 * Recommande automatiquement un modèle selon l'environnement
 */
export function recommendModel(env: EnvironmentProbe): ModelRecommendation {
  const { device, bridge, cached } = env;
  
  // Si un modèle est déjà en cache, le recommander
  if (cached.base) {
    return {
      model: 'base',
      reason: 'Modèle Base déjà en cache - aucun téléchargement requis',
      confidence: 'high'
    };
  }
  
  if (cached.tiny) {
    return {
      model: 'tiny',
      reason: 'Modèle Tiny déjà en cache - aucun téléchargement requis',
      confidence: 'high',
      alternatives: bridge.available ? ['base', 'small'] : ['base']
    };
  }
  
  // Mobile ou batterie → Tiny
  if (device.class === 'mobile' || device.powerState === 'battery') {
    return {
      model: 'tiny',
      reason: device.class === 'mobile' 
        ? 'Optimisé pour mobile - léger et rapide'
        : 'Sur batterie - économise la consommation',
      confidence: 'high',
      alternatives: ['base']
    };
  }
  
  // RAM insuffisante → Tiny
  if (device.memory < 4) {
    return {
      model: 'tiny',
      reason: 'RAM limitée - modèle léger recommandé',
      confidence: 'high'
    };
  }
  
  // Desktop + Bridge disponible → Small
  if (device.class === 'desktop' && bridge.available) {
    return {
      model: 'small',
      reason: 'Bridge local disponible - qualité optimale recommandée',
      confidence: 'high',
      alternatives: ['base', 'medium']
    };
  }
  
  // Laptop avec secteur + Bridge → Small
  if (device.class === 'laptop' && device.powerState === 'ac' && bridge.available) {
    return {
      model: 'small',
      reason: 'Configuration optimale pour le bridge local',
      confidence: 'medium',
      alternatives: ['base']
    };
  }
  
  // Connexion limitée → ne pas pré-télécharger
  if (device.connection?.effectiveType === '2g' || device.connection?.effectiveType === '3g') {
    return {
      model: 'tiny',
      reason: 'Connexion lente - modèle léger pour éviter les longs téléchargements',
      confidence: 'medium',
      alternatives: []
    };
  }
  
  // Par défaut → Base (bon équilibre)
  return {
    model: 'base',
    reason: 'Équilibre optimal entre qualité et performance',
    confidence: 'medium',
    alternatives: bridge.available ? ['small'] : ['tiny']
  };
}

/**
 * Obtient tous les modèles disponibles selon l'environnement
 */
export function getAvailableModelsWithRecommendation(env: EnvironmentProbe): {
  models: Array<{
    model: WhisperModel;
    available: boolean;
    cached: boolean;
    size: number;
    requiresBridge: boolean;
    description: string;
  }>;
  recommended: WhisperModel;
} {
  const recommendation = recommendModel(env);
  
  const models = [
    {
      model: 'tiny' as WhisperModel,
      available: true,
      cached: env.cached.tiny,
      size: 39,
      requiresBridge: false,
      description: 'Très rapide, précision basique'
    },
    {
      model: 'base' as WhisperModel,
      available: true,
      cached: env.cached.base,
      size: 74,
      requiresBridge: false,
      description: 'Équilibré vitesse/qualité'
    },
    {
      model: 'small' as WhisperModel,
      available: env.bridge.available,
      cached: env.cached.small,
      size: 244,
      requiresBridge: true,
      description: 'Meilleure qualité (bridge requis)'
    },
    {
      model: 'medium' as WhisperModel,
      available: env.bridge.available,
      cached: env.cached.medium,
      size: 769,
      requiresBridge: true,
      description: 'Haute qualité (bridge requis)'
    }
  ];
  
  return {
    models,
    recommended: recommendation.model
  };
}

/**
 * Conseils contextuels pour l'utilisateur
 */
export function getContextualAdvice(env: EnvironmentProbe, selectedModel: WhisperModel): string {
  const { device, bridge } = env;
  
  if (selectedModel === 'medium' && !bridge.available) {
    return '⚠️ Le modèle Medium nécessite le bridge local. Démarrez-le pour l\'utiliser.';
  }
  
  if (selectedModel === 'small' && !bridge.available) {
    return '⚠️ Le modèle Small nécessite le bridge local pour de meilleures performances.';
  }
  
  if (device.class === 'mobile' && selectedModel !== 'tiny') {
    return '📱 Sur mobile, le modèle Tiny est généralement plus fluide.';
  }
  
  if (device.powerState === 'battery' && selectedModel !== 'tiny') {
    return '🔋 Sur batterie, le modèle Tiny consomme moins d\'énergie.';
  }
  
  if (device.memory < 4 && selectedModel !== 'tiny') {
    return '💾 Avec une RAM limitée, le modèle Tiny est plus stable.';
  }
  
  if (bridge.available && selectedModel === 'tiny') {
    return '⚡ Avec le bridge disponible, vous pourriez bénéficier du modèle Small.';
  }
  
  return '✅ Configuration optimale détectée.';
}