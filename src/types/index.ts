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

/** Snapshot of a player's character for rendering */
export interface PlayerCharacterSnapshot {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  backgroundColor: string;
}

/** Avatar definition */
export interface Avatar {
  id: string;
  name: string;
  cost: number;
  svg: string; // SVG string or path
  preview: string; // Preview image path
}

export interface Challenge {
  id: string;
  description: string;
  reward: number;
  predicate: (profile: PlayerProfile, gameStats?: {
    correctCount: number;
    wrongCount: number;
    streak: number;
    gameType: 'solo' | 'multiplayer';
  }) => boolean;
}

export interface LeaderboardEntry {
  playerId: string;
  nickname: string;
  coins: number;
  correctAnswers: number;
  gamesPlayed: number;
  rank: number;
}

export interface PlayerStats {
  totalCorrect: number;
  totalWrong: number;
  bestSurvivalStreak: number;
  gamesPlayed: number;
  multiplayerGames: number;
  coinsEarned: number;
}

export interface PlayerProfile {
  nickname: string;
  character: PlayerCharacter;
  coins: number;
  language: 'en' | 'ar';
  stats: PlayerStats;
  lastDailyBonus: string | null; // ISO date string
  lastChallengeClaim: string | null; // ISO date string (UTC)
  unlockedAvatars: string[]; // Avatar IDs
  currentAvatar: string; // Avatar ID
  playerId: string;
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
