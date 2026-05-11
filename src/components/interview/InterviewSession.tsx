import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AssemblyAIStreamer from './AssemblyAIStreamer';
import CartesiaSpeaker, { CartesiaSpeakerHandle } from './CartesiaSpeaker';
import { CameraFeed } from './CameraFeed';
import { CalibrationScreen } from './CalibrationScreen';
import { ParticleSphere } from './ParticleSphere';
import { TranscriptBox, TranscriptMessage } from './TranscriptBox';
import { useConversationOrchestrator } from '@/hooks/useConversationOrchestrator';
import { ConversationState } from '@/types/interview';
import { StreamMetrics } from './AssemblyAIStreamer';
import { VideoTimingManager } from '@/utils/videoTimingManager';
import { VideoTiming } from '@/types/videoTiming';
import VideoRecorder from './VideoRecorder';
import { videoUploadManager } from '@/utils/videoUpload';
import { Mic, MicOff, Settings, ChevronDown, Wifi, WifiOff, Clock, RefreshCw } from 'lucide-react';
import * as Sentry from '@sentry/react';

// Custom PhoneDisconnect icon
const PhoneDisconnectIcon = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="currentColor" viewBox="0 0 256 256" className={className}>
    <path d="M53.93,34.62A8,8,0,1,0,42.09,45.38L69.68,75.74a141.26,141.26,0,0,0-45.27,30.44c-20,20-21.92,49.46-4.69,71.67a16,16,0,0,0,18.38,5.07l49-17.37.29-.11a16,16,0,0,0,9.75-11.72l5.9-29.51a75.89,75.89,0,0,1,8.56-2.4l90.51,99.57a8,8,0,1,0,11.84-10.76Zm43.7,74.52a16,16,0,0,0-10.32,11.94l-5.9,29.5-48.78,17.3c-.1,0-.17.13-.27.17-12.33-15.9-11-36.22,3.36-50.56a125.79,125.79,0,0,1,45.47-29.1l18.3,20.14C98.87,108.73,98.25,108.92,97.63,109.14Zm138.65,68.71a16,16,0,0,1-18.38,5.07l-9.25-3.28A8,8,0,0,1,214,164.56l9.37,3.32.3.12c12.3-15.85,11-36.17-3.39-50.51-25.66-25.66-61.88-39.27-99.35-37.31a8,8,0,1,1-.83-16c42-2.19,82.63,13.1,111.49,42C251.58,126.17,253.51,155.64,236.28,177.85Z"></path>
  </svg>
);

// Configuration
const BACKEND_URL = import.meta.env.VITE_LLM_BACKEND_URL;
const WEBSOCKET_URL = import.meta.env.VITE_STT_WEBSOCKET_URL;

// Validate critical environment variables. These are interview-blocking
// in production; without them STT and the LLM agent simply can't connect.
// Sentry capture lets operators see the misconfigured deploy immediately.
if (!WEBSOCKET_URL) {
  console.error('[Interview] CRITICAL ERROR: WEBSOCKET_URL is undefined!');
  Sentry.captureMessage('VITE_STT_WEBSOCKET_URL missing at runtime', { level: 'error' });
}
if (!BACKEND_URL) {
  console.error('[Interview] CRITICAL ERROR: BACKEND_URL is undefined!');
  Sentry.captureMessage('VITE_LLM_BACKEND_URL missing at runtime', { level: 'error' });
}

interface InterviewSessionProps {
  interviewId: string;
  sessionId: string;
  candidateData: {
    id: string;
    name: string;
    email: string;
  };
  interviewConfig: {
    title: string;
    description: string;
    duration: number;
    type: string;
  };
  candidateToken?: string;
  apiEndpoints: {
    llmBackendUrl: string;
    websocketUrl: string;
  };
  isResumed?: boolean;
  conversationHistory?: any[];
  previousActiveDuration?: number;
  onInterviewComplete: (sessionData: any) => void;
  onInterviewError: (error: Error) => void;
  onCancel: () => void;
}

