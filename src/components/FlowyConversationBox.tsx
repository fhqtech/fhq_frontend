import { useState, useEffect, useRef } from 'react';
import AssemblyAIStreamer from '@/components/interview/AssemblyAIStreamer';
import CartesiaSpeaker, { CartesiaSpeakerHandle } from '@/components/interview/CartesiaSpeaker';
import FlowyVoiceVisualizer from '@/components/FlowyVoiceVisualizer';
import greetingAudio from '@/assets/landing-page-greeting.wav';

// Add slide down animation styles
const slideDownStyles = `
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .animate-slideDown {
    animation: slideDown 0.4s ease-out;
  }
`;

const GREETING_FULL_TEXT = "Hey! I am Flowyy. I take care of the hiring logistics so you can execute the big picture. But right now i am just here for a chat. How are you doing today?";
const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

export default function FlowyConversationBox() {
  const [conversationState, setConversationState] = useState<
    'hidden' | 'pausing' | 'greeting' | 'listening' | 'ai-thinking' | 'ai-speaking'
  >('hidden');

  // Helper to update state and ref together
  const updateConversationState = (newState: typeof conversationState) => {
    conversationStateRef.current = newState;
    setConversationState(newState);
  };

  const [sessionId, setSessionId] = useState<string>('');
  const [transcript, setTranscript] = useState('');
  const [greetingInterrupted, setGreetingInterrupted] = useState(false);
  const [greetingPartialText, setGreetingPartialText] = useState('');
  const [currentAIResponse, setCurrentAIResponse] = useState('');

  const audioRef = useRef<HTMLAudioElement>(null);
  const cartesiaSpeakerRef = useRef<CartesiaSpeakerHandle>(null);
  const assemblyStreamerRef = useRef<AssemblyAIStreamer | null>(null);
  const hasHandledGreetingInterruption = useRef(false);
  const conversationStateRef = useRef<'hidden' | 'pausing' | 'greeting' | 'listening' | 'ai-thinking' | 'ai-speaking'>('hidden');
  const sessionIdRef = useRef<string>('');
  const isFirstMessageRef = useRef(true);

  const handlePourNowClick = async () => {
    // Request microphone permission first (must happen on user gesture for production)
    try {
      console.log('🎤 Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the test stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      console.log('✅ Microphone permission granted');
    } catch (error) {
      console.error('❌ Microphone permission denied:', error);
      alert('Microphone access is required to talk to Flowy. Please allow microphone access and try again.');
      return;
    }

    // Button disappears
    updateConversationState('pausing');

    // Generate session ID
    const newSessionId = `landing-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    setSessionId(newSessionId);
    sessionIdRef.current = newSessionId;

    // Create backend session in background
    createBackendSession(newSessionId);

    // 0.2 second pause, then show visualizer and start greeting
    setTimeout(() => {
      startGreeting();
    }, 200);
  };

  const createBackendSession = async (newSessionId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/landing-agent/session/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: newSessionId })
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      console.log('✅ Session created:', newSessionId);
    } catch (error) {
      console.error('❌ Error creating session:', error);
    }
  };

  const startGreeting = async () => {
    updateConversationState('greeting');
    hasHandledGreetingInterruption.current = false;

    // Start AssemblyAI in background (don't await - parallel)
    startAssemblyAI();

    // Play pre-recorded greeting immediately
    if (audioRef.current) {
      audioRef.current.src = greetingAudio;

      audioRef.current.onended = () => {
        if (!hasHandledGreetingInterruption.current) {
          console.log('✅ Greeting completed without interruption');
          updateConversationState('listening');
        }
      };

      try {
        await audioRef.current.play();
      } catch (error) {
        console.error('❌ Error playing greeting:', error);
        updateConversationState('listening');
      }
    }
  };

  const startAssemblyAI = async () => {
    if (assemblyStreamerRef.current) {
      await assemblyStreamerRef.current.stopStreaming();
    }

    assemblyStreamerRef.current = new AssemblyAIStreamer(
      sessionIdRef.current,
      handleTranscriptUpdate,
      () => {}, // metrics update
      () => console.log('🎤 AssemblyAI connected'),
      (error) => console.error('❌ AssemblyAI error:', error),
      BACKEND_URL,
      undefined,
      'demo', // demo-mode: fetch from /api/demo-tokens (rate-limited)
    );

    await assemblyStreamerRef.current.startStreaming();
  };

  const handleTranscriptUpdate = (text: string, isFinal: boolean) => {
    const currentState = conversationStateRef.current;
    console.log(`[handleTranscriptUpdate] text="${text}", isFinal=${isFinal}, state=${currentState}`);
    setTranscript(text);

    // INTERRUPTION during greeting
    if (currentState === 'greeting' && text.trim().length > 3 && !hasHandledGreetingInterruption.current) {
      console.log('[handleTranscriptUpdate] 🚨 Interrupting greeting');
      interruptGreeting();
    }

    // Handle finalized user message
    if (isFinal && currentState === 'listening') {
      console.log('[handleTranscriptUpdate] ✅ Final transcript in listening state, sending to agent');
      sendMessageToAgent(text);
      setTranscript('');
    } else if (isFinal) {
      console.log(`[handleTranscriptUpdate] ⚠️ Final transcript but wrong state: ${currentState}`);
    }
  };

  const interruptGreeting = () => {
    if (hasHandledGreetingInterruption.current) return;

    hasHandledGreetingInterruption.current = true;
    console.log('[Interruption] User spoke during greeting');

    // Stop audio playback
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      const duration = audioRef.current.duration || 12;
      audioRef.current.pause();

      // Estimate partial greeting text
      const percentage = Math.min(currentTime / duration, 1);
      const estimatedChars = Math.floor(GREETING_FULL_TEXT.length * percentage);
      const partialGreeting = GREETING_FULL_TEXT.substring(0, estimatedChars).trim();

      setGreetingPartialText(partialGreeting);
      setGreetingInterrupted(true);

      console.log(`[Interruption] Partial: "${partialGreeting}"`);
    }

    // Switch to listening
    updateConversationState('listening');
  };

  const sendMessageToAgent = async (userMessage: string) => {
    if (!userMessage.trim()) return;

    updateConversationState('ai-thinking');

    // Build full message with greeting context for first message
    let fullMessage = userMessage;

    if (isFirstMessageRef.current) {
      if (greetingInterrupted && greetingPartialText) {
        fullMessage = `[System Context: I (Flowy) was introducing myself to the user. I said: "${greetingPartialText}" but the user interrupted me to respond. Please continue the conversation naturally from this point, acknowledging their response without repeating the interrupted greeting.]

User: ${userMessage}`;
      } else {
        fullMessage = `[System Context: I (Flowy) just introduced myself with: "${GREETING_FULL_TEXT}" and the user is now responding.]

User: ${userMessage}`;
      }
    }

    console.log('📤 Sending message to agent:', {
      userMessage,
      fullMessage,
      sessionId: sessionIdRef.current,
      isFirstMessage: isFirstMessageRef.current
    });

    // Mark that we've sent the first message
    if (isFirstMessageRef.current) {
      isFirstMessageRef.current = false;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/landing-agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          message: fullMessage
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      let aiResponse = data.response;

      // Filter out JSON analysis block if present
      const jsonBlockRegex = /```json[\s\S]*?```/g;
      if (jsonBlockRegex.test(aiResponse)) {
        console.log('🔍 Detected analysis block, filtering out...');
        aiResponse = aiResponse.replace(jsonBlockRegex, '').trim();
      }

      console.log('✅ AI response (cleaned):', aiResponse);

      setCurrentAIResponse(aiResponse);
      updateConversationState('ai-speaking');

    } catch (error) {
      console.error('❌ Error sending message:', error);
      updateConversationState('listening');
    }
  };

  const handleAISpeakingComplete = () => {
    console.log('✅ AI finished speaking');
    updateConversationState('listening');
    setCurrentAIResponse('');
  };

  const handleEndConversation = async () => {
    console.log('🛑 Ending conversation');

    // Stop audio playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Stop Cartesia speaker
    if (cartesiaSpeakerRef.current) {
      cartesiaSpeakerRef.current.stop();
    }

    // Stop AssemblyAI
    if (assemblyStreamerRef.current) {
      await assemblyStreamerRef.current.stopStreaming();
    }

    // End backend session
    if (sessionIdRef.current) {
      try {
        await fetch(`${BACKEND_URL}/api/landing-agent/session/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionIdRef.current })
        });
      } catch (error) {
        console.error('Error ending session:', error);
      }
    }

    // Reset all state
    updateConversationState('hidden');
    setTranscript('');
    setGreetingInterrupted(false);
    setGreetingPartialText('');
    setCurrentAIResponse('');
    setSessionId('');
    sessionIdRef.current = '';
    isFirstMessageRef.current = true;
    hasHandledGreetingInterruption.current = false;
    assemblyStreamerRef.current = null;
  };

  // Get status text
  const getStatusText = () => {
    switch (conversationState) {
      case 'greeting':
        return 'Flowy is introducing herself...';
      case 'listening':
        return 'Listening... Your turn to speak';
      case 'ai-thinking':
        return 'Flowy is thinking...';
      case 'ai-speaking':
        return 'Flowy is speaking...';
      default:
        return '';
    }
  };

  return (
    <div className="relative w-full max-w-xl min-h-[80px]">
      {/* Inject animation styles */}
      <style>{slideDownStyles}</style>

      {/* Pour Now Button - Hidden State */}
      {conversationState === 'hidden' && (
        <button
          onClick={handlePourNowClick}
          className="mt-8 flex items-center gap-3 border-2 border-white/30 hover:border-white/50 bg-transparent text-white px-6 py-3 rounded hover:bg-white/10 transition-all"
        >
          <span className="font-normal tracking-wider">Pour Now</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#FDE68A" viewBox="0 0 256 256">
            <path d="M208,80H32a8,8,0,0,0-8,8v48a96.3,96.3,0,0,0,32.54,72H32a8,8,0,0,0,0,16H208a8,8,0,0,0,0-16H183.46a96.59,96.59,0,0,0,27-40.09A40,40,0,0,0,248,128v-8A40,40,0,0,0,208,80Zm24,48a24,24,0,0,1-17.2,23,95.78,95.78,0,0,0,1.2-15V97.38A24,24,0,0,1,232,120ZM112,56V24a8,8,0,0,1,16,0V56a8,8,0,0,1-16,0Zm32,0V24a8,8,0,0,1,16,0V56a8,8,0,0,1-16,0ZM80,56V24a8,8,0,0,1,16,0V56a8,8,0,0,1-16,0Z"></path>
          </svg>
        </button>
      )}

      {/* Voice Visualizer - Active States - slides down */}
      {conversationState !== 'hidden' && conversationState !== 'pausing' && (
        <div className="mt-4 space-y-3 animate-slideDown">
          <div className="flex items-center gap-6">
            <FlowyVoiceVisualizer
              isAISpeaking={conversationState === 'greeting' || conversationState === 'ai-speaking'}
              isUserSpeaking={conversationState === 'listening' && transcript.length > 0}
            />

            {/* Status Text - moved to right of visualizer */}
            <div className="text-left text-sm font-medium whitespace-nowrap" style={{ color: 'rgba(248, 113, 251, 0.9)' }}>
              {getStatusText()}
            </div>
          </div>

          {/* End Conversation Button */}
          <div className="mt-4 flex justify-start">
            <button
              onClick={handleEndConversation}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-red-400/50 text-red-400 rounded hover:bg-red-400/10 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
                <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path>
              </svg>
              End Conversation
            </button>
          </div>
        </div>
      )}

      {/* Hidden Audio Player */}
      <audio ref={audioRef} />

      {/* Cartesia Speaker */}
      {currentAIResponse && (
        <CartesiaSpeaker
          ref={cartesiaSpeakerRef}
          text={currentAIResponse}
          trigger={conversationState === 'ai-speaking'}
          speechRate="slow"
          voiceAccent="indian"
          candidateToken="demo"
          onSpeakingStateChange={(speaking) => {
            if (!speaking && conversationState === 'ai-speaking') {
              handleAISpeakingComplete();
            }
          }}
        />
      )}
    </div>
  );
}

