"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";

export interface CartesiaSpeakerHandle {
  stop: () => string; // Returns partial text spoken before stop
}

interface CartesiaSpeakerProps {
  text: string;
  trigger?: boolean; // MOCKTAGON: Trigger-based activation
  mode?: "first" | "full"; // MOCKTAGON: Speaking modes
  speechRate?: "slow" | "normal" | "fast"; // Speech speed: Cartesia enum values
  voiceAccent?: "indian" | "american"; // Voice accent
  onSpeakingStateChange?: (isSpeaking: boolean) => void;
  onComplete?: () => void; // MOCKTAGON: Completion callback
  onAudioLevel?: (level: number) => void; // Audio level callback (0-1) for reactive animations
  // C2: candidate token required to fetch the Cartesia key from backend.
  // Without it the speaker cannot connect (no fallback to bundled env key).
  candidateToken?: string;
  // P1 R6: surface TTS failures to the parent. Today a WebSocket error
  // calls onComplete (silently), so the interview state machine thinks
  // the agent "finished speaking" successfully. The parent now sees the
  // distinction and can toast the candidate + log to Sentry.
  onError?: (reason: 'missing_api_key' | 'websocket' | 'close_before_audio') => void;
}

const CartesiaSpeaker = forwardRef<CartesiaSpeakerHandle, CartesiaSpeakerProps>(
  ({ text, trigger = false, mode = "full", speechRate = "normal", voiceAccent = "indian", onSpeakingStateChange, onComplete, onAudioLevel, candidateToken, onError }, ref) => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const playbackTimeRef = useRef<number>(0);
    const playingSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const lastSpokenTextRef = useRef<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const currentTextRef = useRef<string>(""); // Track current text being spoken
    const spokenTextRef = useRef<string>(""); // Track what has been spoken so far
    // C2: in-memory cache of the Cartesia key fetched from backend. Lives
    // only for the lifetime of the component (no localStorage).
    const cartesiaKeyRef = useRef<string | null>(null);

    const fetchCartesiaKey = async (): Promise<string | null> => {
      if (cartesiaKeyRef.current) return cartesiaKeyRef.current;
      // Demo mode: marketing demos pass candidateToken='demo'; hit the
      // public rate-limited /api/demo-tokens instead of the gated path.
      if (candidateToken === 'demo') {
        try {
          const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/demo-tokens`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          if (!resp.ok) return null;
          const data = await resp.json();
          cartesiaKeyRef.current = data.cartesia_key || null;
          return cartesiaKeyRef.current;
        } catch {
          return null;
        }
      }
      if (!candidateToken) return null;
      try {
        const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/cartesia-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidate_token: candidateToken }),
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        cartesiaKeyRef.current = data.key || null;
        return cartesiaKeyRef.current;
      } catch {
        return null;
      }
    };

    // Voice ID mapping
    const VOICE_IDS = {
      indian: "f6141af3-5f94-418c-80ed-a45d450e7e2e",  // Priya
      american: "a38e4e85-e815-43ab-acf1-907c4688dd6c"  // Grace
    };

    const voiceId = VOICE_IDS[voiceAccent];

    const pauseDurationMs = 500;

    // Start audio level monitoring
    const startAudioLevelMonitoring = () => {
      if (!analyserRef.current || !onAudioLevel) return;

      const analyser = analyserRef.current;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let logCounter = 0;

      const updateLevel = () => {
        if (!analyserRef.current) {
          onAudioLevel(0);
          return;
        }

        analyser.getByteFrequencyData(dataArray);

        // Calculate RMS of frequency data for more accurate level
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);

        // Normalize to 0-1 range (255 is max byte value)
        const normalizedLevel = Math.min(1, rms / 128);
        onAudioLevel(normalizedLevel);

        // Log every ~30 frames (roughly once per second at 60fps) when there's audio
        logCounter++;
        if (logCounter % 30 === 0 && normalizedLevel > 0.05) {
        }

        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    };

    // Stop audio level monitoring
    const stopAudioLevelMonitoring = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      onAudioLevel?.(0);
    };

    const stopPlayback = () => {
      // Stop audio level monitoring
      stopAudioLevelMonitoring();

      // Close WebSocket FIRST to stop new audio chunks
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      wsRef.current = null;

      // Stop all playing audio sources immediately
      playingSourcesRef.current.forEach(source => {
        try { source.stop(0); source.disconnect(); } catch (e) { /* Ignore errors */ }
      });
      playingSourcesRef.current.clear();

      // Reset AudioContext to clear any buffered audio
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch (e) { /* Ignore errors */ }
        audioCtxRef.current = null;
      }
      analyserRef.current = null;
      gainNodeRef.current = null;

      if (isSpeaking) {
        setIsSpeaking(false);
        onSpeakingStateChange?.(false);
      }

      playbackTimeRef.current = 0;
      lastSpokenTextRef.current = text;

      // Return the partial text that was spoken
      const partialText = spokenTextRef.current.trim();

      // Reset for next use
      spokenTextRef.current = "";
      currentTextRef.current = "";

      return partialText || currentTextRef.current;
    };

    useImperativeHandle(ref, () => ({
      stop: stopPlayback,
    }));

    const splitSentences = (text: string): string[] => {
      const sentenceEndings = /([.?!])\s+/g;
      const sentences: string[] = [];
      let lastIndex = 0;
      text.replace(sentenceEndings, (match, _p1, offset) => {
        sentences.push(text.slice(lastIndex, offset + 1).trim());
        lastIndex = offset + match.length;
        return match;
      });
      if (lastIndex < text.length) {
        sentences.push(text.slice(lastIndex).trim());
      }
      return sentences.filter(Boolean);
    };

    const playPcmChunk = async (chunk: Uint8Array) => {
      if (!audioCtxRef.current) return;
      const audioCtx = audioCtxRef.current;
      if (audioCtx.state === "suspended") await audioCtx.resume();

      const float32 = new Float32Array(chunk.buffer);
      const buffer = audioCtx.createBuffer(1, float32.length, 44100);
      buffer.copyToChannel(float32, 0);

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;

      // Connect through analyser for audio level monitoring
      // source -> gainNode -> analyser -> destination
      if (gainNodeRef.current && analyserRef.current) {
        source.connect(gainNodeRef.current);
      } else {
        source.connect(audioCtx.destination);
      }

      const now = audioCtx.currentTime;
      const nextTime = Math.max(now, playbackTimeRef.current);
      source.start(nextTime);

      playbackTimeRef.current = nextTime + buffer.duration;
      playingSourcesRef.current.add(source);

      source.onended = () => {
        playingSourcesRef.current.delete(source);

        // Track approximate progress through the text (rough estimate based on audio chunks)
        // This is not perfect but gives us a reasonable approximation
        const sentences = splitSentences(currentTextRef.current);
        const approximateProgress = Math.min(
          Math.floor((sentences.length * (1 - playingSourcesRef.current.size / 10))),
          sentences.length
        );

        if (approximateProgress > 0 && approximateProgress <= sentences.length) {
          spokenTextRef.current = sentences.slice(0, approximateProgress).join(" ");
        }

        if (playingSourcesRef.current.size === 0) {
          // All audio finished naturally - mark as fully spoken
          spokenTextRef.current = currentTextRef.current;

          // Stop audio level monitoring
          stopAudioLevelMonitoring();

          setTimeout(() => {
            setIsSpeaking(false);
            onSpeakingStateChange?.(false);
            onComplete?.(); // MOCKTAGON: Trigger completion callback
          }, pauseDurationMs);
        }
      };
    };

    const speakSentences = async (textToSpeak: string) => {
      if (!textToSpeak) return;

      // If already speaking, stop the current audio before starting new one
      if (isSpeaking) {
        stopPlayback();
      }

      setIsSpeaking(true);
      onSpeakingStateChange?.(true);

      // Store the full text being spoken
      currentTextRef.current = textToSpeak;
      spokenTextRef.current = ""; // Reset spoken text tracker

      const sentences = splitSentences(textToSpeak);
      if (sentences.length === 0) {
        setIsSpeaking(false);
        onSpeakingStateChange?.(false);
        onComplete?.(); // MOCKTAGON: Call completion callback even when no sentences
        return;
      }

      const apiKey = await fetchCartesiaKey();
      if (!apiKey) {
        if (import.meta.env.DEV) console.error("[Cartesia] Could not obtain Cartesia key (missing candidateToken or token endpoint rejected).");
        setIsSpeaking(false);
        onSpeakingStateChange?.(false);
        onError?.('missing_api_key');  // P1 R6
        onComplete?.();
        return;
      }

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();

        // Set up audio analysis chain for level monitoring
        // Create gain node and analyser
        const gainNode = audioCtxRef.current.createGain();
        gainNode.gain.value = 1.0;
        gainNodeRef.current = gainNode;

        const analyser = audioCtxRef.current.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.3;
        analyserRef.current = analyser;

        // Connect: gainNode -> analyser -> destination
        gainNode.connect(analyser);
        analyser.connect(audioCtxRef.current.destination);
      }

      // Always restart audio level monitoring when starting to speak
      // (it may have been stopped by previous speech completion)
      if (onAudioLevel && analyserRef.current) {
        // Stop any existing monitoring first to prevent duplicates
        stopAudioLevelMonitoring();
        startAudioLevelMonitoring();
      }

      // Close any existing WebSocket connection before opening a new one
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        wsRef.current.close();
        wsRef.current = null;
      }

      const contextId = `context-${Date.now()}`;
      const wsUrl = `wss://api.cartesia.ai/tts/websocket?api_key=${apiKey}&cartesia_version=2025-04-16`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (ws.readyState !== WebSocket.OPEN) return;
        // MOCKTAGON: Support different speaking modes
        if (mode === "first") {
          // Only speak the first sentence
          const firstSentence = sentences[0];
          const message = {
            model_id: 'sonic-2',
            voice: { mode: 'id', id: voiceId },
            language: 'en',
            context_id: contextId,
            transcript: firstSentence,
            continue: false,
            speed: speechRate, // Control speech speed (Cartesia enum)
            output_format: {
              container: 'raw',
              encoding: 'pcm_f32le',
              sample_rate: 44100,
            },
          };
          ws.send(JSON.stringify(message));
        } else {
          // Full mode: speak all sentences
          sentences.forEach((sentence, index) => {
            const message = {
              model_id: 'sonic-2',
              voice: { mode: 'id', id: voiceId },
              language: 'en',
              context_id: contextId,
              transcript: sentence,
              continue: index !== sentences.length - 1,
              speed: speechRate, // Control speech speed (Cartesia enum)
              output_format: {
                container: 'raw',
                encoding: 'pcm_f32le',
                sample_rate: 44100,
              },
            };
            if (index === 0) console.log('[CartesiaSpeaker] Sending message with speed:', speechRate, message);
            ws.send(JSON.stringify(message));
          });
        }
      };

      ws.onmessage = async (event) => {
        try {
          const dataText = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data);
          const parsed = JSON.parse(dataText);
          if (parsed?.type === 'chunk' && parsed?.data) {
            const decoded = Uint8Array.from(atob(parsed.data), (c) => c.charCodeAt(0));
            playPcmChunk(decoded);
          }
        } catch { /* Not JSON, ignore */ }
      };

      ws.onerror = (err) => {
        if (import.meta.env.DEV) console.error("[Cartesia] WebSocket error:", err);
        setIsSpeaking(false);
        onSpeakingStateChange?.(false);
        onError?.('websocket');  // P1 R6
        onComplete?.();
      };

      ws.onclose = () => {
        // Ensure completion callback is called if WebSocket closes unexpectedly
        if (isSpeaking && playingSourcesRef.current.size === 0) {
          setIsSpeaking(false);
          onSpeakingStateChange?.(false);
          onComplete?.();
        }
      };
    };

    useEffect(() => {

      // MOCKTAGON: Trigger-based activation - only speak when trigger is true or changes
      if (trigger && text && text !== lastSpokenTextRef.current) {
        lastSpokenTextRef.current = text;
        speakSentences(text);
      } else if (!trigger && text && text !== lastSpokenTextRef.current) {
        // Fallback: Auto-speak when trigger is false (backward compatibility)
        lastSpokenTextRef.current = text;
        speakSentences(text);
      } else {
      }
    }, [text, trigger, mode, speechRate]);

    // Cleanup effect to close WebSocket when component unmounts
    useEffect(() => {
      return () => {
        if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
          wsRef.current.close();
          wsRef.current = null;
        }
        // Stop any playing audio sources
        playingSourcesRef.current.forEach(source => {
          try { source.stop(); } catch (e) { /* Ignore errors */ }
        });
        playingSourcesRef.current.clear();
      };
    }, []);

    return <div className="hidden" />;
  }
);

export default CartesiaSpeaker;