import { getAllAvatars, getAvatar } from '../data/avatars';
import { unlockAvatar, changeAvatar } from '../services/profileService';
import { Button } from '../components/ui/Button';

interface AvatarShopScreenProps {
  profile: PlayerProfile;
  onProfileChange: (updated: PlayerProfile) => void;
  onBack: () => void;
}

export function AvatarShopScreen({ profile, onProfileChange, onBack }: AvatarShopScreenProps) {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setAvatars(getAllAvatars());
  }, []);

  const handleUnlock = async (avatarId: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const updated = await unlockAvatar(profile.playerId, avatarId);
      if (updated) {
        onProfileChange(updated);
        setMessage(`Unlocked ${getAvatar(avatarId)?.name}!`);
      } else {
        setMessage('Failed to unlock avatar.');
      }
    } catch (err) {
      setMessage('Error unlocking avatar.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (avatarId: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const updated = await changeAvatar(profile.playerId, avatarId);
      if (updated) {
        onProfileChange(updated);
        setMessage(`Selected ${getAvatar(avatarId)?.name}!`);
      } else {
        setMessage('Failed to change avatar.');
      }
    } catch (err) {
      setMessage('Error changing avatar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen avatar-shop" role="main">
      <div className="screen__header">
        <h1>Avatar Shop</h1>
        <p>Coins: {profile.coins}</p>
      </div>

      <div className="avatar-grid" role="list" aria-label="Avatars">
        {avatars.map((avatar) => {
          const isUnlocked = profile.unlockedAvatars.includes(avatar.id);
          const isSelected = profile.currentAvatar === avatar.id;
          return (
            <div key={avatar.id} className="avatar-card" role="listitem">
              <div className="avatar-card__preview" aria-hidden="true">
                <div dangerouslySetInnerHTML={{ __html: avatar.svg }} />
              </div>
              <h3>{avatar.name}</h3>
              <p>{avatar.cost} coins</p>
              {isUnlocked ? (
                <Button
                  onClick={() => handleSelect(avatar.id)}
                  variant={isSelected ? 'primary' : 'ghost'}
                  size="sm"
                  disabled={loading || isSelected}
                >
                  {isSelected ? 'Selected' : 'Select'}
                </Button>
              ) : (
                <Button
                  onClick={() => handleUnlock(avatar.id)}
                  variant="primary"
                  size="sm"
                  disabled={loading || profile.coins < avatar.cost}
                >
                  Unlock
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {message && <div className="avatar-shop__message">{message}</div>}

      <div className="avatar-shop__actions">
        <Button onClick={onBack} variant="ghost" size="md" fullWidth>
          Back
        </Button>
      </div>
    </div>
  );
}