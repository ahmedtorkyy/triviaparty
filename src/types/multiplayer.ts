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

export interface QuestionResult {
  questionId: string;
  correctAnswer: string;
  playerAnswers: PlayerAnswer[];
  pointsMap: Record<string, number>;
}

export interface PodiumEntry {
  playerId: string;
  nickname: string;
  score: number;
  rank: number;
}