export const InterviewSession = ({
  interviewId,
  sessionId,
  candidateData,
  interviewConfig,
  candidateToken,
  apiEndpoints,
  isResumed = false,
  conversationHistory = [],
  previousActiveDuration = 0,
  onInterviewComplete,
  onInterviewError,
  onCancel
}: InterviewSessionProps) => {
  // Track session start time for active duration calculation
  const sessionStartTimeRef = useRef<number>(Date.now());

  // Timer state
  const [elapsedTime, setElapsedTime] = useState(0);

  // Use the conversation orchestrator for state management
  const conversationOrchestrator = useConversationOrchestrator(
    {
      sessionId,
      backendUrl: apiEndpoints.llmBackendUrl,
      interviewId,
      mode: 'prod',
      enableAutoTransition: true,
      userData: candidateData
    },
    {
      onStateChange: (newState) => {
        console.log('[Interview] State changed to:', ConversationState[newState], {
          isListening: newState === ConversationState.LISTENING,
          isSpeaking: newState === ConversationState.SPEAKING,
          isThinking: newState === ConversationState.THINKING
        });
        setIsListening(newState === ConversationState.LISTENING);
        setIsSpeaking(newState === ConversationState.SPEAKING);
      },
      onMessageAdded: (message) => {
        // Update textToSpeak when AI responds
        if (message.role === 'ai') {
          console.log('[Interview] New AI message received, stopping current TTS');

          // Stop any currently playing TTS immediately
          if (speakerRef.current && isSpeakingRef.current) {
            console.log('[Interview] Interrupting current TTS to play new message');
            speakerRef.current.stop();
          }

          console.log('[Interview] Setting AI message for speech:', message.content);
          setTextToSpeak(message.content);
          // Track AI speech start for video timing
          videoTimingRef.current.aiSpeakingStarted(message.content);

          // Add to transcript messages
          setTranscriptMessages(prev => [...prev, { role: 'ai', content: message.content }]);
        }
      },
      onInteractiveTask: (task) => {
        // For interactive tasks, add the question as an AI message
        if (task && task.question) {
          setTranscriptMessages(prev => [...prev, { role: 'ai', content: task.question }]);
        }
        setInteractiveTask(task);
      },
      onError: (error) => {
        console.error('[Interview] Conversation error:', error);
        onInterviewError(new Error(error));
      }
    }
  );

  // Initialize simple video timing manager
  const videoTimingRef = useRef<VideoTimingManager>(new VideoTimingManager());
  const pendingVideoTimings = useRef<Map<number, VideoTiming>>(new Map());

  // Audio and UI state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [ttsAudioLevel, setTtsAudioLevel] = useState(0); // TTS output audio level for animations
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const [currentUtterance, setCurrentUtterance] = useState("");
  const [textToSpeak, setTextToSpeak] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Interactive question state (still needed for backend handling)
  const [interactiveTask, setInteractiveTask] = useState<any | null>(null);

  // Transcript messages for the new UI
  const [transcriptMessages, setTranscriptMessages] = useState<TranscriptMessage[]>([]);

  // Extract state from conversation orchestrator
  const {
    state: conversationState,
    messages,
    isWaitingForResponse,
    sendMessage: orchestratorSendMessage,
    completeSpeaking,
    cleanup: cleanupOrchestrator
  } = conversationOrchestrator;

  // Speech rate control - use interviewConfig.voiceSpeed if available
  const [speechRate, setSpeechRate] = useState<"slow" | "normal" | "fast">(() => {
    const speed = (interviewConfig as any).voiceSpeed;
    return (speed === "slow" || speed === "fast" || speed === "normal") ? speed : "normal";
  });

  // Voice accent from interview config
  const voiceAccent = (interviewConfig as any).voiceAccent === "american" ? "american" : "indian";

  // Camera feed control
  const [showCameraFeed, setShowCameraFeed] = useState(true);

  // Calibration control
  const [showCalibration, setShowCalibration] = useState(false);

  // End interview loading state
  const [isEndingInterview, setIsEndingInterview] = useState(false);

  // Video recording state
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoUploadStatus, setVideoUploadStatus] = useState<'idle' | 'uploading' | 'completed' | 'error'>('idle');

  // Inactivity detection state
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [inactivityCountdown, setInactivityCountdown] = useState(60);

  const streamerRef = useRef<AssemblyAIStreamer | null>(null);
  const speakerRef = useRef<CartesiaSpeakerHandle>(null);
  const activityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityWarningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingRef = useRef(isSpeaking);
  const currentUtteranceRef = useRef(currentUtterance);
  const isWaitingRef = useRef(isWaitingForResponse);
  const truncatedAIMessageRef = useRef<string | null>(null);

  // Sync refs with state
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { currentUtteranceRef.current = currentUtterance; }, [currentUtterance]);
  useEffect(() => { isWaitingRef.current = isWaitingForResponse; }, [isWaitingForResponse]);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - sessionStartTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const getAudioDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });

        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const micDevices = allDevices.filter(device => device.kind === 'audioinput');

        setAudioDevices(micDevices);
        if (micDevices.length > 0) {
          setSelectedAudioDevice(micDevices[0].deviceId);
        }
      } catch (err) {
        console.error('[Interview] Error accessing media devices:', err);
      }
    };
    getAudioDevices();

    // If resuming, load conversation history instead of sending greeting
    if (!isInitialized && candidateData.name) {
      setIsInitialized(true);
      if (isResumed && conversationHistory.length > 0) {
        loadConversationHistory();
      } else {
        sendInitialMessage();
      }
    }
  }, []);

  // Load existing conversation history when resuming
  const loadConversationHistory = () => {
    try {
      console.log('[Interview] 🔄 Resuming interview with', conversationHistory.length, 'messages');

      // Load all messages into conversation orchestrator and transcript
      const loadedMessages: TranscriptMessage[] = [];
      conversationHistory.forEach((msg: any) => {
        const role = msg.type === 'user_message' ? 'user' : 'ai';
        const content = msg.text || msg.content || '';
        conversationOrchestrator.addMessage(role, content);
        loadedMessages.push({ role: role as 'ai' | 'user', content });
      });
      setTranscriptMessages(loadedMessages);

      // Find last AI message and speak it
      const lastAiMessage = [...conversationHistory].reverse().find((msg: any) =>
        msg.type === 'assistant_message' || msg.role === 'ai'
      );

      if (lastAiMessage) {
        const lastAiText = lastAiMessage.text || lastAiMessage.content || '';
        console.log('[Interview] 🔊 Speaking last AI message:', lastAiText.substring(0, 50) + '...');
        setTextToSpeak(lastAiText);
        conversationOrchestrator.transitionToState(ConversationState.SPEAKING);
      } else {
        // No AI message found, transition to listening
        conversationOrchestrator.transitionToState(ConversationState.LISTENING);
      }
    } catch (error) {
      console.error('[Interview] Error loading conversation history:', error);
      // Fallback to normal greeting
      sendInitialMessage();
    }
  };

  // Use pre-generated greeting - either from cache or in-flight request
  const sendInitialMessage = async () => {
    try {
      console.log('[Interview] ⚡ Retrieving pre-generated greeting...');

      // First check if greeting is already in sessionStorage (completed request)
      let cachedGreeting = sessionStorage.getItem(`greeting_${sessionId}`);

      if (cachedGreeting) {
        console.log('[Interview] ✅ Using cached greeting (instant!)');
        conversationOrchestrator.addMessage('ai', cachedGreeting);
        setTextToSpeak(cachedGreeting);
        setTranscriptMessages([{ role: 'ai', content: cachedGreeting }]);
        conversationOrchestrator.transitionToState(ConversationState.SPEAKING);
        sessionStorage.removeItem(`greeting_${sessionId}`);
        return;
      }

      // Check if request is in-flight from pre-check page
      const greetingPromise = (window as any)[`greetingPromise_${sessionId}`];

      if (greetingPromise) {
        console.log('[Interview] ⏳ Waiting for in-flight greeting request from pre-check page...');
        const greetingText = await greetingPromise;

        // Clean up
        delete (window as any)[`greetingPromise_${sessionId}`];

        if (greetingText) {
          console.log('[Interview] ✅ Using greeting from pre-check request (no duplicate call!)');
          conversationOrchestrator.addMessage('ai', greetingText);
          setTextToSpeak(greetingText);
          setTranscriptMessages([{ role: 'ai', content: greetingText }]);
          conversationOrchestrator.transitionToState(ConversationState.SPEAKING);
          return;
        }
      }

      // Fallback: neither cached nor in-flight - create new request
      console.warn('[Interview] ⚠️ No cached or in-flight greeting, fetching from API...');
      const result = await conversationOrchestrator.sendMessage('hi');

      if (result && !result.terminated) {
        conversationOrchestrator.transitionToState(ConversationState.SPEAKING);
      }
    } catch (error) {
      console.error('[Interview] Error loading greeting:', error);
      // Fallback to local welcome message if everything fails
      const fallbackMessage = `Hi ${candidateData.name}! I'm your AI interviewer, ready to chat with you today!`;
      conversationOrchestrator.addMessage('ai', fallbackMessage);
      setTextToSpeak(fallbackMessage);
      setTranscriptMessages([{ role: 'ai', content: fallbackMessage }]);
      conversationOrchestrator.transitionToState(ConversationState.SPEAKING);
    }
  };

  // Start STT connection once we have user data
  useEffect(() => {
    if (candidateData.name && !isInitialized) {
      handleStart();
    }
  }, [candidateData.name, isInitialized]);

  // Send chat message using conversation orchestrator
  const sendChatMessage = async (payload: { message: string }) => {
    const callTime = Date.now();
    console.log(`[AssemblyAIStreamer - LLM] [${callTime}] ========================================`);
    console.log(`[AssemblyAIStreamer - LLM] [${callTime}] 🤖 Sending to orchestrator:`, JSON.stringify(payload.message));
    console.log(`[AssemblyAIStreamer - LLM] [${callTime}] Message length: ${payload.message.length} chars`);

    // Add user message to transcript
    setTranscriptMessages(prev => [...prev, { role: 'user', content: payload.message }]);

    // Get truncated AI message if available and clear it
    const truncatedText = truncatedAIMessageRef.current;
    truncatedAIMessageRef.current = null;

    const result = await orchestratorSendMessage(payload.message, truncatedText);
    const responseTime = Date.now();
    console.log(`[AssemblyAIStreamer - LLM] [${responseTime}] 🤖 Response received after ${responseTime - callTime}ms`);

    // Check if the orchestrator ignored the call
    if (!result) {
      console.warn('[Interview] sendChatMessage call was ignored by the orchestrator (it was busy).');
      return;
    }

    if (result.error) {
      console.error("Error from conversation orchestrator:", result.error);
      return;
    }

    if (result.terminated) {
      handleEndInterview();
      return;
    }

    // Handle the response
    if (result.textToSpeak) {
      setTextToSpeak(result.textToSpeak);
    }

    if (result.isInteractive && result.task) {
      setInteractiveTask(result.task);
    } else {
      setInteractiveTask(null);
    }
  };

  // Inactivity detection and auto-close logic
  const resetInactivityTimer = useCallback(() => {
    // Clear all existing timers
    if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
    if (inactivityWarningTimerRef.current) clearTimeout(inactivityWarningTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    // Hide warning if showing
    setShowInactivityWarning(false);
    setInactivityCountdown(60);

    // Don't start timer if AI is speaking, interview not started, or interview is ending
    if (isSpeaking || !isInitialized || conversationState === ConversationState.IDLE || isEndingInterview) {
      return;
    }

    // Set 30-second warning timer
    activityTimerRef.current = setTimeout(() => {
      console.log('[Interview] 30 seconds of inactivity detected - showing warning');
      setShowInactivityWarning(true);
      setInactivityCountdown(60);

      // Start 60-second countdown
      let remaining = 60;
      countdownIntervalRef.current = setInterval(() => {
        remaining--;
        setInactivityCountdown(remaining);

        if (remaining <= 0) {
          console.log('[Interview] Inactivity timeout reached - ending interview');
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          handleEndInterview();
        }
      }, 1000);
    }, 30000); // 30 seconds
  }, [isSpeaking, isInitialized, conversationState, isEndingInterview]);

  const handleTranscriptUpdate = (transcript: string, isFinal: boolean) => {
    // Reset inactivity timer when user speaks
    if (transcript.trim()) {
      resetInactivityTimer();
    }

    // Track user speech start on first transcript update
    if (!isFinal && transcript.trim() && videoTimingRef.current.getCurrentSpeaker() !== 'USER') {
      const wasInterruption = videoTimingRef.current.userSpeakingStarted();

      // ECHO CANCELLATION: Stop AI speaking if user interrupts
      if (wasInterruption && isSpeakingRef.current) {
        // Handle AI interruption
        const aiTiming = videoTimingRef.current.aiWasInterrupted();
        if (aiTiming) {
          // Store timing for last AI message
          const lastAIMessageIndex = messages.length - 1;
          if (lastAIMessageIndex >= 0) {
            pendingVideoTimings.current.set(lastAIMessageIndex, aiTiming);
          }
        }

        // Get partial text spoken before interruption
        const partialText = speakerRef.current?.stop();
        console.log('[Interview] AI interrupted. Partial text:', partialText);

        // Store truncated AI message for sending to backend
        if (partialText && partialText.trim()) {
          truncatedAIMessageRef.current = partialText + "...";
        }

        setIsSpeaking(false);
        // Brief mute to prevent feedback loops
        streamerRef.current?.setMuted(true);
        setTimeout(() => {
          if (streamerRef.current && isMicOn) {
            streamerRef.current?.setMuted(false);
          }
        }, 400);
      }
    }

    // AssemblyAI provides clean transcripts - no stitching needed!
    // Display partial transcripts as they come
    if (!isFinal) {
      setCurrentUtterance(transcript);
      return;
    }

    // Handle final transcripts - these are immutable and complete
    if (isFinal && transcript.trim()) {
      const receiveTime = Date.now();
      console.log(`[AssemblyAIStreamer - Transcript] [${receiveTime}] ========================================`);
      console.log(`[AssemblyAIStreamer - Transcript] [${receiveTime}] 📝 isFinal=true received`);
      console.log(`[AssemblyAIStreamer - Transcript] [${receiveTime}] Text: "${transcript}"`);
      console.log(`[AssemblyAIStreamer - Transcript] [${receiveTime}] → Triggering LLM call...`);

      // Track user speech end and get video timing
      const userTiming = videoTimingRef.current.userSpeakingEnded();

      // Show the final complete transcript briefly before clearing
      setCurrentUtterance(transcript);

      // Send the complete, final transcript
      sendChatMessage({ message: transcript });

      // Clear the utterance display after a brief moment (so user sees the complete text)
      setTimeout(() => {
        setCurrentUtterance("");
      }, 500);

      // Store timing for this user message
      if (userTiming) {
        const futureMessageIndex = messages.length;
        pendingVideoTimings.current.set(futureMessageIndex, userTiming);
      }
    }
  };

  const handleMicToggle = () => {
    const newMicState = !isMicOn;
    setIsMicOn(newMicState);
    streamerRef.current?.setMuted(!newMicState);
  };

  // Store interview session completion and results
  const storeSessionCompletion = async (conversationHistory: any[]) => {
    if (!candidateToken) {
      console.warn('[Interview] No candidate token available, skipping session completion storage');
      return null;
    }

    try {
      // Calculate current session duration in seconds
      const currentSessionDuration = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);

      // Add to previous duration for cumulative active time
      const totalActiveDuration = previousActiveDuration + currentSessionDuration;

      console.log(`[Interview] Active duration: previous=${previousActiveDuration}s + current=${currentSessionDuration}s = total=${totalActiveDuration}s (${(totalActiveDuration/60).toFixed(1)} mins)`);

      const requestBody: any = {
        candidate_token: candidateToken,
        conversation_history: conversationHistory,
        active_duration: totalActiveDuration  // Send cumulative active time
      };

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/candidate-sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        console.error('[Interview] Failed to store session completion:', response.statusText);
        return null;
      }

      const result = await response.json();
      console.log('[Interview] Session completion stored successfully:', result);
      return result;
    } catch (error) {
      console.error('[Interview] Error storing session completion:', error);
      return null;
    }
  };

  // Start the AssemblyAI streaming connection
  const handleStart = () => {
    // Prevent multiple connections
    if (connectionStatus === 'connecting' || connectionStatus === 'connected') {
      return;
    }

    // Cleanup any existing connection
    if (streamerRef.current) {
      streamerRef.current.stopStreaming();
      streamerRef.current = null;
    }

    setConnectionStatus('connecting');
    setIsMicOn(true);

    // Create AssemblyAI streamer (no complex config needed!)
    streamerRef.current = new AssemblyAIStreamer(
      sessionId,
      handleTranscriptUpdate,
      (metrics: StreamMetrics) => {
        // Update audio level visualization
        const level = metrics.speechThreshold > 0 ? Math.min(metrics.currentRms / (metrics.speechThreshold * 1.5), 1) : 0;
        setAudioLevel(level);
        // Log periodically for debugging (only when there's significant audio)
        if (level > 0.1) {
          console.log('[Interview] Mic audio level:', level.toFixed(3));
        }
      },
      () => {
        console.log('[Interview] ✅ AssemblyAI connected - ready for continuous listening');
        setConnectionStatus('connected');
      },
      (error) => {
        console.error('[Interview] ❌ AssemblyAI error:', error);
        setConnectionStatus('error');
      },
      import.meta.env.VITE_API_BASE_URL, // Backend URL for token generation (local Flask backend)
      selectedAudioDevice
    );

    streamerRef.current.startStreaming();
  };

  // Reconnect function for STT failures
  const handleReconnect = () => {
    console.log('[Interview] Attempting to reconnect STT...');
    setConnectionStatus('idle');
    // Small delay to ensure cleanup, then restart
    setTimeout(() => {
      handleStart();
    }, 500);
  };

  const handleCalibrationComplete = () => {
    setShowCalibration(false);
    // Re-enable the mic if it was muted by the manual calibration handler
    streamerRef.current?.setMuted(false);
  };

  // Refs to track video recording state immediately (bypass React state delays)
  const videoRecordingStateRef = useRef({
    isRecording: false,
    blob: null as Blob | null,
    duration: 0
  });

  // Video recording handlers
  const handleVideoRecordingStart = () => {
    console.log('🎥 [Interview] ✅ VIDEO RECORDING STARTED');
    videoRecordingStateRef.current.isRecording = true;
    setIsVideoRecording(true);
  };


  const handleVideoRecordingStop = (videoBlob: Blob, duration: number) => {
    console.log('🎥 [Interview] ✅ VIDEO RECORDING STOPPED:', {
      size: videoBlob.size,
      duration,
      type: videoBlob.type,
      sizeInMB: (videoBlob.size / 1024 / 1024).toFixed(2) + ' MB'
    });

    // Update refs immediately (no React state delay)
    videoRecordingStateRef.current.isRecording = false;
    videoRecordingStateRef.current.blob = videoBlob;
    videoRecordingStateRef.current.duration = duration;

    // Update React state for UI
    setIsVideoRecording(false);
    setVideoBlob(videoBlob);
    setVideoDuration(duration);
  };

  const handleVideoRecordingError = (error: Error) => {
    console.error('[Interview] Video recording error:', error);
    videoRecordingStateRef.current.isRecording = false;
    setIsVideoRecording(false);
    onInterviewError(new Error(`Video recording failed: ${error.message}`));
  };

  const handleManualCalibration = () => {
    // Pause everything and show the calibration modal
    if (isSpeaking) {
      speakerRef.current?.stop();
    }
    streamerRef.current?.setMuted(true);
    setShowCalibration(true);
  };

  // Background processing function for video upload and session storage
  const processVideoAndResults = async (historyWithTiming: any[]) => {
    try {
      // Wait for video blob to be available (up to 8 more seconds)
      let waitCount = 0;
      while (!videoRecordingStateRef.current.blob && waitCount < 80) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
      }

      // Upload video if recording was successful
      let videoUploadResult = null;
      console.log('🎥 [Background] VIDEO UPLOAD CHECK:', {
        hasVideoBlob: !!videoRecordingStateRef.current.blob,
        videoBlobSize: videoRecordingStateRef.current.blob ? videoRecordingStateRef.current.blob.size : 0,
        videoDuration: videoRecordingStateRef.current.duration,
        sessionId,
        interviewId
      });

      if (videoRecordingStateRef.current.blob && videoRecordingStateRef.current.duration > 0) {
        console.log('🎥 [Background] ✅ STARTING VIDEO UPLOAD TO GCS...');
        setVideoUploadStatus('uploading');

        try {
          videoUploadResult = await videoUploadManager.uploadVideoWithRetry(
            videoRecordingStateRef.current.blob!,
            sessionId,
            interviewId,
            videoRecordingStateRef.current.duration
          );

          if (videoUploadResult.success) {
            console.log('[Background] Video uploaded successfully:', videoUploadResult.url);
            setVideoUploadStatus('completed');
          } else {
            console.error('[Background] Video upload failed:', videoUploadResult.error);
            setVideoUploadStatus('error');
            // Surface to operators — candidate has already navigated to the
            // thank-you page by the time we reach here, so a toast won't
            // render. Recruiter still has the transcript; this is monitoring.
            Sentry.captureMessage('Video upload failed after retries', {
              level: 'warning',
              tags: { sessionId, interviewId },
              extra: { error: videoUploadResult.error, blobSize: videoRecordingStateRef.current.blob?.size },
            });
          }
        } catch (error) {
          console.error('[Background] Video upload error:', error);
          setVideoUploadStatus('error');
          Sentry.captureException(error, {
            tags: { sessionId, interviewId, stage: 'video_upload' },
          });
        }
      } else {
        console.log('🎥 [Background] ❌ SKIPPING VIDEO UPLOAD - No video blob or zero duration');
      }

      // Store session completion and generate results in database
      const storeResult = await storeSessionCompletion(historyWithTiming);
      console.log('[Background] Session completion stored:', !!storeResult);

    } catch (error) {
      console.error('[Background] Error in background processing:', error);
    }
  };

  const handleEndInterview = async () => {
    // Set loading state immediately
    setIsEndingInterview(true);

    try {
      // Stop all audio/speech systems
      if (isSpeaking) {
        speakerRef.current?.stop();
        setIsSpeaking(false);
      }

      // Stop STT WebSocket connection
      streamerRef.current?.stopStreaming();

      // Cleanup conversation orchestrator
      cleanupOrchestrator();

      // Brief wait for video recording to stop (max 2 seconds)
      if (isVideoRecording || videoRecordingStateRef.current.isRecording) {
        console.log('🎥 [Interview] Brief wait for video recording to stop...');
        let waitCount = 0;
        while (videoRecordingStateRef.current.isRecording && waitCount < 20) {
          await new Promise(resolve => setTimeout(resolve, 100));
          waitCount++;
        }
        console.log('🎥 [Interview] Video recording stop wait completed');
      }

      // Convert messages to history format for results page
      const historyForResults = conversationOrchestrator.convertToHistoryFormat(messages);

      // Add video timing to conversation history
      const historyWithTiming = historyForResults.map((entry, index) => {
        const timing = pendingVideoTimings.current.get(index);
        if (timing) {
          return {
            ...entry,
            video_start: timing.video_start,
            video_end: timing.video_end,
            was_interrupted: timing.was_interrupted
          };
        }
        return entry;
      });

      console.log('[Interview] Enhanced conversation history with video timing:',
        historyWithTiming.filter(h => h.video_start).length, 'entries have timing');

      // Calculate session data for immediate navigation
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - sessionStartTimeRef.current) / 1000);

      const sessionData = {
        sessionId,
        duration,
        conversationHistory: historyForResults,
        audioMetrics: {
          averageLevel: audioLevel,
          silenceDuration: 0,
          totalSpeechTime: duration
        },
        videoMetrics: null, // Will be updated in background
        completedAt: endTime.toISOString(),
        candidateName: candidateData.name,
        candidateEmail: candidateData.email,
        results: null // Will be updated in background
      };

      console.log('[Interview] Ending interview - navigating immediately');
      onInterviewComplete(sessionData);

      // Continue processing in background (don't await). Candidate has
      // already navigated to thank-you; failures here are operator
      // visibility only.
      processVideoAndResults(historyWithTiming).catch(error => {
        console.error('[Interview] Background processing error:', error);
        Sentry.captureException(error, {
          tags: { sessionId, interviewId, stage: 'background_processing' },
        });
      });

    } catch (error) {
      console.error('[Interview] Error ending interview:', error);
      // Still complete the interview even if there's an error
      onInterviewComplete({ sessionId, error: 'Error saving interview data' });
    } finally {
      // Reset loading state
      setIsEndingInterview(false);
    }
  };

  // Start inactivity timer when interview is ready and waiting for user
  useEffect(() => {
    if (isInitialized && conversationState === ConversationState.LISTENING && !isSpeaking) {
      console.log('[Interview] Starting inactivity detection - interview is listening');
      resetInactivityTimer();
    }
  }, [isInitialized, conversationState, isSpeaking, resetInactivityTimer]);

  // Cleanup inactivity timers on component unmount
  useEffect(() => {
    return () => {
      if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
      if (inactivityWarningTimerRef.current) clearTimeout(inactivityWarningTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Video Recording Component - hidden but active */}
      <VideoRecorder
        sessionId={sessionId}
        interviewId={interviewId}
        isRecording={isInitialized && !isEndingInterview}
        onRecordingStart={handleVideoRecordingStart}
        onRecordingStop={handleVideoRecordingStop}
        onError={handleVideoRecordingError}
      />

      {/* 3D Particle Sphere - Full Screen Canvas */}
      <ParticleSphere
        conversationState={conversationState}
        audioLevel={conversationState === ConversationState.SPEAKING ? ttsAudioLevel : audioLevel}
        className="absolute inset-0"
      />

      {/* Logo - Top Left */}
      <div className="absolute top-6 left-6 z-10">
        <h1 className="text-xl font-bold text-white whitespace-nowrap">FLOWDOT AI</h1>
        <p className="text-xs text-slate-400 whitespace-nowrap">Candidate Portal</p>
      </div>

      {/* Interview Title & Connection Status - Center Top */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 flex flex-col items-center z-10">
        <h2 className="text-slate-300 text-sm font-normal uppercase tracking-wider mb-2">{interviewConfig.title}</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-red-500">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">{formatTime(elapsedTime)}</span>
          </div>
          <div className={`flex items-center gap-1.5 ${connectionStatus === 'connected' ? 'text-green-500' : connectionStatus === 'error' ? 'text-red-500' : 'text-amber-500'}`}>
            {connectionStatus === 'connected' ? (
              <Wifi className="w-4 h-4" />
            ) : connectionStatus === 'error' ? (
              <WifiOff className="w-4 h-4" />
            ) : (
              <Wifi className="w-4 h-4 animate-pulse" />
            )}
            <span className="text-sm font-medium">
              {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'error' ? 'Disconnected' : 'Connecting...'}
            </span>
          </div>
          {/* Reconnect button when error */}
          {connectionStatus === 'error' && (
            <button
              onClick={handleReconnect}
              className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors"
              title="Reconnect"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Camera Feed Tile - Top Right */}
      <div className="absolute top-6 right-6 w-72 h-52 z-10">
        <CameraFeed
          isVisible={showCameraFeed}
          className="w-full h-full"
        />
      </div>

      {/* Transcript Box - Below Camera Feed */}
      <div className="absolute top-[248px] right-6 w-72 h-[400px] z-10">
        <TranscriptBox
          messages={transcriptMessages}
          currentUtterance={currentUtterance}
          isUserSpeaking={isListening && !!currentUtterance}
          className="w-full h-full"
        />
      </div>

      {/* Audio Controls Bar - Bottom Center */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-4 z-10">
        {/* Mic Button */}
        <button
          onClick={handleMicToggle}
          className={`relative flex items-center justify-center h-12 w-12 rounded-full border-2 transition-all ${
            isMicOn ? 'border-sky-500 bg-sky-500/10' : 'border-gray-600 bg-gray-500/10'
          }`}
        >
          {isMicOn ? <Mic size={20} className="text-sky-400" /> : <MicOff size={20} className="text-gray-400" />}
        </button>

        {/* Device Selector */}
        <div className="relative">
          <select
            value={selectedAudioDevice}
            onChange={(e) => setSelectedAudioDevice(e.target.value)}
            className="appearance-none flex items-center gap-2 h-10 px-3 pr-8 border border-slate-600 rounded-md bg-transparent text-slate-300 text-xs cursor-pointer focus:outline-none focus:border-sky-500"
          >
            {audioDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId} className="bg-slate-800">
                {device.label || `Microphone ${audioDevices.indexOf(device) + 1}`}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>

        {/* Calibration Button */}
        <button
          onClick={handleManualCalibration}
          className="h-10 w-10 flex items-center justify-center border border-slate-600 rounded-md hover:bg-slate-800 transition-colors"
        >
          <Settings className="w-4 h-4 text-slate-400" />
        </button>

        {/* Speech Rate Control - 3 Radio Buttons */}
        <div className="flex items-center gap-0.5 bg-slate-800 rounded-md p-0.5">
          <button
            onClick={() => setSpeechRate('slow')}
            className={`px-3 py-1.5 rounded text-xs transition-colors ${
              speechRate === 'slow' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-700'
            }`}
          >
            Slow
          </button>
          <button
            onClick={() => setSpeechRate('normal')}
            className={`px-3 py-1.5 rounded text-xs transition-colors ${
              speechRate === 'normal' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-700'
            }`}
          >
            Normal
          </button>
          <button
            onClick={() => setSpeechRate('fast')}
            className={`px-3 py-1.5 rounded text-xs transition-colors ${
              speechRate === 'fast' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-700'
            }`}
          >
            Fast
          </button>
        </div>

        {/* End Call Button */}
        <button
          onClick={handleEndInterview}
          disabled={isEndingInterview}
          className="h-12 w-12 flex items-center justify-center bg-red-600 hover:bg-red-700 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isEndingInterview ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <PhoneDisconnectIcon size={20} className="text-white" />
          )}
        </button>
      </div>

      {/* Calibration Screen */}
      <CalibrationScreen
        open={showCalibration}
        onOpenChange={setShowCalibration}
        onComplete={handleCalibrationComplete}
      />

      {/* Inactivity Warning - Below Logo */}
      <AnimatePresence>
        {showInactivityWarning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed top-24 left-6 z-50"
          >
            <button
              onClick={resetInactivityTimer}
              className="relative w-32 h-32 flex items-center justify-center cursor-pointer group"
            >
              {/* Circular progress ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90 transform">
                {/* Background circle */}
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#334155"
                  strokeWidth="6"
                  fill="none"
                />
                {/* Progress circle with color transition */}
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke={
                    inactivityCountdown > 40
                      ? "#eab308" // yellow-500 (60-40s)
                      : inactivityCountdown > 20
                        ? "#f97316" // orange-500 (40-20s)
                        : "#ef4444" // red-500 (20-0s)
                  }
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - inactivityCountdown / 60)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>

              {/* Center button */}
              <div className="relative z-10 w-24 h-24 rounded-full bg-slate-800 border border-slate-600 shadow-xl flex items-center justify-center group-hover:bg-slate-700 transition-colors">
                <span className="text-xs font-normal text-slate-300 uppercase tracking-wider">I'm here</span>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <CartesiaSpeaker
        ref={speakerRef}
        text={textToSpeak}
        trigger={conversationState === ConversationState.SPEAKING}
        mode="full"
        speechRate={speechRate}
        voiceAccent={voiceAccent}
        onSpeakingStateChange={setIsSpeaking}
        onAudioLevel={setTtsAudioLevel}
        onComplete={() => {
          console.log('[Interview] Speaking completed, transitioning to listening');
          // Track AI speech end and get video timing
          const aiTiming = videoTimingRef.current.aiSpeakingEnded();

          // Store timing for the most recent AI message
          if (aiTiming) {
            const lastAIMessageIndex = messages.length - 1;
            if (lastAIMessageIndex >= 0) {
              pendingVideoTimings.current.set(lastAIMessageIndex, aiTiming);
            }
          }

          completeSpeaking();

          // Resume inactivity timer after AI finishes speaking
          resetInactivityTimer();
        }}
      />
    </div>
  );
};
