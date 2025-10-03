/**
 * AudioWorklet-based WAV recorder
 * Captures audio as Float32Array, downsamples to 16kHz mono, encodes to WAV PCM16
 */

export type RecordingMode = 'auto-6s' | 'auto-30s' | 'auto-60s' | 'manual';

export interface AudioWorkletRecorderOptions {
  sampleRate?: number; // Target sample rate (default: 16000 for Whisper)
  timesliceMs?: number; // Emit chunks every N milliseconds (default: 3000)
  mode?: RecordingMode; // Recording mode (default: 'auto-6s')
  onChunk?: (blob: Blob) => void; // Called for each chunk during recording
  onChunkReady?: (blob: Blob, duration: number) => void; // Called when chunk is ready (for storage)
  onDataAvailable?: (blob: Blob) => void; // Called at stop with final chunk
  onError?: (error: Error) => void;
}

export class AudioWorkletRecorder {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;
  private recordedChunks: Float32Array[] = [];
  private isRecording = false;
  private targetSampleRate: number;
  private timesliceMs: number;
  private mode: RecordingMode;
  private onChunk?: (blob: Blob) => void;
  private onChunkReady?: (blob: Blob, duration: number) => void;
  private onDataAvailable?: (blob: Blob) => void;
  private onError?: (error: Error) => void;
  private accumulatedSamples = 0;
  private sliceSamples: number;
  private nativeSampleRate = 48000;

  constructor(options: AudioWorkletRecorderOptions = {}) {
    this.mode = options.mode || 'auto-6s';
    this.targetSampleRate = options.sampleRate || 16000;
    
    // Set timeslice based on mode
    if (this.mode === 'auto-6s') {
      this.timesliceMs = 6000;
    } else if (this.mode === 'auto-30s') {
      this.timesliceMs = 30000;
    } else if (this.mode === 'auto-60s') {
      this.timesliceMs = 60000;
    } else {
      // Manual mode uses custom or default
      this.timesliceMs = options.timesliceMs || 6000;
    }
    
    this.onChunk = options.onChunk;
    this.onChunkReady = options.onChunkReady;
    this.onDataAvailable = options.onDataAvailable;
    this.onError = options.onError;
    this.sliceSamples = Math.floor(this.targetSampleRate * (this.timesliceMs / 1000));
  }

