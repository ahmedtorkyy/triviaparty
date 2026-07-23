import { useEffect, useState } from 'react';
import type { PlayerProfile } from '../types';
import { claimDailyBonus } from '../services/storage';
import { isSupabaseConfigured } from '../services/supabase';
import { Button } from '../components/ui/Button';
import { AdSlot } from '../components/ui/AdSlot';

interface HomeScreenProps {
  profile: PlayerProfile;
  onProfileChange: (profile: PlayerProfile) => void;
  onPlaySolo: () => void;
  onShowCharacterMaker: () => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onShowShop: () => void;
  onShowProfile: () => void;
}

export function HomeScreen({
  profile,
  onProfileChange,
  onPlaySolo,
  onShowCharacterMaker,
  onCreateRoom,
  onJoinRoom,
  onShowShop,
  onShowProfile,
}: HomeScreenProps) {
  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [supabaseOk] = useState(() => isSupabaseConfigured());

  useEffect(() => {
    const { profile: updated, claimed } = claimDailyBonus(profile);
    if (claimed) {
      onProfileChange(updated);
      setDailyClaimed(true);
      const timer = setTimeout(() => setDailyClaimed(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [profile, onProfileChange]);

  return (
    <div className="screen home">
      {/* Daily bonus toast */}
      {dailyClaimed && (
        <div className="home__daily-bonus" role="alert" aria-live="polite">
          🎁 Daily Bonus: +100 coins!
        </div>
      )}

      {/* Logo / Title */}
      <div className="home__header">
        <svg className="home__logo" viewBox="0 0 60 60" width={60} height={60} aria-hidden="true">
          <circle cx="30" cy="30" r="28" fill="#7C5CFF" />
          <text x="30" y="36" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold" fontFamily="Outfit, sans-serif">T</text>
        </svg>
        <h1 className="home__title">TriviaParty</h1>
      </div>

      {/* Player info */}
      <div className="home__player">
        <button className="home__avatar" onClick={onShowCharacterMaker} aria-label="Edit character">
          <svg viewBox="0 0 120 160" width={48} height={64} aria-hidden="true">
            <circle cx="60" cy="60" r="58" fill={profile.character.backgroundColor} />
            <ellipse cx="60" cy="55" rx="28" ry="30" fill={profile.character.skinTone} />
            {profile.character.hairStyle !== 'bald' && (
              <path d="M32,50 Q32,20 60,18 Q88,20 88,50 Q90,38 80,34 Q70,30 60,30 Q50,30 40,34 Q30,38 32,50Z" fill={profile.character.hairColor} />
            )}
            {profile.character.eyes === 'sunglasses' ? (
              <>
                <rect x="38" y="44" width="16" height="8" rx="2" fill="#222" />
                <rect x="66" y="44" width="16" height="8" rx="2" fill="#222" />
              </>
            ) : profile.character.eyes !== 'none' ? (
              <>
                <circle cx="48" cy="52" r="3" fill="white" /><circle cx="72" cy="52" r="3" fill="white" />
                <circle cx="48" cy="52" r="1.5" fill="#222" /><circle cx="72" cy="52" r="1.5" fill="#222" />
              </>
            ) : null}
            <path d="M48,64 Q60,74 72,64" fill="none" stroke="#222" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <span className="home__nickname">{profile.nickname}</span>
        <span className="home__coins" aria-label={`${profile.coins} coins`}>🪙 {profile.coins}</span>
      </div>

      {/* Main actions */}
      <div className="home__actions">
        <Button onClick={onPlaySolo} variant="primary" size="lg" fullWidth>
          🎯 Play Solo
        </Button>

        {!supabaseOk && (
          <div className="home__warning" role="alert">
            Multiplayer unavailable — server not configured
          </div>
        )}

        <Button onClick={onCreateRoom} variant="secondary" size="lg" fullWidth disabled={!supabaseOk}>
          🏠 Create Room
        </Button>

        <Button onClick={onJoinRoom} variant="secondary" size="lg" fullWidth disabled={!supabaseOk}>
          🔑 Join Room
        </Button>

        <Button onClick={onShowShop} variant="ghost" size="md" fullWidth>
          🛒 Shop
        </Button>

        <Button onClick={onShowProfile} variant="ghost" size="md" fullWidth>
          👤 Profile
        </Button>
      </div>

      {/* Ad Slot (reserved, hidden when adsEnabled=false) */}
      <AdSlot id="home" size="banner" />
    </div>
  );
}