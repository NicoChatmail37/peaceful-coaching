/**
 * Client pour communiquer avec le Whisper Bridge local
 */

import { BRIDGE_URL, BRIDGE_TOKEN } from "@/config/bridge";

export interface BridgeStatus {
  ok: boolean;
  model: string;
  device: string;
  compute_type?: string;
  faster_whisper?: {
    model: string;
    device: string;
    compute_type: string;
  };
  whisperx?: {
    model: string;
    device: string;
    compute_type: string;
    diarization_available: boolean;
  };
}

export interface WhisperXWord {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export interface WhisperXSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
  words?: WhisperXWord[];
}

export interface WhisperXTranscriptionResult {
  model: string;
  language: string;
  text: string;
  segments: WhisperXSegment[];
  duration?: number;
}

export interface TranscriptionResult {
  text: string;
  duration: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export interface StereoTranscriptionResult {
  left: {
    text: string;
    duration: number;
  };
  right: {
    text: string;
    duration: number;
  };
  total_duration: number;
}

export interface TranscriptionOptions {
  task?: "transcribe" | "translate";
  language?: string | "auto";
  signal?: AbortSignal;
  speakers?: number;
}

/**
 * Ping le bridge pour vérifier sa disponibilité
 */
export async function pingBridge(signal?: AbortSignal): Promise<BridgeStatus> {
  const res = await fetch(`${BRIDGE_URL}/status`, {
    method: "GET",
    mode: "cors",
    headers: { 
      "Accept": "application/json"
    },
    credentials: "omit",
    signal,
  });
  
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  
  return res.json();
}

/**
 * Transcrit un fichier audio via le bridge
 */
export async function transcribeViaBridge(
  file: Blob,
  opts?: TranscriptionOptions
): Promise<TranscriptionResult> {
  const form = new FormData();
  form.append("audio", file);
  form.append("task", opts?.task ?? "transcribe");
  
  if (opts?.language && opts.language !== "auto") {
    form.append("language", opts.language);
  }

  const res = await fetch(`${BRIDGE_URL}/transcribe`, {
    method: "POST",
    mode: "cors",
    headers: { 
      Authorization: `Bearer ${BRIDGE_TOKEN}` 
    },
    body: form,
    credentials: "omit",
    signal: opts?.signal,
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`Bridge error: ${res.status} ${res.statusText}`, text);
    throw new Error(`Bridge ${res.status} ${res.statusText}: ${text || 'Unknown error'}`);
  }
  
  return res.json();
}

/**
 * Transcrit un fichier audio stéréo via le bridge (canaux séparés)
 */
export async function transcribeViaBridgeStereo(
  file: Blob,
  opts?: TranscriptionOptions
): Promise<StereoTranscriptionResult> {
  const form = new FormData();
  form.append("audio", file);
  form.append("task", opts?.task ?? "transcribe");
  
  if (opts?.language && opts.language !== "auto") {
    form.append("language", opts.language);
  }

  const res = await fetch(`${BRIDGE_URL}/transcribe_stereo`, {
    method: "POST",
    mode: "cors",
    headers: { 
      Authorization: `Bearer ${BRIDGE_TOKEN}` 
    },
    body: form,
    credentials: "omit",
    signal: opts?.signal,
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`Bridge stereo error: ${res.status} ${res.statusText}`, text);
    throw new Error(`Bridge stereo ${res.status} ${res.statusText}: ${text || 'Unknown error'}`);
  }
  
  return res.json();
}

/**
 * Transcrit un fichier audio via WhisperX avec diarisation
 */
export async function transcribeViaBridgeWhisperX(
  file: Blob,
  opts?: TranscriptionOptions & { diarize?: boolean }
): Promise<WhisperXTranscriptionResult> {
  const form = new FormData();
  form.append("audio", file);
  form.append("task", opts?.task ?? "transcribe");
  form.append("diarize", opts?.diarize ? "true" : "false");
  
  if (opts?.language && opts.language !== "auto") {
    form.append("language", opts.language);
  }
  
  // Ajouter le nombre de speakers si spécifié (ex: 2 pour praticien/client)
  if (opts?.speakers) {
    form.append("speakers", opts.speakers.toString());
  }

  const res = await fetch(`${BRIDGE_URL}/transcribe_whisperx`, {
    method: "POST",
    mode: "cors",
    headers: { 
      Authorization: `Bearer ${BRIDGE_TOKEN}` 
    },
    body: form,
    credentials: "omit",
    signal: opts?.signal,
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`Bridge WhisperX error: ${res.status} ${res.statusText}`, text);
    throw new Error(`Bridge ${res.status} ${res.statusText}: ${text || 'Unknown error'}`);
  }
  
  return res.json();
}
