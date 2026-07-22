// ====== Question Types ======
export interface TriviaQuestion {
  id: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  // Shuffled answers for display
  allAnswers: string[];
}

export interface AnswerRecord {
  questionId: string;
  selectedAnswer: string | null;
  isCorrect: boolean;
  timeMs: number;
}

// ====== Game State ======
export type GamePhase = 'idle' | 'countdown' | 'question' | 'reveal' | 'waiting' | 'result';

export interface GameState {
  phase: GamePhase;
  questions: TriviaQuestion[];
  currentIndex: number;
  currentQuestion: TriviaQuestion | null;
  answers: AnswerRecord[];
  lives: number;
  maxLives: number;
  score: number;
  streak: number;
  bestStreak: number;
  timeRemaining: number;
  totalTime: number;
  hasAnswered: boolean;
  selectedAnswer: string | null;
  isCorrect: boolean | null;
}

// ====== Player Profile ======
export interface PlayerCharacter {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  eyes: string;
  accessory: string;
  backgroundColor: string;
}

export interface PlayerProfile {
  nickname: string;
  character: PlayerCharacter;
  coins: number;
  language: 'en' | 'ar';
  stats: PlayerStats;
  lastDailyBonus: string | null; // ISO date string
  playerId: string;
}

export interface PlayerStats {
  totalCorrect: number;
  totalWrong: number;
  bestSurvivalStreak: number;
  gamesPlayed: number;
}

// ====== Power-ups ======
export type PowerUpType = 'fifty_fifty' | 'extra_time';

export interface PowerUp {
  type: PowerUpType;
  name: string;
  description: string;
  price: number;
  count: number;
}

// ====== i18n ======
export type Language = 'en' | 'ar';
