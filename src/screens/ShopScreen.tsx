import { useState } from 'react';
import type { PlayerProfile } from '../types';
import { buyPowerUp, getPowerUpCount } from '../services/storage';
import { Button } from '../components/ui/Button';

interface ShopScreenProps {
  profile: PlayerProfile;
  onProfileChange: (updated: PlayerProfile) => void;
  onBack: () => void;
}

const POWER_UPS = [
  {
    type: 'fifty_fifty' as const,
    name: '50/50',
    description: 'Removes two wrong answers',
    price: 500,
  },
  {
    type: 'extra_time' as const,
    name: 'Extra Time',
    description: 'Adds 10 seconds to your timer',
    price: 300,
  },
];

export function ShopScreen({ profile, onProfileChange, onBack }: ShopScreenProps) {
  const [message, setMessage] = useState<string | null>(null);

  const handleBuy = (type: 'fifty_fifty' | 'extra_time', price: number) => {
    const result = buyPowerUp(profile, type, price);
    if (!result) {
      setMessage(`Not enough coins! You need ${price} coins.`);
      setTimeout(() => setMessage(null), 2000);
      return;
    }
    onProfileChange(result);
    const name = type === 'fifty_fifty' ? '50/50' : 'Extra Time';
    setMessage(`Bought ${name}!`);
    setTimeout(() => setMessage(null), 2000);
  };

  return (
    <div className="screen shop" role="main">
      <div className="screen__header">
        <h1>🛒 Shop</h1>
        <p>🪙 {profile.coins} coins</p>
      </div>

      {message && (
        <div className="shop__message" role="alert">
          {message}
        </div>
      )}

      <div className="shop__items">
        {POWER_UPS.map((item) => {
          const owned = getPowerUpCount(profile, item.type);
          const canAfford = profile.coins >= item.price;
          return (
            <div key={item.type} className="shop__card">
              <div className="shop__card-info">
                <h3>{item.name}</h3>
                <p className="shop__desc">{item.description}</p>
                <p className="shop__price">🪙 {item.price}</p>
                <p className="shop__owned">Owned: {owned}</p>
              </div>
              <Button
                onClick={() => handleBuy(item.type, item.price)}
                variant={canAfford ? 'primary' : 'secondary'}
                size="md"
                disabled={!canAfford}
                aria-label={`Buy ${item.name} for ${item.price} coins`}
              >
                {canAfford ? 'Buy' : 'Not enough coins'}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="shop__actions">
        <Button onClick={onBack} variant="ghost" size="md" fullWidth>
          Back
        </Button>
      </div>
    </div>
  );
}