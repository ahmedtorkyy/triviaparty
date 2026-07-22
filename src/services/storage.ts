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
      multiplayerGames: 0,
      coinsEarned: 0,
    },
    lastDailyBonus: null,
    lastChallengeClaim: null,
    unlockedAvatars: ['default'],
    currentAvatar: 'default',
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
    const parsed = JSON.parse(raw);
    return {
      ...createDefaultProfile(),
      ...parsed,
      stats: { ...createDefaultProfile().stats, ...parsed.stats },
      character: { ...DEFAULT_CHARACTER, ...parsed.character },
    };
  } catch {
    return createDefaultProfile();
  }
}

export function saveProfile(profile: PlayerProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function claimDailyBonus(profile: PlayerProfile): { profile: PlayerProfile; claimed: boolean } {
  const now = new Date();
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (profile.lastDailyBonus === localDate) {
    return { profile, claimed: false };
  }
  const updated = {
    ...profile,
    coins: profile.coins + 100,
    lastDailyBonus: localDate,
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
      ...profile.stats,
      totalCorrect: profile.stats.totalCorrect + correct,
      totalWrong: profile.stats.totalWrong + wrong,
      bestSurvivalStreak: Math.max(profile.stats.bestSurvivalStreak, streak),
      gamesPlayed: profile.stats.gamesPlayed + 1,
      coinsEarned: profile.stats.coinsEarned + correct * 50,
    },
    coins: profile.coins + correct * 50, // Solo earns half rate: 50 coins per correct
  };
  saveProfile(updated);
  return updated;
}
