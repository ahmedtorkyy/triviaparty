// ====== Challenge Types ======

export type ChallengeType = 'tap_frenzy' | 'lucky_box' | 'matching_pairs';

export interface ChallengeSlot {
  /** Index into the game's question array where this challenge fires */
  afterQuestionIndex: number;
  type: ChallengeType;
  seed: number;
}

export interface ChallengeResult {
  playerId: string;
  /** Rank from 1..N */
  rank: number;
  /** Points earned (Normal mode) */
  points: number;
  /** Coins earned (both modes) */
  coins: number;
  /** Player's score for this challenge (taps count, boxes banked, pairs matched) */
  score: number;
}

export interface ChallengeStartPayload {
  type: ChallengeType;
  endsAt: number;
  seed: number;
  /** For Matching Pairs: the items to pair */
  items?: string[];
  /** Duration in seconds */
  duration: number;
}

export interface ChallengeRevealPayload {
  type: ChallengeType;
  results: ChallengeResult[];
  /** For Lucky Box: how many coins each player banked */
  luckyBoxCoins?: Record<string, number>;
}

/** Scoring constants */
export const CHALLENGE_PRIZES = [
  { points: 200, coins: 100 },  // 1st
  { points: 100, coins: 50 },   // 2nd
  { points: 50, coins: 25 },    // 3rd
];

/** For 4th and below */
export const CHALLENGE_PARTICIPATION_COINS = 10;

/** Compute challenge count from question count */
export function getChallengeCount(questionCount: number): number {
  if (questionCount < 5) return 0;
  return Math.max(1, Math.floor(questionCount / 5));
}

/** Determine which question indices get a challenge after them */
export function getChallengeSlots(questionCount: number, seed: number): number[] {
  const count = getChallengeCount(questionCount);
  if (count === 0) return [];

  // Available slots: skip first and last question
  const available: number[] = [];
  for (let i = 1; i < questionCount - 1; i++) {
    available.push(i);
  }

  // Deterministic shuffle from seed
  const shuffled = [...available];
  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Take first `count` slots, sorted so challenges are spread
  const selected = shuffled.slice(0, count).sort((a, b) => a - b);

  // Ensure no back-to-back slots
  const result: number[] = [];
  for (const slot of selected) {
    if (result.length === 0 || slot > result[result.length - 1] + 1) {
      result.push(slot);
    }
  }

  return result;
}

/** Pick random challenge types for each slot */
export function pickChallengeTypes(slots: number[], seed: number): ChallengeType[] {
  const types: ChallengeType[] = ['tap_frenzy', 'lucky_box', 'matching_pairs'];
  let s = seed;
  return slots.map(() => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return types[s % types.length];
  });
}

/** Larger pool of items for Matching Pairs */
export const MATCHING_PAIRS_ITEMS = [
  'Pizza', 'Burger', 'Fries', 'Sushi', 'Pasta',
  'Salad', 'Steak', 'Soup', 'Taco', 'Donut',
  'Cake', 'Cookie', 'Apple', 'Banana', 'Grape',
  'Orange', 'Lemon', 'Cherry', 'Mango', 'Peach',
  'Coffee', 'Tea', 'Juice', 'Milk', 'Water',
  'Bread', 'Cheese', 'Eggs', 'Rice', 'Beans',
  'Guitar', 'Piano', 'Drum', 'Flute', 'Violin',
  'Camera', 'Book', 'Phone', 'Clock', 'Lamp',
  'Sun', 'Moon', 'Star', 'Cloud', 'Rain',
  'Fish', 'Bird', 'Cat', 'Dog', 'Horse',
];

/** Pick N pairs for a Matching Pairs game */
export function pickMatchingPairs(seed: number, pairCount: number = 6): string[] {
  const shuffled = [...MATCHING_PAIRS_ITEMS];
  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, pairCount);
}

/** Compute challenge ranking */
export function rankChallengeResults(
  playerScores: { playerId: string; score: number; tiebreaker?: number }[]
): ChallengeResult[] {
  const sorted = [...playerScores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.tiebreaker || 0) - (a.tiebreaker || 0);
  });

  return sorted.map((ps, i) => {
    const prize = i < CHALLENGE_PRIZES.length ? CHALLENGE_PRIZES[i] : { points: 0, coins: CHALLENGE_PARTICIPATION_COINS };
    return {
      playerId: ps.playerId,
      rank: i + 1,
      points: prize.points,
      coins: prize.coins,
      score: ps.score,
    };
  });
}