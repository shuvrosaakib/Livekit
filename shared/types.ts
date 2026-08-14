export type TutorMode =
  | 'Free Conversation'
  | 'Fluency Coach'
  | 'IELTS Speaking'
  | 'Grammar Coach'
  | 'Vocabulary Builder'
  | 'Role Play';

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface TutorSessionConfig {
  userName: string;
  mode: TutorMode;
  level: CEFRLevel;
  goal: string;
  targetBand: number;
  language?: string;
  voice?: string;
  voiceStyle?: string;
  interactionMode?: 'hands-free' | 'push-to-talk';
  learnerMemory?: string;
  streakDays?: number;
  totalSessions?: number;
  totalMinutes?: number;
  recentFocus?: string[];
}

export interface TokenResponse {
  server_url: string;
  participant_token: string;
  room_name: string;
  expires_in_seconds?: number;
}

export interface TranscriptItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  final: boolean;
  timestamp: number;
}

export interface ProgressState {
  version: 2;
  learner: {
    name: string;
    level: CEFRLevel;
    goal: string;
    targetBand: number;
    streakDays: number;
    lastPracticeDate: string | null;
    totalSessions: number;
    totalMinutes: number;
    totalWords: number;
  };
  skills: {
    fluency: number;
    grammar: number;
    vocabulary: number;
    confidence: number;
    pronunciation: number;
  };
  modeCounts: Record<TutorMode, number>;
  recentFocus: string[];
  lastSummary: string;
  recentSessions: Array<{
    id: string;
    date: string;
    mode: TutorMode;
    level: CEFRLevel;
    minutes: number;
    words: number;
    turns: number;
    summary: string;
  }>;
}
