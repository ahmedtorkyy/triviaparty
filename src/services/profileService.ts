// ====== Profile Service ======

import { supabase } from './supabase';
import type { PlayerProfile } from '../types';

/** Get player profile */
export async function getProfile(playerId: string): Promise<PlayerProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', playerId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Failed to fetch profile:', error);
    return null;
  }

  return {
    nickname: data.nickname,
    character: data.character,
    coins: data.coins,
    language: data.language,
    stats: data.stats,
    lastDailyBonus: data.lastDailyBonus,
    lastChallengeClaim: data.lastChallengeClaim,
    unlockedAvatars: data.unlockedAvatars,
    currentAvatar: data.currentAvatar,
    playerId: data.id,
  };
}

/** Create or update player profile */
export async function updateProfile(profile: PlayerProfile): Promise<PlayerProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: profile.playerId,
      nickname: profile.nickname,
      character: profile.character,
      coins: profile.coins,
      language: profile.language,
      stats: profile.stats,
      lastDailyBonus: profile.lastDailyBonus,
      lastChallengeClaim: profile.lastChallengeClaim,
      unlockedAvatars: profile.unlockedAvatars,
      currentAvatar: profile.currentAvatar,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to update profile:', error);
    return profile; // Return input on error
  }

  return {
    nickname: data.nickname,
    character: data.character,
    coins: data.coins,
    language: data.language,
    stats: data.stats,
    lastDailyBonus: data.lastDailyBonus,
    lastChallengeClaim: data.lastChallengeClaim,
    unlockedAvatars: data.unlockedAvatars,
    currentAvatar: data.currentAvatar,
    playerId: data.id,
  };
}

/** Unlock an avatar */
export async function unlockAvatar(playerId: string, avatarId: string): Promise<PlayerProfile | null> {
  const profile = await getProfile(playerId);
  if (!profile) return null;

  const { getAvatar } = await import('../data/avatars');
  const avatar = getAvatar(avatarId);
  if (!avatar || profile.unlockedAvatars.includes(avatarId)) return profile;

  if (profile.coins < avatar.cost) return profile;

  const updated = { ...profile };
  updated.coins -= avatar.cost;
  updated.unlockedAvatars = [...updated.unlockedAvatars, avatarId];
  if (updated.currentAvatar === 'default') {
    updated.currentAvatar = avatarId;
  }

  return updateProfile(updated);
}

/** Change current avatar */
export async function changeAvatar(playerId: string, avatarId: string): Promise<PlayerProfile | null> {
  const profile = await getProfile(playerId);
  if (!profile) return null;

  if (!profile.unlockedAvatars.includes(avatarId)) return profile;

  const updated = { ...profile };
  updated.currentAvatar = avatarId;

  return updateProfile(updated);
}