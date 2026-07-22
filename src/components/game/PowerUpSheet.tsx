import { useState } from 'react';
import type { PlayerProfile, PowerUpType } from '../../types';
import { buyPowerUp, consumePowerUp, getPowerUpCount } from '../../services/storage';
import { Button } from '../ui/Button';

interface PowerUpSheetProps {
  profile: PlayerProfile;
  onProfileChange: (updated: PlayerProfile) => void;
  onActivate: (type: PowerUpType) => void;
  onClose: () => void;
  /** Which power-ups were already used this question */
  usedThisQuestion: PowerUpType[];
  /** Extra Time info to show when used */
  extraTimeUsedBy?: string; // playerId who used it
}

const POWER_UPS = [
  {
    type: 'fifty_fifty' as PowerUpType,
    name: '50/50',
    description: 'Removes two wrong answers',
    price: 500,
  },
  {
    type: 'extra_time' as PowerUpType,
    name: 'Extra Time',
    description: 'Adds 10 seconds to your timer',
    price: 300,
  },
];

export function PowerUpSheet({
  profile,
  onProfileChange,
  onActivate,
  onClose,
  usedThisQuestion,
  extraTimeUsedBy,
}: PowerUpSheetProps) {
  const [message, setMessage] = useState<string | null>(null);

  const handleTap = (type: PowerUpType, price: number) => {
    if (usedThisQuestion.includes(type)) {
      setMessage('Already used this question');
      setTimeout(() => setMessage(null), 1500);
      return;
    }

    // Try to use from inventory first
    const used = consumePowerUp(profile, type);
    if (used) {
      onProfileChange(used);
      onActivate(type);
      onClose();
      return;
    }

    // Auto-buy if enough coins
    const bought = buyPowerUp(profile, type, price);
    if (bought) {
      // Now use it
      const used2 = consumePowerUp(bought, type);
      if (used2) {
        onProfileChange(used2);
        onActivate(type);
        onClose();
        return;
      }
    }

    setMessage(`Not enough coins (need ${price})`);
    setTimeout(() => setMessage(null), 2000);
  };

  return (
    <div className="powerup-overlay" role="dialog" aria-label="Power-ups" onClick={onClose}>
      <div className="powerup-sheet" onClick={(e) => e.stopPropagation()} role="document">
        <h2 className="powerup-sheet__title">Power-ups</h2>
        <p className="powerup-sheet__coins">🪙 {profile.coins} coins</p>

        {message && <p className="powerup-sheet__message" role="alert">{message}</p>}
        {extraTimeUsedBy && (
          <p className="powerup-sheet__note" role="status">
            {extraTimeUsedBy} used Extra Time
          </p>
        )}

        <div className="powerup-sheet__items">
          {POWER_UPS.map((item) => {
            const owned = getPowerUpCount(profile, item.type);
            const used = usedThisQuestion.includes(item.type);
            return (
              <button
                key={item.type}
                className="powerup-sheet__item"
                onClick={() => handleTap(item.type, item.price)}
                disabled={used}
                aria-label={`${item.name}: ${item.description}, ${owned} owned, ${item.price} coins`}
              >
                <div className="powerup-sheet__item-info">
                  <span className="powerup-sheet__item-name">{item.name}</span>
                  <span className="powerup-sheet__item-desc">{item.description}</span>
                </div>
                <div className="powerup-sheet__item-right">
                  <span className="powerup-sheet__item-owned">{owned}x</span>
                  <span className="powerup-sheet__item-price">🪙{item.price}</span>
                </div>
              </button>
            );
          })}
        </div>

        <Button onClick={onClose} variant="ghost" size="sm" fullWidth>
          Close
        </Button>
      </div>
    </div>
  );
}