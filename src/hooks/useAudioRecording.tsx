import { useState, useRef, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

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
  startRecording: (enableStereo?: boolean, onAudioChunk?: (blob: Blob) => void) => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<Blob | null>;
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const splitterRef = useRef<ChannelSplitterNode | null>(null);
  const leftAnalyzerRef = useRef<AnalyserNode | null>(null);
  const rightAnalyzerRef = useRef<AnalyserNode | null>(null);
  const levelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const onAudioChunkRef = useRef<((blob: Blob) => void) | null>(null);

  const isSupported = typeof navigator !== 'undefined' && 
                     !!navigator.mediaDevices?.getUserMedia &&
                     !!window.MediaRecorder;

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

  const startRecording = useCallback(async (enableStereo = false, onAudioChunk?: (blob: Blob) => void) => {
    onAudioChunkRef.current = onAudioChunk || null;
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

      // Audio constraints with stereo optimization
      const audioConstraints: MediaTrackConstraints = enableStereo ? {
        echoCancellation: false,
        autoGainControl: false,
        noiseSuppression: false,
        channelCount: 2,
        sampleRate: 48000
      } : {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      });

      // Check actual channel count
      const track = stream.getAudioTracks()[0];
      const settings = track.getSettings();
      const actualChannels = settings.channelCount || 1;
      const isStereo = enableStereo && actualChannels >= 2;

      if (enableStereo && actualChannels < 2) {
        toast({
          title: "Stéréo non disponible",
          description: "Vérifiez que votre RØDE est configuré en stéréo dans les paramètres système",
          variant: "default"
        });
      }

      streamRef.current = stream;
      chunksRef.current = [];

      // Setup MediaRecorder with optimal codec for Whisper compatibility
      // Try audio/wav first for best compatibility, fallback to webm
      let mimeType = 'audio/webm;codecs=opus';
      if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav';
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=pcm')) {
        mimeType = 'audio/webm;codecs=pcm';
      }
      
      console.log('Using MIME type for recording:', mimeType);
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType,
        audioBitsPerSecond: 128000 // Optimize bitrate for quality/size balance
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('Audio chunk received:', event.data.size, 'bytes, type:', event.data.type);
          chunksRef.current.push(event.data);
          // Call real-time transcription callback if provided
          if (onAudioChunkRef.current && event.data.size > 0) {
            onAudioChunkRef.current(event.data);
          }
        }
      };

      mediaRecorder.start(10000); // Record in 10-second chunks for better stability
      mediaRecorderRef.current = mediaRecorder;

      // Setup audio analysis
      const audioContext = new AudioContext({ sampleRate: 48000 });
      const source = audioContext.createMediaStreamSource(stream);
      
      if (isStereo) {
        // Stereo analysis setup
        const splitter = audioContext.createChannelSplitter(2);
        const leftAnalyzer = audioContext.createAnalyser();
        const rightAnalyzer = audioContext.createAnalyser();
        
        leftAnalyzer.fftSize = 256;
        rightAnalyzer.fftSize = 256;
        
        source.connect(splitter);
        splitter.connect(leftAnalyzer, 0);
        splitter.connect(rightAnalyzer, 1);
        
        splitterRef.current = splitter;
        leftAnalyzerRef.current = leftAnalyzer;
        rightAnalyzerRef.current = rightAnalyzer;
      } else {
        // Mono analysis setup
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 256;
        source.connect(analyzer);
        analyzerRef.current = analyzer;
      }

      audioContextRef.current = audioContext;

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
          // Stereo level monitoring
          const leftData = new Uint8Array(leftAnalyzerRef.current.frequencyBinCount);
          const rightData = new Uint8Array(rightAnalyzerRef.current.frequencyBinCount);
          
          leftAnalyzerRef.current.getByteFrequencyData(leftData);
          rightAnalyzerRef.current.getByteFrequencyData(rightData);
          
          const leftLevel = leftData.reduce((sum, value) => sum + value, 0) / leftData.length / 255;
          const rightLevel = rightData.reduce((sum, value) => sum + value, 0) / rightData.length / 255;
          
          setStereoInfo(prev => ({ ...prev, leftLevel, rightLevel }));
          setAudioLevel(Math.max(leftLevel, rightLevel));
        } else if (analyzerRef.current) {
          // Mono level monitoring
          const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
          analyzerRef.current.getByteFrequencyData(dataArray);
          const level = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length / 255;
          setAudioLevel(level);
        }
      }, 50);

      setState('recording');
      
      toast({
        title: enableStereo ? "Enregistrement stéréo démarré" : "Enregistrement démarré",
        description: `Enregistrement ${isStereo ? 'stéréo' : 'mono'} en cours • Enregistrement local uniquement`,
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
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.pause();
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
    if (mediaRecorderRef.current && state === 'paused') {
      mediaRecorderRef.current.resume();
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

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(null);
        return;
      }

      setState('processing');

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
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
        }
        if (levelIntervalRef.current) {
          clearInterval(levelIntervalRef.current);
        }

        setState('idle');
        setDuration(0);
        setAudioLevel(0);
        chunksRef.current = [];
        mediaRecorderRef.current = null;
        analyzerRef.current = null;

        toast({
          title: "Enregistrement terminé",
          description: `Audio enregistré (${Math.round(blob.size / 1024)} Ko)`
        });

        resolve(blob);
      };

      mediaRecorderRef.current.stop();
    });
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
    isSupported,
  };
}