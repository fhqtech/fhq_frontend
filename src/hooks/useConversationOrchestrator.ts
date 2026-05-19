import { useState, useRef, useCallback } from 'react';
import { ConversationState, HistoryItem } from '@/types/interview';
import { useToast } from '@/hooks/use-toast';

// Stall thresholds for a single agent turn. Both are wall-clock measured
// from the moment we call fetch(). 15s = soft warning; 60s = hard abort
// + recoverable error so the candidate isn't stuck staring at silence.
const STALL_WARN_MS = 15_000;
const STALL_ABORT_MS = 60_000;

// Enhanced message interface with metadata
export interface ConversationMessage {
  role: "user" | "ai";
  content: string;
  timestamp: Date;
  id: string;
  metadata?: {
    isInteractive?: boolean;
    taskType?: string;
    confidence?: number;
    questionId?: string;
    questionStatus?: 'pending' | 'addressed' | 'dodged';
    attemptCount?: number;
  };
}

interface ConversationOrchestratorConfig {
  sessionId: string;
  backendUrl: string;
  interviewId: string;
  mode?: 'prod' | 'test';
  enableAutoTransition?: boolean;
  userData?: {
    name: string;
    email: string;
  };
}

export interface InteractiveTask {
  // Locally-generated on the orchestrator side: 'long_text' (auto-converted
  // for long replies) or 'interactive_task' (when the backend signals an
  // interactive turn). Extend the union as new task types are introduced.
  taskType?: 'long_text' | 'interactive_task' | string;
  description?: string;
  // Consumer-side convenience field; set by InterviewSession when it wants
  // the task to also render as an AI message in the transcript.
  question?: string;
}

interface ConversationCallbacks {
  onStateChange?: (state: ConversationState) => void;
  onMessageAdded?: (message: ConversationMessage) => void;
  onInteractiveTask?: (task: InteractiveTask) => void;
  onError?: (error: string) => void;
}

