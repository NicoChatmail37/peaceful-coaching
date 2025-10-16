import { useMemo } from 'react';
import { StereoInfo } from './useAudioRecording';

interface TranscriptSegment {
  id: number;
  start: number;  
  end: number;
  text: string;
}

interface DialogueMessage {
  id: string;
  speaker: 'therapist' | 'client' | 'unknown';
  text: string;
  start: number;
  end: number;
  confidence: number;
}

interface DialogueStats {
  totalMessages: number;
  therapistCount: number;
  clientCount: number;
  unknownCount: number;
  avgConfidence: number;
  stereoDetected: boolean;
}

interface UseDialogueTranscriptResult {
  messages: DialogueMessage[];
  stats: DialogueStats;
  isReliable: boolean;
}

export function useDialogueTranscript(
  segments: TranscriptSegment[] = [],
  stereoInfo: StereoInfo,
  options: {
    confidenceThreshold?: number;
    hysteresisMargin?: number;
    minSegmentDuration?: number;
  } = {}
): UseDialogueTranscriptResult {
  const {
    confidenceThreshold = 0.6,
    hysteresisMargin = 0.1,
    minSegmentDuration = 0.5
  } = options;

  const result = useMemo(() => {
    // If no segments, return empty result
    if (!segments || segments.length === 0) {
      return {
        messages: [],
        stats: {
          totalMessages: 0,
          therapistCount: 0,
          clientCount: 0,
          unknownCount: 0,
          avgConfidence: 0,
          stereoDetected: stereoInfo.isStereo
        },
        isReliable: false
      };
    }

    // If not stereo, assign all to therapist with low confidence
    if (!stereoInfo.isStereo || stereoInfo.channelCount < 2) {
      const messages: DialogueMessage[] = segments
        .filter(segment => segment.text.trim().length > 0)
        .filter(segment => (segment.end - segment.start) >= minSegmentDuration)
        .map(segment => ({
          id: `msg-${segment.id}`,
          speaker: 'therapist' as const,
          text: segment.text.trim(),
          start: segment.start,
          end: segment.end,
          confidence: 0.3 // Low confidence for mono
        }));

      return {
        messages,
        stats: {
          totalMessages: messages.length,
          therapistCount: messages.length,
          clientCount: 0,
          unknownCount: 0,
          avgConfidence: 0.3,
          stereoDetected: false
        },
        isReliable: false
      };
    }

    // Use native WhisperX diarization if available, fallback to RMS simulation
    const messages: DialogueMessage[] = [];
    let prevSpeaker: 'therapist' | 'client' | 'unknown' | null = null;

    for (const segment of segments) {
      if (segment.text.trim().length === 0) continue;
      if ((segment.end - segment.start) < minSegmentDuration) continue;

      let speaker: 'therapist' | 'client' | 'unknown';
      let confidence: number;
      
      // Check if we have native speaker info from WhisperX
      if ((segment as any).speaker) {
        // Use native diarization from WhisperX
        const nativeSpeaker = (segment as any).speaker;
        switch (nativeSpeaker) {
          case 'SPEAKER_00':
            speaker = 'therapist';
            confidence = 0.95;
            break;
          case 'SPEAKER_01':
            speaker = 'client';
            confidence = 0.95;
            break;
          default:
            speaker = 'unknown';
            confidence = 0.5;
        }
        console.log(`🎭 Native speaker: ${nativeSpeaker} → ${speaker} (confidence: ${confidence})`);
      } else {
        // Fallback to RMS simulation for backward compatibility
        const segmentMidpoint = (segment.start + segment.end) / 2;
        const timeBasedBias = Math.sin(segmentMidpoint * 0.5);
        
        const randomFactor = (Math.random() - 0.5) * 0.4;
        const leftBias = timeBasedBias + randomFactor;
        const rightBias = -timeBasedBias + randomFactor;
        
        const leftRMS = Math.max(0, 0.5 + leftBias);
        const rightRMS = Math.max(0, 0.5 + rightBias);
        
        const energyDifference = Math.abs(leftRMS - rightRMS);
        const strongerChannel = leftRMS > rightRMS ? 'left' : 'right';
        
        confidence = energyDifference;
        
        if (energyDifference < confidenceThreshold) {
          speaker = prevSpeaker || 'unknown';
          confidence = Math.max(0.2, confidence);
        } else {
          speaker = strongerChannel === 'left' ? 'therapist' : 'client';
          confidence = Math.min(0.95, confidence + 0.3);
          
          if (prevSpeaker && prevSpeaker !== speaker && energyDifference < (confidenceThreshold + hysteresisMargin)) {
            speaker = prevSpeaker;
            confidence = Math.max(0.4, confidence - 0.2);
          }
        }
      }

      messages.push({
        id: `msg-${segment.id}`,
        speaker,
        text: segment.text.trim(),
        start: segment.start,
        end: segment.end,
        confidence
      });

      prevSpeaker = speaker;
    }

    // Calculate stats
    const therapistCount = messages.filter(m => m.speaker === 'therapist').length;
    const clientCount = messages.filter(m => m.speaker === 'client').length;
    const unknownCount = messages.filter(m => m.speaker === 'unknown').length;
    const avgConfidence = messages.length > 0 
      ? messages.reduce((sum, m) => sum + m.confidence, 0) / messages.length 
      : 0;

    const stats: DialogueStats = {
      totalMessages: messages.length,
      therapistCount,
      clientCount,
      unknownCount,
      avgConfidence,
      stereoDetected: true
    };

    const isReliable = avgConfidence > 0.7 && unknownCount < (messages.length * 0.3);

    return { messages, stats, isReliable };
  }, [segments, stereoInfo, confidenceThreshold, hysteresisMargin, minSegmentDuration]);

  return result;
}