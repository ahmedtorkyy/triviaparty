import type { PlayerProfile } from '../types';
import { Button } from '../components/ui/Button';

interface ProfileScreenProps {
  profile: PlayerProfile;
  onBack: () => void;
}

export function ProfileScreen({ profile, onBack }: ProfileScreenProps) {
  const c = profile.character;

  return (
    <div className="screen profile" role="main">
      <div className="screen__header">
        <h1>Profile</h1>
        <p>Your stats</p>
      </div>

      <div className="profile__card">
        <div className="profile__avatar" aria-hidden="true">
          <svg viewBox="0 0 120 160" width={80} height={106}>
            <circle cx="60" cy="60" r="58" fill={c.backgroundColor} />
            <ellipse cx="60" cy="55" rx="28" ry="30" fill={c.skinTone} />
            {c.hairStyle !== 'bald' && (
              <path d="M32,50 Q32,20 60,18 Q88,20 88,50" fill={c.hairColor} />
            )}
            <circle cx="48" cy="52" r="3" fill="white" />
            <circle cx="72" cy="52" r="3" fill="white" />
            <circle cx="48" cy="52" r="1.5" fill="#222" />
            <circle cx="72" cy="52" r="1.5" fill="#222" />
            <path d="M48,64 Q60,74 72,64" fill="none" stroke="#222" strokeWidth="2" />
          </svg>
        </div>

        <h2 className="profile__name">{profile.nickname}</h2>
        <p className="profile__coins">🪙 {profile.coins} coins</p>
      </div>

      <div className="profile__stats">
        <h3>Lifetime Stats</h3>
        <div className="profile__stat-row">
          <span>Total Correct</span>
          <span className="profile__stat-value">{profile.stats.totalCorrect}</span>
        </div>
        <div className="profile__stat-row">
          <span>Total Wrong</span>
          <span className="profile__stat-value">{profile.stats.totalWrong}</span>
        </div>
        <div className="profile__stat-row">
          <span>Best Survival Streak</span>
          <span className="profile__stat-value">{profile.stats.bestSurvivalStreak}</span>
        </div>
        <div className="profile__stat-row">
          <span>Games Played</span>
          <span className="profile__stat-value">{profile.stats.gamesPlayed}</span>
        </div>
      </div>

      <div className="profile__inventory">
        <h3>Power-ups Owned</h3>
        <div className="profile__stat-row">
          <span>50/50</span>
          <span className="profile__stat-value">{profile.powerUpInventory.fifty_fifty || 0}</span>
        </div>
        <div className="profile__stat-row">
          <span>Extra Time</span>
          <span className="profile__stat-value">{profile.powerUpInventory.extra_time || 0}</span>
        </div>
      </div>

      <div className="profile__actions">
        <Button onClick={onBack} variant="secondary" size="md" fullWidth>
          Back to Home
        </Button>
      </div>
    </div>
  );
}