// ====== Daily Challenges ======

import type { PlayerProfile } from '../types';

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

// Daily challenges
export const challenges: Challenge[] = [
  {
    id: 'daily_correct_5',
    description: 'Answer 5 questions correctly',
    reward: 200,
    predicate: (_, gameStats) => (gameStats?.correctCount || 0) >= 5,
  },
  {
    id: 'daily_multiplayer_2',
    description: 'Play 2 multiplayer games',
    reward: 300,
    predicate: (profile) => (profile.stats.multiplayerGames || 0) >= 2,
  },
  {
    id: 'daily_streak_3',
    description: 'Get a 3-question streak',
    reward: 500,
    predicate: (_, gameStats) => (gameStats?.streak || 0) >= 3,
  },
];

/** Get active challenges (UTC date-based) */
export function getActiveChallenges(): Challenge[] {
  // In a real app, this would rotate daily
  return challenges;
}

/** Check if challenges were already claimed today */
export function isChallengeClaimedToday(profile: PlayerProfile): boolean {
  if (!profile.lastChallengeClaim) return false;
  const lastClaim = new Date(profile.lastChallengeClaim);
  const today = new Date();
  return (
    lastClaim.getUTCDate() === today.getUTCDate() &&
    lastClaim.getUTCMonth() === today.getUTCMonth() &&
    lastClaim.getUTCFullYear() === today.getUTCFullYear()
  );
}

/** Claim challenges and update profile */
export function claimChallenges(
  profile: PlayerProfile,
  gameStats?: {
    correctCount: number;
    wrongCount: number;
    streak: number;
    gameType: 'solo' | 'multiplayer';
  }
): { profile: PlayerProfile; coinsEarned: number } {
  const active = getActiveChallenges();
  let coinsEarned = 0;

  const updated = { ...profile };
  for (const challenge of active) {
    if (challenge.predicate(updated, gameStats)) {
      coinsEarned += challenge.reward;
    }
  }

  updated.coins += coinsEarned;
  updated.stats.coinsEarned += coinsEarned;
  updated.lastChallengeClaim = new Date().toISOString();

  return { profile: updated, coinsEarned };
}