/**
 * Whisper Bridge Test Service
 * For testing local Whisper Bridge connection
 */

const BRIDGE_URL = 'http://127.0.0.1:27123';
const BEARER_TOKEN = 'devtoken';

export interface BridgeStatusResponse {
  ok: boolean;
  device?: string;
  models?: Array<{
    name: string;
    sizeMB?: number;
    quant?: string;
    lang?: string[];
  }>;
}

export interface BridgeTranscriptionResponse {
  text: string;
  duration?: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
    confidence?: number;
  }>;
}

/**
 * Check if bridge is available and get status
 */
export async function checkBridgeStatus(): Promise<BridgeStatusResponse> {
  try {
    const response = await fetch(`${BRIDGE_URL}/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
      },
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`Bridge status check failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Bridge status error:', error);
    throw error;
  }
}

/**
 * Transcribe audio via local bridge
 */
export async function transcribeViaBridge(
  file: File,
  language: string = 'fr'
): Promise<BridgeTranscriptionResponse> {
  try {
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('language', language);

    const response = await fetch(`${BRIDGE_URL}/transcribe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
      },
      body: formData,
      mode: 'cors',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bridge transcription failed (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Bridge transcription error:', error);
    throw error;
  }
}