export const useConversationOrchestrator = (
  config: ConversationOrchestratorConfig,
  callbacks?: ConversationCallbacks
) => {
  // Core state management
  const [state, setState] = useState<ConversationState>(ConversationState.IDLE);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentInteractiveTask, setCurrentInteractiveTask] = useState<InteractiveTask | null>(null);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  
  // Internal refs for state management
  const stateRef = useRef(state);
  const messagesRef = useRef(messages);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messageIdCounter = useRef(0);
  const pendingMessageRef = useRef<string>('');
  const sendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stallWarnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stallAbortTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stalledRef = useRef<boolean>(false);
  const { toast } = useToast();

  // TD2: parents pass `config` + `callbacks` as fresh object literals on
  // every render, which would otherwise recreate every useCallback in this
  // hook. Mirror them into refs so the useCallbacks can stay stable and
  // still read the latest values. Updates happen in the body (not effects)
  // so the ref is always current relative to the render reading it.
  const configRef = useRef(config);
  configRef.current = config;
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // Sync refs with state
  stateRef.current = state;
  messagesRef.current = messages;

  // State transition with callbacks
  const transitionToState = useCallback((newState: ConversationState) => {
    setState(prevState => {
      console.log('[Orchestrator] transitionToState called:', {
        from: ConversationState[prevState],
        to: ConversationState[newState],
        isSame: prevState === newState
      });
      if (prevState === newState) return prevState; // Avoid redundant transitions
      callbacksRef.current?.onStateChange?.(newState);
      return newState;
    });
  }, []);

  // Generate unique message ID
  const generateMessageId = () => {
    messageIdCounter.current += 1;
    return `msg_${Date.now()}_${messageIdCounter.current}`;
  };

  // Add message to conversation
  const addMessage = useCallback((
    role: "user" | "ai", 
    content: string, 
    metadata?: ConversationMessage['metadata']
  ) => {
    const message: ConversationMessage = {
      role,
      content,
      timestamp: new Date(),
      id: generateMessageId(),
      metadata
    };

    setMessages(prev => [...prev, message]);
    callbacksRef.current?.onMessageAdded?.(message);
    return message;
  }, []);

  // Convert messages to backend history format
  const convertToHistoryFormat = useCallback((msgs: ConversationMessage[]): HistoryItem[] => {
    return msgs.map(msg => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
  }, []);

  // Enhanced message sending with state management and batching
  const sendMessage = useCallback(async (
    content: string,
    truncatedAIMessage?: string | null,
    options?: {
      hideFromUser?: boolean;
      skipStateTransition?: boolean;
    }
  ) => {
    if (!content.trim()) {
      console.warn('[ConversationOrchestrator] Attempted to send empty message');
      return {};
    }

    // If we're already waiting for a response, batch this message with pending ones
    if (isWaitingForResponse) {
      console.log(`[ConversationOrchestrator] Request in progress - batching message: "${content}"`);

      // Abort the current request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Add to pending message (combine with space)
      const previousPending = pendingMessageRef.current;
      pendingMessageRef.current = previousPending ? `${previousPending} ${content}` : content;

      console.log(`[ConversationOrchestrator] Combined pending message: "${pendingMessageRef.current}"`);

      // Clear any existing timeout
      if (sendTimeoutRef.current) {
        clearTimeout(sendTimeoutRef.current);
      }

      // Set a new timeout to send the combined message
      sendTimeoutRef.current = setTimeout(() => {
        const combinedMessage = pendingMessageRef.current;
        pendingMessageRef.current = '';
        console.log(`[ConversationOrchestrator] Sending combined message: "${combinedMessage}"`);
        sendMessage(combinedMessage, options);
      }, 500); // Wait 500ms for more messages

      return {};
    }

    // Add user message to conversation (unless hidden)
    if (!options?.hideFromUser) {
      addMessage('user', content);
    }

    // Transition to thinking state
    if (!options?.skipStateTransition) {
      transitionToState(ConversationState.THINKING);
    }

    setIsWaitingForResponse(true);

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      // TD2: read latest config via the ref so this useCallback stays stable.
      const cfg = configRef.current;
      // Prepare request in simplified format
      const requestBody: any = {
        interviewId: cfg.interviewId,
        sessionId: cfg.sessionId,
        newUserMessage: content
      };

      // Add truncated AI message if available
      if (truncatedAIMessage) {
        requestBody.truncatedAIMessage = truncatedAIMessage;
        console.log('[ConversationOrchestrator] Including truncated AI message:', truncatedAIMessage);
      }

      console.log('[ConversationOrchestrator] Sending request to backend:', cfg.backendUrl);

      // Stall watchdogs: warn at 15s, hard-abort at 60s. Without these the
      // candidate has no signal whether the backend is alive when an agent
      // turn takes longer than usual.
      if (stallWarnTimerRef.current) clearTimeout(stallWarnTimerRef.current);
      if (stallAbortTimerRef.current) clearTimeout(stallAbortTimerRef.current);
      const localController = abortControllerRef.current;
      stalledRef.current = false;
      stallWarnTimerRef.current = setTimeout(() => {
        toast({
          title: 'Taking longer than usual…',
          description: 'Hang tight — the interviewer will reply shortly.',
        });
      }, STALL_WARN_MS);
      stallAbortTimerRef.current = setTimeout(() => {
        console.warn('[ConversationOrchestrator] Stall abort fired after 60s');
        stalledRef.current = true;
        localController?.abort();
      }, STALL_ABORT_MS);

      let response: Response;
      try {
        // TD3: client-generated idempotency key. If the browser retries
        // this POST (network blip, AbortController fired after the server
        // already received it), the backend dedupes on (sessionId, key)
        // and returns the cached response — no duplicate conversation
        // history entry. The key lives only for this turn; a fresh turn
        // gets a fresh key.
        const idempotencyKey =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${cfg.sessionId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

        response = await fetch(cfg.backendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Backend rate-limits per session when this header is present;
            // without it, candidates behind a corporate NAT share an IP
            // and collide on the 100/min cap.
            'X-Session-Id': cfg.sessionId,
            'X-Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify(requestBody),
          signal: localController?.signal,
        });
      } finally {
        if (stallWarnTimerRef.current) {
          clearTimeout(stallWarnTimerRef.current);
          stallWarnTimerRef.current = null;
        }
        if (stallAbortTimerRef.current) {
          clearTimeout(stallAbortTimerRef.current);
          stallAbortTimerRef.current = null;
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Backend returns N8N-compatible array format: [{"output": {"response": "...", "type": "..."}}]
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      // Extract response from N8N format or direct format
      let aiMessage: string;
      let responseType: string = 'normal';

      if (Array.isArray(data) && data.length > 0 && data[0]?.output) {
        // N8N format: [{"output": {"response": "...", "type": "..."}}]
        aiMessage = data[0].output.response;
        responseType = data[0].output.type || 'normal';
      } else if (data.response) {
        // Direct format: {"response": "...", "type": "..."}
        aiMessage = data.response;
        responseType = data.type || 'normal';
      } else {
        throw new Error('Invalid response format from backend');
      }

      // Check for interview termination signal
      if (typeof aiMessage === 'string' && aiMessage.includes('[END_INTERVIEW]')) {
        console.log('[ConversationOrchestrator] Interview termination signal received');
        transitionToState(ConversationState.IDLE);
        return { terminated: true };
      }

      // Parse response for interactive tasks
      const parsedResponse = parseAIResponse(aiMessage, responseType);

      // Add AI message to conversation
      const aiMessageObj = addMessage('ai', parsedResponse.textForHistory, {
        isInteractive: parsedResponse.responseType === 'interactive',
        taskType: parsedResponse.problemData?.taskType,
      });

      // Handle interactive tasks
      if (parsedResponse.responseType === 'interactive' && parsedResponse.problemData) {
        setCurrentInteractiveTask(parsedResponse.problemData);
        callbacksRef.current?.onInteractiveTask?.(parsedResponse.problemData);
      } else {
        setCurrentInteractiveTask(null);
      }

      // Transition to speaking state
      transitionToState(ConversationState.SPEAKING);

      return {
        message: aiMessageObj,
        textToSpeak: parsedResponse.textForSpeech,
        isInteractive: parsedResponse.responseType === 'interactive',
        task: parsedResponse.problemData
      };

    } catch (error: any) {
      console.error('[ConversationOrchestrator] Error sending message:', error);

      if (error.name === 'AbortError') {
        // Distinguish stall-abort (our 60s watchdog) from in-flight reissue
        // (an incoming candidate utterance pre-empted this turn). Only the
        // stall case owes the candidate a visible recovery prompt.
        if (stalledRef.current) {
          stalledRef.current = false;
          toast({
            title: 'Connection issue',
            description: 'The interviewer didn\'t respond in time. Try speaking again.',
            variant: 'destructive',
          });
          transitionToState(ConversationState.LISTENING);
        }
      } else {
        callbacksRef.current?.onError?.(error.message || 'Failed to send message');
        transitionToState(ConversationState.IDLE);
      }

      return { error: error.message };
    } finally {
      setIsWaitingForResponse(false);
    }
    // TD2: deps dropped — `config` + `callbacks` now flow through refs;
    // `addMessage`, `convertToHistoryFormat`, `transitionToState` are
    // stable thanks to their own ref-based useCallback wrappers above.
  }, [addMessage, convertToHistoryFormat, transitionToState]);

  // Helper function to extract meaningful text from malformed JSON
  const extractTextFromMalformedJson = (rawMessage: string): string | null => {
    try {
      // Look for common patterns in malformed AI responses
      const patterns = [
        /"response":\s*"([^"]+)"/,
        /"message":\s*"([^"]+)"/,
        /"text":\s*"([^"]+)"/,
        /"content":\s*"([^"]+)"/
      ];
      
      for (const pattern of patterns) {
        const match = rawMessage.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }
      
      // If no patterns match, try to find any quoted text that looks like a response
      const quotedTextRegex = /"([^"]{20,})"/g;
      const matches = [...rawMessage.matchAll(quotedTextRegex)];
      if (matches.length > 0) {
        // Return the longest quoted string, which is likely the main response
        return matches.reduce((longest, current) => 
          current[1].length > longest.length ? current[1] : longest, ''
        );
      }
      
      return null;
    } catch (e) {
      console.warn('[ConversationOrchestrator] Error extracting text from malformed JSON:', e);
      return null;
    }
  };

  // Enhanced AI response parsing
  const parseAIResponse = (rawAiMessage: string, responseType: string = 'normal') => {
    // Clean newlines and unicode characters from the message
    const cleanedMessage = rawAiMessage
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[–—]/g, '-')
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .trim();

    console.log('[ConversationOrchestrator] Simplified parsing:', {
      originalLength: rawAiMessage.length,
      cleanedLength: cleanedMessage.length,
      type: responseType
    });

    // Handle long text conversion to interactive display
    let finalType = responseType;
    let problemData = null;

    if (responseType === 'normal' && cleanedMessage.length > 400) {
      console.log('[ConversationOrchestrator] Long message detected, converting to interactive');
      finalType = 'interactive';
      problemData = {
        taskType: 'long_text',
        description: cleanedMessage
      };
    } else if (responseType === 'interactive') {
      // For interactive responses, create appropriate problem data
      problemData = {
        taskType: 'interactive_task',
        description: cleanedMessage
      };
    }

    const textForHistory = cleanedMessage;
    const textForSpeech = cleanedMessage;

    console.log('[ConversationOrchestrator] Final parsed response:', {
      textForHistoryLength: textForHistory.length,
      textForSpeechLength: textForSpeech.length,
      responseType: finalType,
      hasTask: !!problemData
    });

    return {
      textForHistory,
      textForSpeech,
      responseType: finalType,
      problemData
    };
  };

  // Conversation flow control
  const startListening = useCallback(() => {
    transitionToState(ConversationState.LISTENING);
  }, [transitionToState]);

  const startCalibration = useCallback(() => {
    transitionToState(ConversationState.CALIBRATING);
  }, [transitionToState]);

  const completeSpeaking = useCallback(() => {
    transitionToState(ConversationState.LISTENING);
  }, [transitionToState]);

  const resetConversation = useCallback(() => {
    setMessages([]);
    setCurrentInteractiveTask(null);
    setIsWaitingForResponse(false);
    transitionToState(ConversationState.IDLE);
  }, [transitionToState]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    // State
    state,
    messages,
    currentInteractiveTask,
    isWaitingForResponse,
    isInteractive: currentInteractiveTask !== null,

    // Actions
    sendMessage,
    addMessage,
    transitionToState,
    startListening,
    startCalibration,
    completeSpeaking,
    resetConversation,
    cleanup,

    // Utilities
    convertToHistoryFormat,
    
    // Configuration
    config
  };
};