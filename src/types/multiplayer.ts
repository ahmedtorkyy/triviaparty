// ====== Multiplayer Room Types ======

export type RoomMode = 'normal' | 'survival';
export type QuestionSource = 'categories' | 'voting' | 'ai';
export type QuestionLanguage = 'en' | 'ar';

export interface RoomSettings {
  mode: RoomMode;
  questionLanguage: QuestionLanguage;
  questionSource: QuestionSource;
  questionCount: number;
  timerSeconds: number;
  challengesEnabled: boolean;
}

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  mode: 'normal',
  questionLanguage: 'en',
  questionSource: 'categories',
  questionCount: 10,
  timerSeconds: 15,
  challengesEnabled: true,
};

export const NORMAL_QUESTION_COUNTS = [5, 10, 15, 20];
export const VOTING_QUESTION_COUNTS = [6, 9, 12, 15, 18];
export const TIMER_OPTIONS = [10, 15, 20, 30];

export interface RoomPlayer {
  id: string;
  nickname: string;
  character: PlayerCharacterSnapshot;
  isHost: boolean;
  score: number;
  lives: number;
  isEliminated: boolean;
  hasAnswered: boolean;
}

export interface PlayerCharacterSnapshot {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  eyes: string;
  accessory: string;
  backgroundColor: string;
}

export interface RoomState {
  code: string;
  settings: RoomSettings;
  players: RoomPlayer[];
  gamePhase: MultiplayerGamePhase;
  currentQuestionIndex: number;
  phaseEndTimestamp: number | null;
  seed: string;
  questionIds: string[];
}

export type MultiplayerGamePhase =
  | 'lobby'
  | 'countdown'
  | 'question'
  | 'reveal'
  | 'vote'
  | 'challenge'
  | 'podium'
  | 'waiting_next';

export interface PlayerAnswer {
  playerId: string;
  answer: string | null;
  timeMs: number;
}

/** 
 * Reveal payload — SINGLE source of truth for scores.
 * EVERY client (including host) applies scores from this payload.
 */
export interface RevealResult {
  questionId: string;
  correctAnswer: string;
  /** Count of each answer choice, keyed by answer text */
  answerCounts: Record<string, number>;
  /** Each player's answer for this question */
  playerAnswers: PlayerAnswer[];
  /** Points earned THIS QUESTION by each player (100 base + speed bonus 0–100) */
  pointsEarned: Record<string, number>;
  /** Each player's CUMULATIVE total after this question */
  cumulativeScores: Record<string, number>;
}

/**
 * game_start broadcast payload — carries everything a client needs.
 * No more seed-only start.
 */
export interface GameStartPayload {
  settings: RoomSettings;
  questions: import('../types').TriviaQuestion[];
  /** Timestamp (ms) when countdown ends and first question should appear */
  startAt: number;
}

/**
 * state_snapshot broadcast payload — for reconnecting players.
 */
export interface StateSnapshotPayload {
  currentIndex: number;
  endsAt: number;
  phase: 'question' | 'reveal';
  correctAnswer?: string;
  answerCounts?: Record<string, number>;
  playerAnswers?: PlayerAnswer[];
  pointsEarned?: Record<string, number>;
  cumulativeScores: Record<string, number>;
}

export interface PodiumEntry {
  playerId: string;
  nickname: string;
  score: number;
  rank: number;
  /** Number of correct answers this player got */
  correctCount: number;
}

// Conductor = the player who advances the game (host initially, falls through on disconnect)
export function computeConductorId(players: RoomPlayer[]): string | null {
  if (players.length === 0) return null;
  const host = players.find((p) => p.isHost);
  if (host) return host.id;
  // No host found — alphabetically first player ID
  return [...players].sort((a, b) => a.id.localeCompare(b.id))[0].id;
}
