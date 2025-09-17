export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  stream?: boolean;
  max_tokens?: number;
}

export interface LLMResponse {
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason: string;
  }>;
}

export interface LLMStreamChunk {
  choices: Array<{
    delta: {
      content?: string;
    };
    finish_reason?: string;
  }>;
}

export interface LLMBridgeStatus {
  ok: boolean;
  backend: 'ollama' | 'lmstudio' | null;
  available_models: string[];
  default_model: string;
}

export type AnalysisType = 'summary' | 'todos' | 'notes' | 'custom';

export interface AnalysisResult {
  type: AnalysisType;
  prompt: string;
  result: string;
  model: string;
  created_at: string;
}

const LLM_BRIDGE_URL = 'http://localhost:27123';

// Templates de prompts optimisés pour le contexte médical/thérapeutique
export const PROMPT_TEMPLATES = {
  summary: `Tu es un assistant de transcription médicale. Analysez cette consultation et produisez un résumé structuré en 5 points clés :

1. **Motif de consultation** : Raison principale de la visite
2. **Observations cliniques** : État du patient, symptômes observés  
3. **Évaluation/Diagnostic** : Analyse professionnelle de la situation
4. **Interventions/Recommandations** : Actions menées ou conseillées
5. **Suivi/Prochaines étapes** : Plan de suivi, RDV programmés

Texte à analyser:
`,

  todos: `Tu es un assistant de transcription médicale. Extrayez de cette consultation toutes les actions concrètes et tâches à réaliser :

Format de réponse souhaité :
• **Actions immédiates** : Ce qui doit être fait rapidement
• **Suivi médical** : RDV, examens, prescriptions à prévoir
• **Recommandations patient** : Conseils donnés au patient
• **Actions administratives** : Courriers, certificats, rapports à rédiger

Soyez précis et actionnable. Indiquez les échéances quand elles sont mentionnées.

Texte à analyser:
`,

  notes: `Tu es un assistant de transcription médicale. Structurez cette consultation selon le format de notes thérapeutiques :

**1. COMPORTEMENT & PRÉSENTATION**
- État général du patient
- Communication verbale/non-verbale
- Humeur et attitude

**2. ÉVOLUTION & PROGRÈS**  
- Changements depuis la dernière séance
- Amélioration ou détérioration observée
- Réponse aux interventions précédentes

**3. INTERVENTIONS & TECHNIQUES**
- Approches thérapeutiques utilisées
- Exercices ou techniques appliquées
- Réactions du patient

**4. PLAN THÉRAPEUTIQUE**
- Objectifs de travail définis
- Stratégies pour les prochaines séances
- Adaptations du traitement si nécessaire

Texte à analyser:
`,

  custom: `Tu es un assistant de transcription médicale. Analysez le texte suivant selon les instructions spécifiques fournies :

{custom_instructions}

Texte à analyser:
`
};

/**
 * Vérifie si le bridge LLM local est disponible
 */
