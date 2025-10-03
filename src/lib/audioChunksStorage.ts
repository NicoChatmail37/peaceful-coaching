import { openDB, IDBPDatabase } from 'idb';

/**
 * Represents a stored audio chunk with metadata
 */
export interface AudioChunk {
  id: string;
  sessionId: string | null;
  clientId: string | null;
  timestamp: Date;
  duration: number; // in seconds
  blob: Blob;
  transcribed: boolean;
  transcriptText?: string;
  source: 'recorded' | 'uploaded'; // Track origin
  fileName?: string; // For uploaded files
}

let dbInstance: IDBPDatabase | null = null;

/**
 * Get or create the IndexedDB instance
 */
async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB('audio-chunks-db', 1, {
    upgrade(db) {
      const store = db.createObjectStore('audioChunks', { keyPath: 'id' });
      store.createIndex('by-session', 'sessionId');
      store.createIndex('by-client', 'clientId');
      store.createIndex('by-timestamp', 'timestamp');
      store.createIndex('by-transcribed', 'transcribed');
    },
  });

  return dbInstance;
}

/**
 * Store a new audio chunk
 */
export async function storeAudioChunk(
  blob: Blob,
  options: {
    sessionId?: string;
    clientId?: string;
    duration: number;
    source?: 'recorded' | 'uploaded';
    fileName?: string;
    transcriptText?: string;
  }
): Promise<string> {
  const db = await getDB();
  const id = crypto.randomUUID();

  const chunk: AudioChunk = {
    id,
    sessionId: options.sessionId || null,
    clientId: options.clientId || null,
    timestamp: new Date(),
    duration: options.duration,
    blob,
    transcribed: !!options.transcriptText,
    transcriptText: options.transcriptText,
    source: options.source || 'recorded',
    fileName: options.fileName,
  };

  await db.add('audioChunks', chunk);
  console.log('💾 Stored audio chunk:', { id, duration: options.duration, source: chunk.source });
  return id;
}

/**
 * Get a specific audio chunk by ID
 */
export async function getAudioChunk(id: string): Promise<AudioChunk | null> {
  const db = await getDB();
  const chunk = await db.get('audioChunks', id);
  return chunk || null;
}

/**
 * Get all audio chunks for a session
 */
export async function getAudioChunksBySession(sessionId: string): Promise<AudioChunk[]> {
  const db = await getDB();
  const chunks = await db.getAllFromIndex('audioChunks', 'by-session', sessionId);
  return chunks.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/**
 * Get all audio chunks for a client
 */
export async function getAudioChunksByClient(clientId: string): Promise<AudioChunk[]> {
  const db = await getDB();
  const chunks = await db.getAllFromIndex('audioChunks', 'by-client', clientId);
  return chunks.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/**
 * Get all untranscribed chunks
 */
export async function getUntranscribedChunks(): Promise<AudioChunk[]> {
  const db = await getDB();
  const allChunks = await db.getAll('audioChunks');
  return allChunks
    .filter(c => !c.transcribed)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/**
 * Update transcription for a chunk
 */
export async function updateChunkTranscription(
  id: string,
  transcriptText: string
): Promise<void> {
  const db = await getDB();
  const chunk = await db.get('audioChunks', id);
  if (!chunk) {
    throw new Error(`Audio chunk ${id} not found`);
  }

  chunk.transcribed = true;
  chunk.transcriptText = transcriptText;
  await db.put('audioChunks', chunk);
  console.log('✅ Updated transcription for chunk:', id);
}

/**
 * Delete a specific audio chunk
 */
export async function deleteAudioChunk(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('audioChunks', id);
  console.log('🗑️ Deleted audio chunk:', id);
}

/**
 * Delete all chunks for a session
 */
export async function deleteChunksBySession(sessionId: string): Promise<void> {
  const db = await getDB();
  const chunks = await getAudioChunksBySession(sessionId);
  const tx = db.transaction('audioChunks', 'readwrite');
  
  await Promise.all([
    ...chunks.map(chunk => tx.store.delete(chunk.id)),
    tx.done,
  ]);
  
  console.log(`🗑️ Deleted ${chunks.length} chunks for session:`, sessionId);
}

/**
 * Get total storage size for a session (approximate)
 */
export async function getSessionStorageSize(sessionId: string): Promise<number> {
  const chunks = await getAudioChunksBySession(sessionId);
  let totalSize = 0;
  
  for (const chunk of chunks) {
    totalSize += chunk.blob.size;
  }
  
  return totalSize;
}
