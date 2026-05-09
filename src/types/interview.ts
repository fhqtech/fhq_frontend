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

export interface AudioDevice {
  deviceId: string;
  label: string;
}

export interface InterviewSessionData {
  sessionId: string;
  interviewId: string;
  candidateId: string;
  startedAt: string;
  endedAt?: string;
  duration: number;
  conversationHistory: HistoryItem[];
  audioMetrics?: {
    averageLevel: number;
    silenceDuration: number;
    totalSpeechTime: number;
  };
  status: 'active' | 'completed' | 'cancelled' | 'error';
}

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

export interface ApiEndpoints {
  llmBackendUrl: string;
  websocketUrl: string;
}