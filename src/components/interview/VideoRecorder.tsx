import React, { useRef, useEffect, useState, useCallback } from 'react';

interface VideoRecorderProps {
  sessionId: string;
  interviewId: string;
  isRecording: boolean;
  enableScreenShare?: boolean;
  onRecordingStart: () => void;
  onRecordingStop: (videoBlob: Blob, duration: number) => void;
  onError: (error: Error) => void;
}

interface RecordingMetadata {
  sessionId: string;
  interviewId: string;
  startTime: number;
  duration: number;
  fileSize: number;
  mimeType: string;
  resolution: string;
}

export const VideoRecorder: React.FC<VideoRecorderProps> = ({
  sessionId,
  interviewId,
  isRecording,
  enableScreenShare = false,
  onRecordingStart,
  onRecordingStop,
  onError
}) => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const [recordingState, setRecordingState] = useState<'idle' | 'starting' | 'recording' | 'stopping'>('idle');

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current = null;
    }
    recordedChunksRef.current = [];
  }, []);

  const startRecording = async () => {
    try {
      setRecordingState('starting');
      console.log('🎥 [VideoRecorder] STARTING VIDEO RECORDING for session:', sessionId);
      console.log('🎥 [VideoRecorder] Interview ID:', interviewId);

      // Standard camera + microphone recording
      console.log('[VideoRecorder] Standard mode: Camera + microphone only');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 15, max: 15 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      streamRef.current = stream;

      // Configure MediaRecorder with more compatible format
      let mimeType = 'video/webm;codecs=vp8,opus';
      let videoBitsPerSecond = 1000000; // 1Mbps for good quality
      let audioBitsPerSecond = 128000;  // 128kbps for audio

      // Try different codecs in order of preference for better compatibility
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        mimeType = 'video/webm;codecs=vp8';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        mimeType = 'video/webm;codecs=vp9';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      } else {
        console.warn('[VideoRecorder] No WebM or MP4 support, using default');
        mimeType = '';
      }

      console.log('[VideoRecorder] Using mimeType:', mimeType);

      // Create MediaRecorder with minimal options for better compatibility
      const mediaRecorderOptions: any = {};
      if (mimeType) {
        mediaRecorderOptions.mimeType = mimeType;
      }

      const mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);

      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      // Handle data chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          console.log('[VideoRecorder] Chunk received:', event.data.size, 'bytes', 'type:', event.data.type);

          // Debug: Check if chunks are valid
          if (recordedChunksRef.current.length === 1) {
            // Check first chunk header
            event.data.arrayBuffer().then(buffer => {
              const bytes = new Uint8Array(buffer);
              const header = Array.from(bytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ');
              console.log('[VideoRecorder] First chunk header:', header);
            });
          }
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        const duration = Date.now() - startTimeRef.current;
        console.log('[VideoRecorder] Recording stopped, duration:', duration, 'ms');

        const videoBlob = new Blob(recordedChunksRef.current, {
          type: mimeType
        });

        console.log('[VideoRecorder] Video blob created:', {
          size: videoBlob.size,
          type: videoBlob.type,
          duration: duration,
          chunksCount: recordedChunksRef.current.length
        });

        // Debug: Check final blob header
        videoBlob.arrayBuffer().then(buffer => {
          const bytes = new Uint8Array(buffer);
          const header = Array.from(bytes.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ');
          console.log('[VideoRecorder] Final blob header:', header);

          // Check for valid WebM/EBML headers
          // WebM files can start with different EBML headers:
          // 1A 45 DF A3 (EBML header) or 43 C3 81 XX (Cluster element)
          const isEBMLHeader = bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3;
          const isClusterHeader = bytes[0] === 0x43 && bytes[1] === 0xC3 && bytes[2] === 0x81;
          const isValidWebM = isEBMLHeader || isClusterHeader;
          console.log('[VideoRecorder] WebM header check:', {
            isEBMLHeader,
            isClusterHeader,
            isValidWebM,
            firstBytes: Array.from(bytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ')
          });
        });

        // Local download disabled
        console.log('🎥 [VideoRecorder] ✅ VIDEO RECORDING COMPLETED (local download disabled)');

        onRecordingStop(videoBlob, duration);
        setRecordingState('idle');
      };

      // Handle errors
      mediaRecorder.onerror = (event) => {
        console.error('[VideoRecorder] MediaRecorder error:', event);
        onError(new Error('MediaRecorder error occurred'));
        setRecordingState('idle');
      };

      // Start recording
      startTimeRef.current = Date.now();
      mediaRecorder.start(); // Don't specify interval - let browser decide for proper WebM structure
      setRecordingState('recording');
      onRecordingStart();

      console.log('🎥 [VideoRecorder] ✅ RECORDING STARTED SUCCESSFULLY', {
        mimeType,
        videoBitsPerSecond: videoBitsPerSecond,
        audioBitsPerSecond: audioBitsPerSecond,
        sessionId,
        interviewId
      });

    } catch (error) {
      console.error('[VideoRecorder] Failed to start recording:', error);
      setRecordingState('idle');
      onError(error instanceof Error ? error : new Error('Failed to start recording'));
      cleanup();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      setRecordingState('stopping');
      console.log('[VideoRecorder] Stopping recording...');
      mediaRecorderRef.current.stop();
      cleanup();
    }
  };

  useEffect(() => {
    if (isRecording && recordingState === 'idle') {
      startRecording();
    } else if (!isRecording && (recordingState === 'recording' || recordingState === 'starting')) {
      stopRecording();
    }
  }, [isRecording, recordingState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Debug component state
  useEffect(() => {
    console.log('[VideoRecorder] State changed:', {
      isRecording,
      recordingState,
      sessionId,
      interviewId
    });
  }, [isRecording, recordingState, sessionId, interviewId]);

  // This component doesn't render anything visible
  return null;
};

export default VideoRecorder;