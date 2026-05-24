// Interview-related types and interfaces

export interface HistoryItem {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export enum ConversationState {
  IDLE = 'idle',
  CALIBRATING = 'calibrating',
  LISTENING = 'listening',
  THINKING = 'thinking',
  SPEAKING = 'speaking'
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface InterviewConfig {
  title: string;
  description: string;
  duration: number; // in minutes
  type: string;
  instructions?: string[];
  systemPrompt?: string;
}

export interface CandidateData {
  id: string;
  name: string;
  email: string;
  registeredAt?: string;
}

// C2 (2026-05-24): removed AudioDevice (only used by v1 InterviewSession
// device-picker, deleted), InterviewSessionData (defined-but-never-imported),
// and ApiEndpoints (v1 client-side TTS/STT URLs, no callers).