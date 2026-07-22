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
    powerUpInventory: {},
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
    // Migration: old profiles may not have powerUpInventory
    if (!parsed.powerUpInventory) {
      parsed.powerUpInventory = {};
    }
    return parsed as PlayerProfile;
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
      totalCorrect: profile.stats.totalCorrect + correct,
      totalWrong: profile.stats.totalWrong + wrong,
      bestSurvivalStreak: Math.max(profile.stats.bestSurvivalStreak, streak),
      gamesPlayed: profile.stats.gamesPlayed + 1,
    },
    coins: profile.coins + correct * 50, // Solo earns half rate: 50 coins per correct
    powerUpInventory: { ...profile.powerUpInventory },
  };
  saveProfile(updated);
  return updated;
}

/** Buy a power-up, returns new profile or null if insufficient coins */
export function buyPowerUp(profile: PlayerProfile, type: 'fifty_fifty' | 'extra_time', price: number): PlayerProfile | null {
  if (profile.coins < price) return null;
  const inv = { ...profile.powerUpInventory };
  inv[type] = (inv[type] || 0) + 1;
  const updated = { ...profile, coins: profile.coins - price, powerUpInventory: inv };
  saveProfile(updated);
  return updated;
}

/** Use (consume) a power-up, returns new profile or null if none owned */
export function consumePowerUp(profile: PlayerProfile, type: 'fifty_fifty' | 'extra_time'): PlayerProfile | null {
  const inv = { ...profile.powerUpInventory };
  if (!inv[type] || inv[type]! < 1) return null;
  inv[type]! -= 1;
  const updated = { ...profile, powerUpInventory: inv };
  saveProfile(updated);
  return updated;
}

/** Count owned power-ups */
export function getPowerUpCount(profile: PlayerProfile, type: 'fifty_fifty' | 'extra_time'): number {
  return profile.powerUpInventory[type] || 0;
}

/** Award coins for multiplayer correct answer */
export function awardMultiplayerCoins(profile: PlayerProfile, correctCount: number): PlayerProfile {
  const earned = correctCount * 100;
  const updated = { ...profile, coins: profile.coins + earned };
  saveProfile(updated);
  return updated;
}

