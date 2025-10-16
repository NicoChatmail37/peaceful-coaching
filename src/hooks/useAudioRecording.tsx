import { useState, useRef, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { AudioWorkletRecorder } from '@/lib/audioWorkletRecorder';

export type RecordingState = 'idle' | 'recording' | 'paused' | 'processing';

export interface StereoInfo {
  isStereo: boolean;
  channelCount: number;
  leftLevel: number;
  rightLevel: number;
  webGpuAvailable: boolean;
  browserOptimal: boolean;
}

export interface AudioRecordingHook {
  state: RecordingState;
  duration: number;
  audioLevel: number;
  stereoInfo: StereoInfo;
  startRecording: (options?: { 
    enableStereo?: boolean; 
    onAudioChunk?: (blob: Blob) => void; 
    mode?: any; 
    autoChunkDuration?: number;
    onChunkReady?: (blob: Blob, duration: number) => void 
  }) => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<Blob | null>;
  markChunk: () => void;
  isSupported: boolean;
}

export function useAudioRecording(): AudioRecordingHook {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [stereoInfo, setStereoInfo] = useState<StereoInfo>({
    isStereo: false,
    channelCount: 1,
    leftLevel: 0,
    rightLevel: 0,
    webGpuAvailable: false,
    browserOptimal: false
  });

  const recorderRef = useRef<AudioWorkletRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const splitterRef = useRef<ChannelSplitterNode | null>(null);
  const leftAnalyzerRef = useRef<AnalyserNode | null>(null);
  const rightAnalyzerRef = useRef<AnalyserNode | null>(null);
  const levelIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isSupported = typeof navigator !== 'undefined' && 
                     !!navigator.mediaDevices?.getUserMedia;

  // Check WebGPU availability
  const checkWebGPU = useCallback(async () => {
    try {
      if ('gpu' in navigator) {
        const adapter = await (navigator as any).gpu?.requestAdapter();
        return !!adapter;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // Check browser optimization for stereo
  const checkBrowserOptimal = useCallback(() => {
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const isEdge = /Edg/.test(navigator.userAgent);
    return isChrome || isEdge;
  }, []);

  const startRecording = useCallback(async (options?: { 
    enableStereo?: boolean; 
    onAudioChunk?: (blob: Blob) => void; 
    mode?: any; 
    autoChunkDuration?: number;
    onChunkReady?: (blob: Blob, duration: number) => void 
  }) => {
    const enableStereo = options?.enableStereo || false;
    const onAudioChunk = options?.onAudioChunk;
    if (!isSupported) {
      toast({
        title: "Non supporté",
        description: "L'enregistrement audio n'est pas supporté dans ce navigateur",
        variant: "destructive"
      });
      return;
    }

    try {
      // Check capabilities
      const webGpuAvailable = await checkWebGPU();
      const browserOptimal = checkBrowserOptimal();

      // Show WebGPU fallback message if needed
      if (!webGpuAvailable && enableStereo) {
        toast({
          title: "WebGPU indisponible",
          description: "Utilisation du CPU (plus lent). Pour de meilleures performances, utilisez Chrome/Edge.",
          variant: "default"
        });
      }

      // Show browser recommendation
      if (enableStereo && !browserOptimal) {
        toast({
          title: "Recommandation",
          description: "Chrome/Edge recommandés pour une meilleure qualité stéréo",
          variant: "default"
        });
      }

      // Audio constraints (simplified - WAV doesn't need special encoding)
      const audioConstraints: MediaTrackConstraints = enableStereo ? {
        echoCancellation: false,
        autoGainControl: false,
        noiseSuppression: false,
        channelCount: { ideal: 2, min: 1 },
        sampleRate: { ideal: 48000 },
      } : {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      });

      // Validate actual channel count
      const track = stream.getAudioTracks()[0];
      const settings = track.getSettings();
      const actualChannels = settings.channelCount || 1;
      const isStereo = enableStereo && actualChannels >= 2;

      console.log('🎙️ Audio track settings:', {
        channelCount: actualChannels,
        sampleRate: settings.sampleRate,
        deviceId: settings.deviceId,
        label: track.label
      });

      if (enableStereo && actualChannels < 2) {
        toast({
          title: "Stéréo non disponible",
          description: "Un seul canal détecté. Vérifiez les paramètres système de votre RØDE.",
          variant: "default"
        });
      }

      streamRef.current = stream;

      // Setup WebAudio processing chain for visualization
      const audioContext = new AudioContext({ sampleRate: 48000 });
      const source = audioContext.createMediaStreamSource(stream);
      
      // Audio processing chain (gain + compression)
      const preGain = audioContext.createGain();
      preGain.gain.value = 2.5;
      
      const compressor = audioContext.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 6;
      compressor.ratio.value = 3;
      compressor.attack.value = 0.01;
      compressor.release.value = 0.2;
      
      const postGain = audioContext.createGain();
      postGain.gain.value = 1.2;
      
      source.connect(preGain);
      preGain.connect(compressor);
      compressor.connect(postGain);
      
      console.log('🎛️ Audio processing chain:', {
        preGain: preGain.gain.value,
        compressor: {
          threshold: compressor.threshold.value,
          ratio: compressor.ratio.value,
        },
        postGain: postGain.gain.value
      });
      
      // Create analyzers for visualization
      if (isStereo) {
        const splitter = audioContext.createChannelSplitter(2);
        const leftAnalyzer = audioContext.createAnalyser();
        const rightAnalyzer = audioContext.createAnalyser();
        
        leftAnalyzer.fftSize = 256;
        rightAnalyzer.fftSize = 256;
        
        postGain.connect(splitter);
        splitter.connect(leftAnalyzer, 0);
        splitter.connect(rightAnalyzer, 1);
        
        splitterRef.current = splitter;
        leftAnalyzerRef.current = leftAnalyzer;
        rightAnalyzerRef.current = rightAnalyzer;
      } else {
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 256;
        postGain.connect(analyzer);
        analyzerRef.current = analyzer;
      }

      audioContextRef.current = audioContext;

      // Create and start AudioWorkletRecorder (records original stream as WAV)
      recorderRef.current = new AudioWorkletRecorder({
        sampleRate: 16000, // Whisper optimal rate
        mode: options?.mode || 'auto-60s',
        autoChunkDuration: options?.autoChunkDuration, // Custom chunk duration (e.g., 150s)
        onChunk: (blob) => {
          console.log('📼 AW chunk received in hook', { 
            type: blob.type, 
            sizeKB: Math.round(blob.size / 1024) 
          });
          onAudioChunk?.(blob); // Forward to real-time transcription
        },
        onChunkReady: options?.onChunkReady,
        onError: (error) => {
          console.error('❌ AudioWorkletRecorder error:', error);
          toast({
            title: "Erreur d'enregistrement",
            description: error.message,
            variant: "destructive"
          });
        },
      });

      await recorderRef.current.start(stream);

      // Update stereo info
      setStereoInfo({
        isStereo,
        channelCount: actualChannels,
        leftLevel: 0,
        rightLevel: 0,
        webGpuAvailable,
        browserOptimal
      });

      // Start duration counter
      const startTime = Date.now();
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 100);

      // Start audio level monitoring
      levelIntervalRef.current = setInterval(() => {
        if (isStereo && leftAnalyzerRef.current && rightAnalyzerRef.current) {
          const leftData = new Uint8Array(leftAnalyzerRef.current.frequencyBinCount);
          const rightData = new Uint8Array(rightAnalyzerRef.current.frequencyBinCount);
          
          leftAnalyzerRef.current.getByteFrequencyData(leftData);
          rightAnalyzerRef.current.getByteFrequencyData(rightData);
          
          const leftLevel = leftData.reduce((sum, value) => sum + value, 0) / leftData.length / 255;
          const rightLevel = rightData.reduce((sum, value) => sum + value, 0) / rightData.length / 255;
          
          setStereoInfo(prev => ({ ...prev, leftLevel, rightLevel }));
          setAudioLevel(Math.max(leftLevel, rightLevel));
        } else if (analyzerRef.current) {
          const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
          analyzerRef.current.getByteFrequencyData(dataArray);
          const level = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length / 255;
          setAudioLevel(level);
        }
      }, 50);

      setState('recording');
      
      toast({
        title: "Enregistrement WAV démarré",
        description: `Format: WAV PCM16 16kHz mono • ${isStereo ? 'Source stéréo' : 'Source mono'}`,
        variant: "default"
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Erreur d'enregistrement",
        description: "Impossible d'accéder au microphone. Vérifiez les permissions.",
        variant: "destructive"
      });
    }
  }, [isSupported, checkWebGPU, checkBrowserOptimal]);

  const pauseRecording = useCallback(() => {
    if (recorderRef.current && state === 'recording') {
      recorderRef.current.pause();
      setState('paused');
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (levelIntervalRef.current) {
        clearInterval(levelIntervalRef.current);
      }
      setAudioLevel(0);
    }
  }, [state]);

  const resumeRecording = useCallback(() => {
    if (recorderRef.current && state === 'paused') {
      recorderRef.current.resume();
      setState('recording');

      // Resume duration counter
      const currentDuration = duration;
      const startTime = Date.now() - (currentDuration * 1000);
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 100);

      // Resume audio level monitoring
      levelIntervalRef.current = setInterval(() => {
        if (analyzerRef.current) {
          const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
          analyzerRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          setAudioLevel(average / 255);
        }
      }, 50);
    }
  }, [state, duration]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (!recorderRef.current) {
      return null;
    }

    setState('processing');

    try {
      const wavBlob = await recorderRef.current.stop();
      
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      if (levelIntervalRef.current) {
        clearInterval(levelIntervalRef.current);
        levelIntervalRef.current = null;
      }

      setState('idle');
      setDuration(0);
      setAudioLevel(0);
      recorderRef.current = null;
      analyzerRef.current = null;

      toast({
        title: "Enregistrement WAV terminé",
        description: `${Math.round(wavBlob.size / 1024)} Ko • Format: ${wavBlob.type}`,
        variant: "default"
      });

      return wavBlob;
    } catch (error) {
      console.error('Error stopping recording:', error);
      setState('idle');
      return null;
    }
  }, []);

  const markChunk = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.markChunk();
    }
  }, []);

  return {
    state,
    duration,
    audioLevel,
    stereoInfo,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    markChunk,
    isSupported,
  };
}