export async function pingLLMBridge(): Promise<boolean> {
  try {
    const response = await fetch(`${LLM_BRIDGE_URL}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Récupère le statut détaillé du bridge LLM
 */
export async function getLLMBridgeStatus(): Promise<LLMBridgeStatus | null> {
  try {
    const response = await fetch(`${LLM_BRIDGE_URL}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking LLM bridge status:', error);
    return null;
  }
}

/**
 * Génère un résumé structuré de la transcription
 */
export async function generateSummary(
  transcript: string,
  options: {
    model?: string;
    onProgress?: (chunk: string) => void;
  } = {}
): Promise<string> {
  const { model = 'llama3.1:8b', onProgress } = options;
  
  return await generateAnalysis(transcript, 'summary', { model, onProgress });
}

/**
 * Extrait les tâches et actions de la transcription
 */
export async function extractTodos(
  transcript: string,
  options: {
    model?: string;
    onProgress?: (chunk: string) => void;
  } = {}
): Promise<string> {
  const { model = 'llama3.1:8b', onProgress } = options;
  
  return await generateAnalysis(transcript, 'todos', { model, onProgress });
}

/**
 * Génère des notes thérapeutiques structurées
 */
export async function generateNotes(
  transcript: string,
  options: {
    model?: string;
    onProgress?: (chunk: string) => void;
  } = {}
): Promise<string> {
  const { model = 'llama3.1:8b', onProgress } = options;
  
  return await generateAnalysis(transcript, 'notes', { model, onProgress });
}

/**
 * Génère une analyse personnalisée de la transcription
 */
export async function generateCustomAnalysis(
  transcript: string,
  customInstructions: string,
  options: {
    model?: string;
    onProgress?: (chunk: string) => void;
  } = {}
): Promise<string> {
  const { model = 'llama3.1:8b', onProgress } = options;
  
  const prompt = PROMPT_TEMPLATES.custom.replace('{custom_instructions}', customInstructions);
  
  return await callLLMBridge(transcript, prompt, { model, onProgress });
}

/**
 * Génère une analyse basée sur un type prédéfini
 */
export async function generateAnalysis(
  transcript: string,
  type: Exclude<AnalysisType, 'custom'>,
  options: {
    model?: string;
    onProgress?: (chunk: string) => void;
  } = {}
): Promise<string> {
  const { model = 'llama3.1:8b', onProgress } = options;
  
  const prompt = PROMPT_TEMPLATES[type];
  
  return await callLLMBridge(transcript, prompt, { model, onProgress });
}

/**
 * Appel principal au bridge LLM avec streaming support
 */
async function callLLMBridge(
  transcript: string,
  systemPrompt: string,
  options: {
    model?: string;
    onProgress?: (chunk: string) => void;
  } = {}
): Promise<string> {
  const { model = 'llama3.1:8b', onProgress } = options;
  
  // Vérifier que le bridge est disponible
  const isAvailable = await pingLLMBridge();
  if (!isAvailable) {
    throw new Error('Bridge LLM non disponible. Veuillez démarrer Ollama ou LM Studio.');
  }
  
  const request: LLMRequest = {
    model,
    messages: [
      {
        role: 'system',
        content: 'Tu es un assistant de transcription médicale expert. Réponds de manière structurée et professionnelle.'
      },
      {
        role: 'user',
        content: systemPrompt + '\n\n' + transcript
      }
    ],
    temperature: 0.3,
    stream: !!onProgress,
    max_tokens: 2000
  };
  
  try {
    const response = await fetch(`${LLM_BRIDGE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur LLM Bridge (${response.status}): ${errorText}`);
    }
    
    if (onProgress && response.body) {
      // Mode streaming
      return await handleStreamingResponse(response, onProgress);
    } else {
      // Mode non-streaming
      const result: LLMResponse = await response.json();
      return result.choices[0]?.message?.content || '';
    }
    
  } catch (error) {
    console.error('Error calling LLM bridge:', error);
    throw error;
  }
}

/**
 * Gère la réponse en streaming du LLM
 */
async function handleStreamingResponse(
  response: Response,
  onProgress: (chunk: string) => void
): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            break;
          }
          
          try {
            const parsed: LLMStreamChunk = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            
            if (content) {
              fullContent += content;
              onProgress(content);
            }
          } catch (e) {
            // Ignore les lignes JSON invalides
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  
  return fullContent;
}

/**
 * Récupère les modèles disponibles via le bridge
 */
export async function getAvailableLLMModels(): Promise<string[]> {
  try {
    const status = await getLLMBridgeStatus();
    return status?.available_models || [];
  } catch (error) {
    console.error('Error fetching available LLM models:', error);
    return [];
  }
}

/**
 * Récupère le modèle par défaut
 */
export async function getDefaultLLMModel(): Promise<string> {
  try {
    const status = await getLLMBridgeStatus();
    return status?.default_model || 'llama3.1:8b';
  } catch (error) {
    return 'llama3.1:8b';
  }
}