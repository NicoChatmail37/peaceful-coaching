/**
 * AudioWorklet-based WAV recorder
 * Captures audio as Float32Array, downsamples to 16kHz mono, encodes to WAV PCM16
 */

export interface AudioWorkletRecorderOptions {
  sampleRate?: number; // Target sample rate (default: 16000 for Whisper)
  onDataAvailable?: (blob: Blob) => void;
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
  private onDataAvailable?: (blob: Blob) => void;
  private onError?: (error: Error) => void;

  constructor(options: AudioWorkletRecorderOptions = {}) {
    this.targetSampleRate = options.sampleRate || 16000;
    this.onDataAvailable = options.onDataAvailable;
    this.onError = options.onError;
  }

  async start(stream: MediaStream): Promise<void> {
    try {
      this.stream = stream;
      this.recordedChunks = [];
      this.isRecording = true;

      // Create AudioContext with native sample rate (will downsample later)
      this.audioContext = new AudioContext();
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);

      // Use ScriptProcessorNode (deprecated but more compatible than AudioWorklet)
      // Buffer size: 4096 samples
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processorNode.onaudioprocess = (event) => {
        if (!this.isRecording) return;

        const inputData = event.inputBuffer.getChannelData(0);
        // Store a copy
        this.recordedChunks.push(new Float32Array(inputData));
      };

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      console.log('🎙️ AudioWorkletRecorder started', {
        nativeSampleRate: this.audioContext.sampleRate,
        targetSampleRate: this.targetSampleRate,
      });
    } catch (error) {
      console.error('❌ AudioWorkletRecorder start error:', error);
      this.onError?.(error as Error);
      throw error;
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
    const nativeSampleRate = this.audioContext?.sampleRate || 48000;
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    console.log('🛑 AudioWorkletRecorder stopped', {
      chunks: this.recordedChunks.length,
      totalSamples: this.recordedChunks.reduce((sum, chunk) => sum + chunk.length, 0),
    });

    // Merge all chunks
    const totalLength = this.recordedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const mergedAudio = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.recordedChunks) {
      mergedAudio.set(chunk, offset);
      offset += chunk.length;
    }

    // Downsample if necessary
    const downsampledAudio =
      nativeSampleRate !== this.targetSampleRate
        ? this.downsample(mergedAudio, nativeSampleRate, this.targetSampleRate)
        : mergedAudio;

    // Encode to WAV
    const wavBlob = this.encodeWAV(downsampledAudio, this.targetSampleRate);

    console.log('✅ WAV encoded', {
      size: wavBlob.size,
      type: wavBlob.type,
      sampleRate: this.targetSampleRate,
    });

    this.onDataAvailable?.(wavBlob);
    this.recordedChunks = [];

    return wavBlob;
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

    console.log('⬇️ Downsampled', {
      from: sourceSampleRate,
      to: targetSampleRate,
      originalLength: buffer.length,
      newLength: result.length,
    });

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
