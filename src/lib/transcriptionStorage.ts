import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface AudioBlob {
  id: string;
  client_id?: string;
  session_id?: string;
  created_at: string;
  codec: string;
  size: number;
  blobData: ArrayBuffer;
}

export interface TranscriptResult {
  id: string;
  audio_id: string;
  model: string;
  lang?: string;
  text: string;
  segments: TranscriptSegment[];
  srt: string;
  created_at: string;
}

export interface TranscriptSegment {
  t0: number;
  t1: number;
  text: string;
  conf?: number;
}

export interface TranscriptNote {
  id: string;
  transcript_id: string;
  type: 'summary' | 'todo' | 'marker';
  body: string;
  t0?: number;
  t1?: number;
  created_at: string;
}

interface TranscriptionDB extends DBSchema {
  audio_blobs: {
    key: string;
    value: AudioBlob;
  };
  transcripts: {
    key: string;
    value: TranscriptResult;
    indexes: { 'by-audio': string };
  };
  notes: {
    key: string;
    value: TranscriptNote;
    indexes: { 'by-transcript': string };
  };
  prefs: {
    key: string;
    value: any;
  };
}

let dbInstance: IDBPDatabase<TranscriptionDB> | null = null;

export async function getTranscriptionDB() {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<TranscriptionDB>('transcription-db', 1, {
    upgrade(db) {
      // Audio blobs store
      db.createObjectStore('audio_blobs', { keyPath: 'id' });

      // Transcripts store
      const transcriptsStore = db.createObjectStore('transcripts', { keyPath: 'id' });
      transcriptsStore.createIndex('by-audio', 'audio_id');

      // Notes store
      const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
      notesStore.createIndex('by-transcript', 'transcript_id');

      // Preferences store
      db.createObjectStore('prefs', { keyPath: 'key' });
    },
  });

  return dbInstance;
}

export async function storeAudioBlob(
  blob: Blob,
  sessionId?: string,
  clientId?: string
): Promise<string> {
  const db = await getTranscriptionDB();
  const id = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const audioBlob: AudioBlob = {
    id,
    client_id: clientId,
    session_id: sessionId,
    created_at: new Date().toISOString(),
    codec: blob.type,
    size: blob.size,
    blobData: await blob.arrayBuffer(),
  };

  await db.add('audio_blobs', audioBlob);
  return id;
}

export async function getAudioBlob(id: string): Promise<Blob | null> {
  const db = await getTranscriptionDB();
  const audioData = await db.get('audio_blobs', id);
  
  if (!audioData) return null;
  
  return new Blob([audioData.blobData], { type: audioData.codec });
}

export async function storeTranscriptResult(result: Omit<TranscriptResult, 'id' | 'created_at'>): Promise<string> {
  const db = await getTranscriptionDB();
  const id = `transcript_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const transcript: TranscriptResult = {
    ...result,
    id,
    created_at: new Date().toISOString(),
  };

  await db.add('transcripts', transcript);
  return id;
}

export async function getTranscriptsByAudio(audioId: string): Promise<TranscriptResult[]> {
  const db = await getTranscriptionDB();
  return await db.getAllFromIndex('transcripts', 'by-audio', audioId);
}

export async function getTranscriptsBySession(sessionId: string): Promise<(TranscriptResult & { audio: AudioBlob })[]> {
  const db = await getTranscriptionDB();
  const audioBlobs = await db.getAll('audio_blobs');
  const sessionAudios = audioBlobs.filter(audio => audio.session_id === sessionId);
  
  const results = [];
  for (const audio of sessionAudios) {
    const transcripts = await getTranscriptsByAudio(audio.id);
    for (const transcript of transcripts) {
      results.push({ ...transcript, audio });
    }
  }
  
  return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function deleteAudioAndTranscripts(audioId: string): Promise<void> {
  const db = await getTranscriptionDB();
  const tx = db.transaction(['audio_blobs', 'transcripts', 'notes'], 'readwrite');
  
  // Delete audio
  await tx.objectStore('audio_blobs').delete(audioId);
  
  // Delete associated transcripts and notes
  const transcripts = await tx.objectStore('transcripts').index('by-audio').getAll(audioId);
  for (const transcript of transcripts) {
    await tx.objectStore('transcripts').delete(transcript.id);
    
    // Delete associated notes
    const notes = await tx.objectStore('notes').index('by-transcript').getAll(transcript.id);
    for (const note of notes) {
      await tx.objectStore('notes').delete(note.id);
    }
  }
  
  await tx.done;
}