  async start(stream: MediaStream): Promise<void> {
    try {
      this.stream = stream;
      this.recordedChunks = [];
      this.accumulatedSamples = 0;
      this.isRecording = true;

      // Create AudioContext with native sample rate (will downsample later)
      this.audioContext = new AudioContext();
      this.nativeSampleRate = this.audioContext.sampleRate;
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);

      // Use ScriptProcessorNode (deprecated but more compatible than AudioWorklet)
      // Buffer size: 4096 samples
      // Input channels: 2 (stereo), Output: 1 (mono)
      const inputChannels = stream.getAudioTracks()[0]?.getSettings()?.channelCount || 2;
      this.processorNode = this.audioContext.createScriptProcessor(4096, inputChannels, 1);

      this.processorNode.onaudioprocess = (event) => {
        if (!this.isRecording) return;

        const channelCount = event.inputBuffer.numberOfChannels;
        
        // Intelligent stereo downmix to mono
        let monoData: Float32Array;
        if (channelCount === 1) {
          // Already mono - defensive copy
          monoData = event.inputBuffer.getChannelData(0).slice();
        } else {
          // Stereo → Mono: RMS per buffer to choose dominant channel
          // Prevents HF artifacts from sample-by-sample alternation
          const left = event.inputBuffer.getChannelData(0);
          const right = event.inputBuffer.getChannelData(1);
          
          // Calculate RMS for each channel
          let sumLeft = 0, sumRight = 0;
          for (let i = 0; i < left.length; i++) {
            sumLeft += left[i] * left[i];
            sumRight += right[i] * right[i];
          }
          
          // Choose dominant channel for entire buffer
          const useLeft = sumLeft >= sumRight;
          const sourceChannel = useLeft ? left : right;
          
          console.log('🎚️ Downmix', { 
            picked: useLeft ? 'L' : 'R', 
            rmsL: Math.sqrt(sumLeft / left.length).toFixed(4), 
            rmsR: Math.sqrt(sumRight / right.length).toFixed(4) 
          });
          
          // Defensive copy
          monoData = sourceChannel.slice();
        }
        
        // Store a copy
        this.recordedChunks.push(new Float32Array(monoData));
        this.accumulatedSamples += monoData.length;

        // Auto modes: emit chunk when timeslice reached
        // Manual mode: only emit when markChunk() is called
        if (this.mode !== 'manual') {
          const nativeSliceSamples = Math.floor(this.nativeSampleRate * (this.timesliceMs / 1000));
          if (this.accumulatedSamples >= nativeSliceSamples) {
            this.emitChunk();
          }
        }
      };

      // Create silent gain node to prevent audio feedback/echo
      const silentNode = this.audioContext.createGain();
      silentNode.gain.value = 0;
      
      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(silentNode);
      silentNode.connect(this.audioContext.destination);

      console.log('🎙️ AudioWorkletRecorder started', {
        mode: this.mode,
        nativeSampleRate: this.audioContext.sampleRate,
        targetSampleRate: this.targetSampleRate,
        timesliceMs: this.timesliceMs,
        sliceSamples: this.sliceSamples,
      });
    } catch (error) {
      console.error('❌ AudioWorkletRecorder start error:', error);
      this.onError?.(error as Error);
      throw error;
    }
  }

  private emitChunk(): void {
    if (this.recordedChunks.length === 0) return;

    // Merge accumulated chunks
    const totalLength = this.recordedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const mergedAudio = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.recordedChunks) {
      mergedAudio.set(chunk, offset);
      offset += chunk.length;
    }

    // Downsample if necessary
    const downsampledAudio =
      this.nativeSampleRate !== this.targetSampleRate
        ? this.downsample(mergedAudio, this.nativeSampleRate, this.targetSampleRate)
        : mergedAudio;

    // Encode to WAV
    const wavBlob = this.encodeWAV(downsampledAudio, this.targetSampleRate);
    const durationSec = downsampledAudio.length / this.targetSampleRate;

    console.log('📼 AW chunk emitted', {
      type: wavBlob.type,
      size: wavBlob.size,
      sizeKB: Math.round(wavBlob.size / 1024),
      durationSec,
    });

    // Emit chunk (for real-time transcription)
    this.onChunk?.(wavBlob);
    
    // Emit chunk with duration (for storage)
    this.onChunkReady?.(wavBlob, durationSec);

    // Reset buffer
    this.recordedChunks = [];
    this.accumulatedSamples = 0;
  }

  /**
   * Mark current buffer as a chunk (manual mode)
   */
  markChunk(): void {
    if (!this.isRecording || this.mode !== 'manual') {
      console.warn('markChunk() only works in manual mode while recording');
      return;
    }

    if (this.recordedChunks.length > 0) {
      this.emitChunk();
      console.log('📍 Manual chunk marked');
    }
  }

  pause(): void {
    this.isRecording = false;
    console.log('⏸️ AudioWorkletRecorder paused');
  }

  resume(): void {
    this.isRecording = true;
    console.log('▶️ AudioWorkletRecorder resumed');
  }

  async stop(): Promise<Blob> {
    this.isRecording = false;

    // Emit any remaining buffered audio as final chunk
    if (this.recordedChunks.length > 0) {
      console.log('🔄 Emitting final chunk on stop...');
      this.emitChunk();
    }

    // Disconnect nodes
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    // Close audio context
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    console.log('🛑 AudioWorkletRecorder stopped');

    // Return empty blob (real data was sent via onChunk)
    const emptyBlob = new Blob([], { type: 'audio/wav' });
    this.onDataAvailable?.(emptyBlob);

    return emptyBlob;
  }

  /**
   * Downsample audio from sourceSampleRate to targetSampleRate
   */
  private downsample(
    buffer: Float32Array,
    sourceSampleRate: number,
    targetSampleRate: number
  ): Float32Array {
    if (sourceSampleRate === targetSampleRate) {
      return buffer;
    }

    const sampleRateRatio = sourceSampleRate / targetSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);

    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);

      // Linear interpolation
      let accum = 0;
      let count = 0;

      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }

      result[offsetResult] = accum / count;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }

    return result;
  }

  /**
   * Encode Float32Array to WAV Blob (PCM16, mono)
   */
  private encodeWAV(samples: Float32Array, sampleRate: number): Blob {
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;

    const dataLength = samples.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    // Write WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    // RIFF chunk descriptor
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true); // File size - 8
    writeString(8, 'WAVE');

    // fmt sub-chunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
    view.setUint16(22, numChannels, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
    view.setUint16(32, blockAlign, true); // BlockAlign
    view.setUint16(34, bitsPerSample, true); // BitsPerSample

    // data sub-chunk
    writeString(36, 'data');
    view.setUint32(40, dataLength, true); // Subchunk2Size

    // Write PCM samples (convert Float32 to Int16)
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, int16, true); // Little-endian
      offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  cleanup(): void {
    this.isRecording = false;
    if (this.sourceNode) this.sourceNode.disconnect();
    if (this.processorNode) this.processorNode.disconnect();
    if (this.audioContext) this.audioContext.close();
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
    this.recordedChunks = [];
  }
}
