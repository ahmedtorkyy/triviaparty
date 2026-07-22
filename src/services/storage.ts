import type { PlayerProfile, PlayerCharacter } from '../types';

const STORAGE_KEY = 'triviaparty_profile';

function generatePlayerId(): string {
  return 'tp_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

export const DEFAULT_CHARACTER: PlayerCharacter = {
  skinTone: '#8D5524',
  hairStyle: 'short',
  hairColor: '#2c1b0e',
  eyes: 'round',
  accessory: 'none',
  backgroundColor: '#7C5CFF',
};

export function createDefaultProfile(): PlayerProfile {
  return {
    nickname: 'Player',
    character: { ...DEFAULT_CHARACTER },
    coins: 500,
    language: 'en',
    stats: {
      totalCorrect: 0,
      totalWrong: 0,
      bestSurvivalStreak: 0,
      gamesPlayed: 0,
    },
    lastDailyBonus: null,
    playerId: generatePlayerId(),
  };
}

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const profile = createDefaultProfile();
      saveProfile(profile);
      return profile;
    }
    return JSON.parse(raw) as PlayerProfile;
  } catch {
    return createDefaultProfile();
  }
}

export function saveProfile(profile: PlayerProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function claimDailyBonus(profile: PlayerProfile): { profile: PlayerProfile; claimed: boolean } {
  const today = new Date().toISOString().split('T')[0];
  if (profile.lastDailyBonus === today) {
    return { profile, claimed: false };
  }
  const updated = {
    ...profile,
    coins: profile.coins + 100,
    lastDailyBonus: today,
  };
  saveProfile(updated);
  return { profile: updated, claimed: true };
}

export function updateStats(
  profile: PlayerProfile,
  correct: number,
  wrong: number,
  streak: number
): PlayerProfile {
  const updated: PlayerProfile = {
    ...profile,
    stats: {
      totalCorrect: profile.stats.totalCorrect + correct,
      totalWrong: profile.stats.totalWrong + wrong,
      bestSurvivalStreak: Math.max(profile.stats.bestSurvivalStreak, streak),
      gamesPlayed: profile.stats.gamesPlayed + 1,
    },
    coins: profile.coins + correct * 50, // Solo earns half rate: 50 coins per correct
  };
  saveProfile(updated);
  return updated;
}
